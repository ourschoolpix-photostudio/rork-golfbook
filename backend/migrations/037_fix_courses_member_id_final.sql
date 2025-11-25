-- Migration 037: Final fix for courses table - ensure member_id is TEXT type
-- This fixes the foreign key constraint error: courses.member_id (uuid) vs members.id (text)

-- Drop the courses table completely and recreate with correct types
DROP TABLE IF EXISTS courses CASCADE;

CREATE TABLE courses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  stroke_indices INTEGER[],
  rating NUMERIC(4, 1),
  slope INTEGER,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  source_type TEXT DEFAULT 'personal' CHECK (source_type IN ('admin', 'personal')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_courses_member ON courses(member_id);
CREATE INDEX idx_courses_public ON courses(is_public);
CREATE INDEX idx_courses_name ON courses(name);
CREATE INDEX idx_courses_source_type ON courses(source_type);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own and public courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;
DROP POLICY IF EXISTS "Allow read for all users" ON courses;
DROP POLICY IF EXISTS "Allow write for all users" ON courses;

-- Create simple RLS policies that allow all operations (matching other tables)
CREATE POLICY "Allow read for all users" 
  ON courses FOR SELECT 
  USING (true);

CREATE POLICY "Allow write for all users" 
  ON courses FOR ALL 
  USING (true);

-- Fix events table course_id columns if they exist with wrong type
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day1_course_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day2_course_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day3_course_id_fkey;

-- Ensure the columns exist as TEXT type
DO $$ 
BEGIN
  -- day1_course_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'day1_course_id'
  ) THEN
    ALTER TABLE events DROP COLUMN day1_course_id;
  END IF;
  
  -- day2_course_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'day2_course_id'
  ) THEN
    ALTER TABLE events DROP COLUMN day2_course_id;
  END IF;
  
  -- day3_course_id
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'events' AND column_name = 'day3_course_id'
  ) THEN
    ALTER TABLE events DROP COLUMN day3_course_id;
  END IF;
END $$;

-- Add course_id columns with TEXT type
ALTER TABLE events 
  ADD COLUMN day1_course_id TEXT,
  ADD COLUMN day2_course_id TEXT,
  ADD COLUMN day3_course_id TEXT;

-- Add the foreign key constraints
ALTER TABLE events 
  ADD CONSTRAINT events_day1_course_id_fkey 
  FOREIGN KEY (day1_course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE events 
  ADD CONSTRAINT events_day2_course_id_fkey 
  FOREIGN KEY (day2_course_id) REFERENCES courses(id) ON DELETE SET NULL;

ALTER TABLE events 
  ADD CONSTRAINT events_day3_course_id_fkey 
  FOREIGN KEY (day3_course_id) REFERENCES courses(id) ON DELETE SET NULL;

-- Add indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_events_day1_course_id ON events(day1_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day2_course_id ON events(day2_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day3_course_id ON events(day3_course_id);

-- Add comments
COMMENT ON TABLE courses IS 'Stores golf course information for reuse in games and tournaments';
COMMENT ON COLUMN courses.id IS 'Unique course identifier (TEXT representation of UUID)';
COMMENT ON COLUMN courses.name IS 'Name of the golf course';
COMMENT ON COLUMN courses.par IS 'Total par for the course';
COMMENT ON COLUMN courses.hole_pars IS 'Array of par values for each hole (1-18)';
COMMENT ON COLUMN courses.stroke_indices IS 'Stroke index for each hole (1-18), where 1 is the hardest hole';
COMMENT ON COLUMN courses.rating IS 'Course rating (e.g., 72.5)';
COMMENT ON COLUMN courses.slope IS 'Slope rating (e.g., 130)';
COMMENT ON COLUMN courses.member_id IS 'ID of the member who created the course (NULL for admin courses)';
COMMENT ON COLUMN courses.is_public IS 'Whether the course is visible to all users';
COMMENT ON COLUMN courses.source_type IS 'Source of the course: admin (created by admin) or personal (created by user)';
COMMENT ON COLUMN events.day1_course_id IS 'Reference to courses table for Day 1';
COMMENT ON COLUMN events.day2_course_id IS 'Reference to courses table for Day 2';
COMMENT ON COLUMN events.day3_course_id IS 'Reference to courses table for Day 3';
