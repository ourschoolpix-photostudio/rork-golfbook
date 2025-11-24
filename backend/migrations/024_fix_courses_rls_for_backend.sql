-- Migration: Fix courses table RLS policies to work with backend service
-- The backend uses service role key which bypasses RLS, but for consistency
-- we should allow operations for public access since authorization is handled in the tRPC layer

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own and public courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;

-- Disable RLS for courses table since we're using backend service authentication
-- The backend will handle authorization through member_id validation
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
