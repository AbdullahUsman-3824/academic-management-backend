-- Batch-based course assignments: courses belong to (batch, semester), shared across all sections.
-- Drops the per-section dimension and collapses any duplicate (batch, semester, course) rows.

BEGIN;

-- 1) Dedup: keep one row per (batch_id, semester_number, course_id).
--    Preference order: batch-wide row (section_id IS NULL) > earliest created > lowest id.
DELETE FROM batch_course_assignments
WHERE id IN (
  SELECT id FROM (
    SELECT
      id,
      ROW_NUMBER() OVER (
        PARTITION BY batch_id, semester_number, course_id
        ORDER BY (section_id IS NULL) DESC, created_at ASC, id ASC
      ) AS rn
    FROM batch_course_assignments
  ) ranked
  WHERE rn > 1
);

-- 2) Drop the old per-section unique constraint (and its backing index).
ALTER TABLE "batch_course_assignments" DROP CONSTRAINT IF EXISTS "batch_course_assignments_unique";

-- 3) Drop the section foreign key and the section_id column.
ALTER TABLE "batch_course_assignments" DROP CONSTRAINT IF EXISTS "batch_course_assignments_section_id_fkey";
ALTER TABLE "batch_course_assignments" DROP COLUMN IF EXISTS "section_id";

-- 4) New unique: one course per batch per semester (shared across sections).
ALTER TABLE "batch_course_assignments"
  ADD CONSTRAINT "batch_course_assignments_batch_id_semester_number_course_id_key"
  UNIQUE ("batch_id", "semester_number", "course_id");

-- 5) Semester range now 1..8.
ALTER TABLE "batch_course_assignments" DROP CONSTRAINT IF EXISTS "batch_course_assignments_semester_number_check";
ALTER TABLE "batch_course_assignments"
  ADD CONSTRAINT "batch_course_assignments_semester_number_check"
  CHECK ("semester_number" >= 1 AND "semester_number" <= 8);

COMMIT;
