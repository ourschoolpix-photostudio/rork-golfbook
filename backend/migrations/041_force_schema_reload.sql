-- Force schema reload and verify all columns exist
-- This migration ensures the database schema is fully in sync

-- 1. Ensure board_member_roles column exists
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'members' 
    AND column_name = 'board_member_roles'
  ) THEN
    ALTER TABLE members ADD COLUMN board_member_roles text[] DEFAULT '{}';
    RAISE NOTICE 'Added board_member_roles column';
  END IF;
END $$;

-- 2. Ensure all course columns exist
DO $$ 
BEGIN
  -- course_rating
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'course_rating'
  ) THEN
    ALTER TABLE courses ADD COLUMN course_rating DECIMAL(4,1);
    RAISE NOTICE 'Added course_rating column';
  END IF;

  -- source
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'source'
  ) THEN
    ALTER TABLE courses ADD COLUMN source VARCHAR(20) DEFAULT 'event' CHECK (source IN ('event', 'personal_game'));
    RAISE NOTICE 'Added source column';
  END IF;

  -- slope_rating
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'courses' 
    AND column_name = 'slope_rating'
  ) THEN
    ALTER TABLE courses ADD COLUMN slope_rating INTEGER;
    RAISE NOTICE 'Added slope_rating column';
  END IF;
END $$;

-- 3. Update NULL values
UPDATE members 
SET board_member_roles = '{}'::text[]
WHERE board_member_roles IS NULL;

-- 4. Verify RLS policies exist for courses
DO $$
BEGIN
  -- Drop existing policies if they exist
  DROP POLICY IF EXISTS "Enable read access for all users" ON courses;
  DROP POLICY IF EXISTS "Enable insert for authenticated users" ON courses;
  DROP POLICY IF EXISTS "Enable update for authenticated users" ON courses;
  DROP POLICY IF EXISTS "Enable delete for authenticated users" ON courses;

  -- Create new permissive policies
  CREATE POLICY "Enable read access for all users" ON courses
    FOR SELECT USING (true);

  CREATE POLICY "Enable insert for authenticated users" ON courses
    FOR INSERT WITH CHECK (true);

  CREATE POLICY "Enable update for authenticated users" ON courses
    FOR UPDATE USING (true);

  CREATE POLICY "Enable delete for authenticated users" ON courses
    FOR DELETE USING (true);

  RAISE NOTICE 'RLS policies created for courses';
END $$;

-- 5. Ensure RLS is enabled but permissive
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Create permissive policies for members
DO $$
BEGIN
  DROP POLICY IF EXISTS "Enable all access for members" ON members;
  CREATE POLICY "Enable all access for members" ON members
    FOR ALL USING (true) WITH CHECK (true);
END $$;

-- Create permissive policies for events
DO $$
BEGIN
  DROP POLICY IF EXISTS "Enable all access for events" ON events;
  CREATE POLICY "Enable all access for events" ON events
    FOR ALL USING (true) WITH CHECK (true);
END $$;

-- 6. Force schema cache reload
-- Trigger PostgREST schema cache reload
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- 7. Analyze tables to update statistics
ANALYZE members;
ANALYZE events;
ANALYZE courses;
ANALYZE event_registrations;

-- 8. Log completion
DO $$
BEGIN
  RAISE NOTICE '✅ Schema reload complete. All columns verified and RLS policies updated.';
END $$;
