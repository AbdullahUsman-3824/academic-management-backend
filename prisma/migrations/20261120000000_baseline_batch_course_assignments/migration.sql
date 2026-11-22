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

  CONSTRAINT batch_course_assignments_unique
    UNIQUE (batch_id, section_id, course_id, semester_number)
);

CREATE INDEX idx_batch_semester
  ON batch_course_assignments (batch_id, semester_number);