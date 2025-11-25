-- Migration: Add source type to courses to distinguish admin courses from personal game courses
-- Admin courses (created in admin settings) can be used in personal games
-- Personal game courses (created when making a game) stay private

-- Add source column to courses table
ALTER TABLE courses 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'personal' CHECK (source IN ('admin', 'personal'));

-- Update existing courses to be 'admin' if they were created by admins
-- For now, we'll set all existing courses to 'admin' since they were created before this change
UPDATE courses SET source = 'admin' WHERE source IS NULL OR source = 'personal';

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_courses_source ON courses(source);

-- Drop old policies
DROP POLICY IF EXISTS "Users can view own and public courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;

-- New policies for admin courses (source = 'admin')
-- Admin courses are visible to everyone
CREATE POLICY "Users can view admin courses" 
  ON courses FOR SELECT 
  USING (source = 'admin');

-- New policies for personal game courses (source = 'personal')
-- Personal game courses are only visible to their creator
CREATE POLICY "Users can view own personal courses" 
  ON courses FOR SELECT 
  USING (source = 'personal' AND member_id = auth.uid());

-- Users can insert courses (with their own member_id)
CREATE POLICY "Users can insert own courses" 
  ON courses FOR INSERT 
  WITH CHECK (member_id = auth.uid());

-- Users can only update their own courses
CREATE POLICY "Users can update own courses" 
  ON courses FOR UPDATE 
  USING (member_id = auth.uid());

-- Users can only delete their own courses
CREATE POLICY "Users can delete own courses" 
  ON courses FOR DELETE 
  USING (member_id = auth.uid());

-- Backend service role can do everything (no restrictions)
CREATE POLICY "Backend can manage all courses" 
  ON courses FOR ALL 
  USING (true)
  WITH CHECK (true);
