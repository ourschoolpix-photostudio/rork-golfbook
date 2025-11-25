-- Migration: Add slope rating and course rating to courses table

ALTER TABLE courses 
  ADD COLUMN IF NOT EXISTS slope_rating NUMERIC(4,1),
  ADD COLUMN IF NOT EXISTS course_rating NUMERIC(4,1);

-- Add comments to explain the new columns
COMMENT ON COLUMN courses.slope_rating IS 'USGA Slope Rating (55-155, typically 113 for average difficulty). Optional field.';
COMMENT ON COLUMN courses.course_rating IS 'USGA Course Rating (typically 67-77 for standard courses). Optional field.';
