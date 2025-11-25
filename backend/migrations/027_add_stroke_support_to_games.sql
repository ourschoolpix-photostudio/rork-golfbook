-- Migration: Add stroke mode and stroke indices support to personal_games table

-- Add stroke_indices column to personal_games table
ALTER TABLE personal_games ADD COLUMN IF NOT EXISTS stroke_indices INTEGER[];

-- Add comment to explain the stroke indices column
COMMENT ON COLUMN personal_games.stroke_indices IS 'Stroke index for each hole (1-18), where 1 is the hardest hole. Optional field from course.';
