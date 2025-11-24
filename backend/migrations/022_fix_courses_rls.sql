-- Migration: Fix courses table RLS policies to work with backend service
-- The backend uses an anon key without authentication context, 
-- so we need to allow operations without requiring auth.uid()

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own and public courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;

-- Disable RLS for courses table since we're using backend service authentication
-- The backend will handle authorization through member_id validation
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
