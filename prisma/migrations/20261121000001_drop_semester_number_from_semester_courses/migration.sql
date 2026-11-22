-- #11: Remove the deprecated, redundant SemesterCourse.semester_number column.
-- The authoritative link is semester_id -> semesters.number.

BEGIN;

ALTER TABLE "semester_courses" DROP CONSTRAINT IF EXISTS "semester_courses_semester_number_check";
DROP INDEX IF EXISTS "semester_courses_semester_number_idx";
ALTER TABLE "semester_courses" DROP COLUMN IF EXISTS "semester_number";

COMMIT;
