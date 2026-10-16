-- =====================================================
-- MIGRATION: Batch-Based Course Assignment System
-- =====================================================
-- Description: 
--   1. Create batch_course_assignments table
--   2. Migrate data from semester_courses to batch_course_assignments
--   3. Update course_allocations to use semesterNumber instead of semesterId
-- =====================================================

BEGIN;

-- Set schema
SET search_path TO public;

-- =====================================================
-- STEP 1: Create batch_course_assignments table
-- =====================================================

CREATE TABLE IF NOT EXISTS public.batch_course_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id UUID NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
  section_id UUID REFERENCES sections(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id),
  semester_number INT NOT NULL CHECK (semester_number >= 1 AND semester_number <= 10),
  is_compulsory BOOLEAN DEFAULT true NOT NULL,
  display_order INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP DEFAULT now() NOT NULL,
  updated_at TIMESTAMP,
  
  CONSTRAINT batch_course_assignments_unique UNIQUE(batch_id, section_id, course_id, semester_number)
);

CREATE INDEX idx_batch_semester ON batch_course_assignments(batch_id, semester_number);

-- =====================================================
-- STEP 2: Migrate semester_courses to batch_course_assignments
-- =====================================================
-- Copy all semester_courses to ALL active batches
-- (Each batch gets the same initial course structure)

INSERT INTO batch_course_assignments (batch_id, course_id, semester_number, is_compulsory, display_order)
SELECT 
  b.id AS batch_id,
  sc.course_id,
  s.number AS semester_number,
  sc.is_compulsory,
  sc.display_order
FROM semester_courses sc
JOIN semesters s ON sc.semester_id = s.id
CROSS JOIN batches b
WHERE b.status = 'ACTIVE'
ON CONFLICT (batch_id, section_id, course_id, semester_number) DO NOTHING;

-- =====================================================
-- STEP 3: Update course_allocations schema
-- =====================================================

-- Add semester_number column
ALTER TABLE course_allocations 
ADD COLUMN IF NOT EXISTS semester_number INT;

-- Populate semester_number from existing semester_id
UPDATE course_allocations ca
SET semester_number = s.number
FROM semesters s
WHERE ca.semester_id = s.id;

-- Make semester_number NOT NULL after population
ALTER TABLE course_allocations 
ALTER COLUMN semester_number SET NOT NULL;

-- Drop old semester_id foreign key and column
ALTER TABLE course_allocations 
DROP CONSTRAINT IF EXISTS course_allocations_semester_id_fkey;

ALTER TABLE course_allocations 
DROP COLUMN IF EXISTS semester_id;

-- Update indexes
DROP INDEX IF EXISTS course_allocations_section_id_semester_id_idx;
CREATE INDEX IF NOT EXISTS idx_section_semester_number ON course_allocations(section_id, semester_number);

-- =====================================================
-- STEP 4: Update semester table (remove FK from allocations)
-- =====================================================
-- No changes needed - Semester table remains for reference

COMMIT;

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check batch_course_assignments count
-- SELECT b.name AS batch, semester_number, COUNT(*) AS course_count
-- FROM batch_course_assignments bca
-- JOIN batches b ON bca.batch_id = b.id
-- GROUP BY b.name, semester_number
-- ORDER BY b.name, semester_number;

-- Check course_allocations migration
-- SELECT 
--   ca.id,
--   s.name AS section,
--   c.name AS course,
--   ca.semester_number,
--   f.name AS faculty
-- FROM course_allocations ca
-- JOIN sections s ON ca.section_id = s.id
-- JOIN courses c ON ca.course_id = c.id
-- JOIN faculty f ON ca.faculty_id = f.id
-- LIMIT 10;
