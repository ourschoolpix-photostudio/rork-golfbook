-- Migration: Add courses table for managing golf course information
-- This allows users to save and reuse course information when creating games

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
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
  USING (is_public = true OR member_id = auth.uid());

-- Policy: Users can insert their own courses
CREATE POLICY "Users can insert own courses" 
  ON courses FOR INSERT 
  WITH CHECK (member_id = auth.uid());

-- Policy: Users can update their own courses
CREATE POLICY "Users can update own courses" 
  ON courses FOR UPDATE 
  USING (member_id = auth.uid());

-- Policy: Users can delete their own courses
CREATE POLICY "Users can delete own courses" 
  ON courses FOR DELETE 
  USING (member_id = auth.uid());
