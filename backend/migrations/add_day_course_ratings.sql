-- Add slope/course ratings and course references for each day
-- This allows proper course handicap calculations

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS day1_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day1_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day1_course_id TEXT,
  ADD COLUMN IF NOT EXISTS day1_tee_box TEXT CHECK (day1_tee_box IN ('tips', 'men', 'lady')),
  
  ADD COLUMN IF NOT EXISTS day2_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day2_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day2_course_id TEXT,
  ADD COLUMN IF NOT EXISTS day2_tee_box TEXT CHECK (day2_tee_box IN ('tips', 'men', 'lady')),
  
  ADD COLUMN IF NOT EXISTS day3_slope_rating TEXT,
  ADD COLUMN IF NOT EXISTS day3_course_rating TEXT,
  ADD COLUMN IF NOT EXISTS day3_course_id TEXT,
  ADD COLUMN IF NOT EXISTS day3_tee_box TEXT CHECK (day3_tee_box IN ('tips', 'men', 'lady'));

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_day1_course_id ON events(day1_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day2_course_id ON events(day2_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day3_course_id ON events(day3_course_id);
