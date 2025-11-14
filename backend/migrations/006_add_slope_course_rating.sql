-- Add slope rating and course rating fields for each day
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS day1_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day1_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day2_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day2_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day3_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day3_course_rating TEXT;
