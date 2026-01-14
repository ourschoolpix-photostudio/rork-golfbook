-- Add course_id and tee_box columns for each day
-- These store references to the courses table and the selected tee box

ALTER TABLE events
ADD COLUMN IF NOT EXISTS day1_course_id UUID REFERENCES courses(id),
ADD COLUMN IF NOT EXISTS day1_tee_box TEXT CHECK (day1_tee_box IN ('tips', 'men', 'lady')),
ADD COLUMN IF NOT EXISTS day2_course_id UUID REFERENCES courses(id),
ADD COLUMN IF NOT EXISTS day2_tee_box TEXT CHECK (day2_tee_box IN ('tips', 'men', 'lady')),
ADD COLUMN IF NOT EXISTS day3_course_id UUID REFERENCES courses(id),
ADD COLUMN IF NOT EXISTS day3_tee_box TEXT CHECK (day3_tee_box IN ('tips', 'men', 'lady'));

-- Add indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_events_day1_course ON events(day1_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day2_course ON events(day2_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day3_course ON events(day3_course_id);

-- Log the changes
DO $$
BEGIN
  RAISE NOTICE 'Successfully added course_id and tee_box columns to events table';
END $$;
