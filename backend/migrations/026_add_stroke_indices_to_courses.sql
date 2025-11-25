-- Migration: Add stroke indices to courses table for automatic stroke allocation

ALTER TABLE courses ADD COLUMN IF NOT EXISTS stroke_indices INTEGER[];

-- Add comment to explain the stroke indices column
COMMENT ON COLUMN courses.stroke_indices IS 'Stroke index for each hole (1-18), where 1 is the hardest hole. Optional field.';
