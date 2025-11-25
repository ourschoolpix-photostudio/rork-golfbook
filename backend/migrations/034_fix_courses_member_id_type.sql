-- Migration 034: Fix courses member_id type to match members.id type
-- The error indicates members.id is TEXT, not UUID, so we need to match that type

-- First, check what type members.id actually is and fix courses.member_id accordingly

-- Drop the foreign key constraint
ALTER TABLE courses DROP CONSTRAINT IF EXISTS courses_member_id_fkey;

-- Check if members.id is TEXT or UUID and adjust courses.member_id accordingly
-- Since the error says members.id is TEXT, let's change courses.member_id to TEXT

-- First, drop and recreate the table with TEXT member_id
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
DROP POLICY IF EXISTS "Backend can manage all courses" ON courses;

-- Create RLS policies
CREATE POLICY "Users can view own and public courses" 
  ON courses FOR SELECT 
  USING (is_public = true OR member_id = auth.uid()::text);

CREATE POLICY "Users can insert own courses" 
  ON courses FOR INSERT 
  WITH CHECK (member_id = auth.uid()::text);

CREATE POLICY "Users can update own courses" 
  ON courses FOR UPDATE 
  USING (member_id = auth.uid()::text);

CREATE POLICY "Users can delete own courses" 
  ON courses FOR DELETE 
  USING (member_id = auth.uid()::text);

-- Backend policy for service role
CREATE POLICY "Backend can manage all courses"
  ON courses
  FOR ALL
  USING (true)
  WITH CHECK (true);

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

-- Now ensure events table has the course_id columns with TEXT type
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day1_course_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day2_course_id_fkey;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day3_course_id_fkey;

-- Drop and recreate the columns as TEXT
ALTER TABLE events DROP COLUMN IF EXISTS day1_course_id;
ALTER TABLE events DROP COLUMN IF EXISTS day2_course_id;
ALTER TABLE events DROP COLUMN IF EXISTS day3_course_id;

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

-- Add comments to explain the new columns
COMMENT ON COLUMN events.day1_course_id IS 'Reference to courses table for Day 1. For tournaments, this links to a saved course.';
COMMENT ON COLUMN events.day2_course_id IS 'Reference to courses table for Day 2. For tournaments, this links to a saved course.';
COMMENT ON COLUMN events.day3_course_id IS 'Reference to courses table for Day 3. For tournaments, this links to a saved course.';
