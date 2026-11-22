-- CreateEnum
CREATE TYPE "CourseAllocationType" AS ENUM ('REGULAR', 'RETAKE');

-- =====================================================
-- PHASE 1: ADD (naye columns nullable)
-- =====================================================
ALTER TABLE "batch_course_assignments" ADD COLUMN "semester_id" UUID;

ALTER TABLE "course_allocations"
  ADD COLUMN "batch_course_assignment_id" UUID,
  ADD COLUMN "type" "CourseAllocationType" NOT NULL DEFAULT 'REGULAR';

ALTER TABLE "course_enrollments"
  ADD COLUMN "attempt_number" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "student_marks" ADD COLUMN "course_enrollment_id" UUID;

-- =====================================================
-- PHASE 2: BACKFILL (purane columns abhi maujood hain)
-- =====================================================

-- 1. curriculum -> semester
UPDATE "batch_course_assignments" bca
SET "semester_id" = s."id"
FROM "semesters" s
WHERE s."number" = bca."semester_number";

-- 2. allocation -> curriculum row (purani sab allocations REGULAR hain)
UPDATE "course_allocations" ca
SET "batch_course_assignment_id" = bca."id"
FROM "sections" sec, "batch_course_assignments" bca
WHERE sec."id" = ca."section_id"
  AND bca."batch_id" = sec."batch_id"
  AND bca."course_id" = ca."course_id"
  AND bca."semester_number" = ca."semester_number";

-- 3. jin enrollments ka allocation_id NULL tha
UPDATE "course_enrollments" ce
SET "allocation_id" = ca."id"
FROM "student_academic_records" sar, "course_allocations" ca
WHERE ce."allocation_id" IS NULL
  AND sar."id" = ce."student_academic_record_id"
  AND ca."course_id" = ce."course_id"
  AND ca."section_id" = sar."section_id"
  AND ca."academic_session_id" = sar."academic_session_id";

-- 4. attempt number (student ne same course kitni dafa liya)
WITH ranked AS (
  SELECT ce."id",
         ROW_NUMBER() OVER (
           PARTITION BY sar."student_id", ce."course_id"
           ORDER BY asn."start_date", ce."enrolled_at"
         ) AS rn
  FROM "course_enrollments" ce
  JOIN "student_academic_records" sar ON sar."id" = ce."student_academic_record_id"
  JOIN "academic_sessions" asn ON asn."id" = sar."academic_session_id"
)
UPDATE "course_enrollments" ce
SET "attempt_number" = r.rn
FROM ranked r
WHERE r."id" = ce."id";

-- 5. marks: student -> us allocation ki enrollment
UPDATE "student_marks" sm
SET "course_enrollment_id" = ce."id"
FROM "assessments" a, "student_academic_records" sar, "course_enrollments" ce
WHERE a."id" = sm."assessment_id"
  AND sar."student_id" = sm."student_id"
  AND ce."student_academic_record_id" = sar."id"
  AND ce."allocation_id" = a."course_allocation_id";

-- =====================================================
-- PHASE 3: VERIFY (kuch adhoora ho to poora migration abort)
-- =====================================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "batch_course_assignments" WHERE "semester_id" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incomplete: batch_course_assignments.semester_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "course_allocations" WHERE "batch_course_assignment_id" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incomplete: course_allocations.batch_course_assignment_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "course_enrollments" WHERE "allocation_id" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incomplete: course_enrollments.allocation_id';
  END IF;
  IF EXISTS (SELECT 1 FROM "student_marks" WHERE "course_enrollment_id" IS NULL) THEN
    RAISE EXCEPTION 'Backfill incomplete: student_marks.course_enrollment_id';
  END IF;
END $$;

-- =====================================================
-- PHASE 4: TIGHTEN
-- =====================================================
ALTER TABLE "batch_course_assignments" ALTER COLUMN "semester_id" SET NOT NULL;
ALTER TABLE "course_allocations" ALTER COLUMN "batch_course_assignment_id" SET NOT NULL;
ALTER TABLE "course_enrollments" ALTER COLUMN "allocation_id" SET NOT NULL;
ALTER TABLE "student_marks" ALTER COLUMN "course_enrollment_id" SET NOT NULL;

-- =====================================================
-- PHASE 5: DROP (purani FKs, indexes, columns, table)
-- =====================================================
ALTER TABLE "course_allocations" DROP CONSTRAINT IF EXISTS "course_allocations_course_id_fkey";
ALTER TABLE "course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_allocation_id_fkey";
ALTER TABLE "course_enrollments" DROP CONSTRAINT IF EXISTS "course_enrollments_course_id_fkey";
ALTER TABLE "student_academic_records" DROP CONSTRAINT IF EXISTS "student_academic_records_batch_id_fkey";
ALTER TABLE "student_course_results" DROP CONSTRAINT IF EXISTS "student_course_results_academic_session_id_fkey";
ALTER TABLE "student_course_results" DROP CONSTRAINT IF EXISTS "student_course_results_course_id_fkey";
ALTER TABLE "student_course_results" DROP CONSTRAINT IF EXISTS "student_course_results_student_id_fkey";
ALTER TABLE "student_marks" DROP CONSTRAINT IF EXISTS "student_marks_student_id_fkey";

-- ye unique constraint ke taur par bana tha, isliye pehle DROP CONSTRAINT
ALTER TABLE "batch_course_assignments"
  DROP CONSTRAINT IF EXISTS "batch_course_assignments_batch_id_semester_number_course_id_key";
DROP INDEX IF EXISTS "batch_course_assignments_batch_id_semester_number_course_id_key";
DROP INDEX IF EXISTS "idx_batch_semester";
DROP INDEX IF EXISTS "course_allocations_course_id_faculty_id_section_id_academic_key";
DROP INDEX IF EXISTS "idx_section_semester_number";
DROP INDEX IF EXISTS "course_enrollments_student_academic_record_id_course_id_key";
DROP INDEX IF EXISTS "student_academic_records_batch_id_section_id_idx";
DROP INDEX IF EXISTS "student_course_results_student_id_course_enrollment_id_key";
DROP INDEX IF EXISTS "student_marks_assessment_id_student_id_key";

ALTER TABLE "batch_course_assignments"
  DROP COLUMN "semester_number",
  ALTER COLUMN "id" DROP DEFAULT;

ALTER TABLE "course_allocations"
  DROP COLUMN "course_id",
  DROP COLUMN "semester_number";

ALTER TABLE "course_enrollments" DROP COLUMN "course_id";

ALTER TABLE "student_academic_records"
  DROP COLUMN "batch_id",
  DROP COLUMN "semester_number";

ALTER TABLE "student_course_results"
  DROP COLUMN "academic_session_id",
  DROP COLUMN "course_id",
  DROP COLUMN "is_reappear",
  DROP COLUMN "student_id";

ALTER TABLE "student_marks" DROP COLUMN "student_id";

ALTER TABLE "semesters"
  DROP COLUMN "display_name",
  DROP COLUMN "name",
  ALTER COLUMN "updated_at" DROP NOT NULL;

ALTER TABLE "batches" ALTER COLUMN "updated_at" DROP NOT NULL;
ALTER TABLE "sections" ALTER COLUMN "updated_at" DROP NOT NULL;

DROP TABLE "semester_courses";

-- =====================================================
-- PHASE 6: naye indexes aur foreign keys
-- =====================================================
CREATE INDEX "idx_batch_semester" ON "batch_course_assignments"("batch_id", "semester_id");
CREATE UNIQUE INDEX "batch_course_assignments_batch_id_semester_id_course_id_key"
  ON "batch_course_assignments"("batch_id", "semester_id", "course_id");

CREATE INDEX "idx_allocation_section" ON "course_allocations"("section_id");
CREATE UNIQUE INDEX "course_allocations_batch_course_assignment_id_section_id_ac_key"
  ON "course_allocations"("batch_course_assignment_id", "section_id", "academic_session_id", "type");

CREATE UNIQUE INDEX "course_enrollments_student_academic_record_id_allocation_id_key"
  ON "course_enrollments"("student_academic_record_id", "allocation_id");

CREATE UNIQUE INDEX "student_course_results_course_enrollment_id_key"
  ON "student_course_results"("course_enrollment_id");

CREATE INDEX "student_marks_course_enrollment_id_idx" ON "student_marks"("course_enrollment_id");
CREATE UNIQUE INDEX "student_marks_assessment_id_course_enrollment_id_key"
  ON "student_marks"("assessment_id", "course_enrollment_id");

ALTER TABLE "student_marks"
  ADD CONSTRAINT "student_marks_course_enrollment_id_fkey"
  FOREIGN KEY ("course_enrollment_id") REFERENCES "course_enrollments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "batch_course_assignments"
  ADD CONSTRAINT "batch_course_assignments_semester_id_fkey"
  FOREIGN KEY ("semester_id") REFERENCES "semesters"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_allocations"
  ADD CONSTRAINT "course_allocations_batch_course_assignment_id_fkey"
  FOREIGN KEY ("batch_course_assignment_id") REFERENCES "batch_course_assignments"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "course_enrollments"
  ADD CONSTRAINT "course_enrollments_allocation_id_fkey"
  FOREIGN KEY ("allocation_id") REFERENCES "course_allocations"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;