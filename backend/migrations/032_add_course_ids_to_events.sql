-- Migration: Add course_id fields to events table for tournament course selection
-- This allows tournaments to reference specific courses from the courses table

ALTER TABLE events 
  ADD COLUMN IF NOT EXISTS day1_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day2_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS day3_course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_day1_course_id ON events(day1_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day2_course_id ON events(day2_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day3_course_id ON events(day3_course_id);

-- Add comments to explain the new columns
COMMENT ON COLUMN events.day1_course_id IS 'Reference to courses table for Day 1. For tournaments, this links to a saved course from admin settings.';
COMMENT ON COLUMN events.day2_course_id IS 'Reference to courses table for Day 2. For tournaments, this links to a saved course from admin settings.';
COMMENT ON COLUMN events.day3_course_id IS 'Reference to courses table for Day 3. For tournaments, this links to a saved course from admin settings.';
