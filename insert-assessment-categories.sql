-- Insert assessment categories if they don't exist
INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Quiz', 10, 1, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Quiz');

INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Assignment', 15, 2, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Assignment');

INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Presentation', 10, 3, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Presentation');

INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Attendance', 5, 4, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Attendance');

INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Mid-term', 30, 5, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Mid-term');

INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Final', 50, 6, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Final');

INSERT INTO assessment_categories (id, name, weightage, display_order, is_active, created_at)
SELECT gen_random_uuid(), 'Others', 0, 7, true, NOW()
WHERE NOT EXISTS (SELECT 1 FROM assessment_categories WHERE name = 'Others');
