ALTER TABLE course_allocations
  ADD COLUMN IF NOT EXISTS semester_number INT;

UPDATE course_allocations ca
SET semester_number = s.number
FROM semesters s
WHERE ca.semester_id = s.id;

ALTER TABLE course_allocations
  ALTER COLUMN semester_number SET NOT NULL;

ALTER TABLE course_allocations
  DROP CONSTRAINT IF EXISTS course_allocations_semester_id_fkey;

ALTER TABLE course_allocations
  DROP COLUMN IF EXISTS semester_id;

DROP INDEX IF EXISTS course_allocations_section_id_semester_id_idx;
CREATE INDEX IF NOT EXISTS idx_section_semester_number
  ON course_allocations (section_id, semester_number);