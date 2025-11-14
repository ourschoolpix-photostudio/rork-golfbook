-- Add slope rating and course rating fields for each day
-- This migration adds the missing columns to the events table

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS day1_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day1_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day2_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day2_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day3_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day3_course_rating TEXT;

-- Verify columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'events' 
AND column_name LIKE '%slope_rating%' OR column_name LIKE '%course_rating%';
