BEGIN;

CREATE TYPE "CourseAllocationStatus" AS ENUM ('active', 'inactive');
CREATE TYPE "CourseEnrollmentStatus" AS ENUM (
  'enrolled',
  'dropped',
  'completed',
  'failed',
  'reappear'
);

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM "course_allocations"
    WHERE "status" NOT IN ('active', 'inactive')
  ) THEN
    RAISE EXCEPTION 'Unexpected course_allocations.status value; normalize it before applying this migration';
  END IF;

  IF EXISTS (
    SELECT 1 FROM "course_enrollments"
    WHERE "status" NOT IN ('enrolled', 'dropped', 'completed', 'failed', 'reappear')
  ) THEN
    RAISE EXCEPTION 'Unexpected course_enrollments.status value; normalize it before applying this migration';
  END IF;
END $$;

ALTER TABLE "course_allocations"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CourseAllocationStatus"
    USING "status"::text::"CourseAllocationStatus",
  ALTER COLUMN "status" SET DEFAULT 'active';

ALTER TABLE "course_enrollments"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "CourseEnrollmentStatus"
    USING "status"::text::"CourseEnrollmentStatus",
  ALTER COLUMN "status" SET DEFAULT 'enrolled';

ALTER TABLE "student_academic_records"
  ADD COLUMN "course_registration_finalized_at" TIMESTAMP(3);

COMMIT;
