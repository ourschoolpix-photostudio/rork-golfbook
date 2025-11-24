-- Migration: Fix courses table foreign key constraint
-- This fixes the type mismatch between courses.member_id and members.id

-- Drop the existing table if it exists (it may have been partially created)
DROP TABLE IF EXISTS courses CASCADE;

-- Recreate the courses table with correct type
-- Note: Using TEXT for member_id to match the actual members.id type
CREATE TABLE courses (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  name TEXT NOT NULL,
  par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for faster lookups
CREATE INDEX idx_courses_member ON courses(member_id);
CREATE INDEX idx_courses_public ON courses(is_public);
CREATE INDEX idx_courses_name ON courses(name);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Policy: Users can see their own courses and public courses
CREATE POLICY "Users can view own and public courses" 
  ON courses FOR SELECT 
  USING (is_public = true OR member_id = auth.uid()::TEXT);

-- Policy: Users can insert their own courses
CREATE POLICY "Users can insert own courses" 
  ON courses FOR INSERT 
  WITH CHECK (member_id = auth.uid()::TEXT);

-- Policy: Users can update their own courses
CREATE POLICY "Users can update own courses" 
  ON courses FOR UPDATE 
  USING (member_id = auth.uid()::TEXT);

-- Policy: Users can delete their own courses
CREATE POLICY "Users can delete own courses" 
  ON courses FOR DELETE 
  USING (member_id = auth.uid()::TEXT);
