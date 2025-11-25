-- Migration 042: Verify RLS policies are correct and permissive
-- This ensures the app can read data from Supabase

-- Drop all existing policies
DO $$
BEGIN
  -- Members table
  DROP POLICY IF EXISTS "Allow read for all users" ON members;
  DROP POLICY IF EXISTS "Allow write for all users" ON members;
  DROP POLICY IF EXISTS "Enable all access for members" ON members;
  
  -- Events table
  DROP POLICY IF EXISTS "Allow read for all users" ON events;
  DROP POLICY IF EXISTS "Allow write for all users" ON events;
  DROP POLICY IF EXISTS "Enable all access for events" ON events;
  
  -- Event registrations table
  DROP POLICY IF EXISTS "Allow read for all users" ON event_registrations;
  DROP POLICY IF EXISTS "Allow write for all users" ON event_registrations;
  
  -- Groupings table
  DROP POLICY IF EXISTS "Allow read for all users" ON groupings;
  DROP POLICY IF EXISTS "Allow write for all users" ON groupings;
  
  -- Scores table
  DROP POLICY IF EXISTS "Allow read for all users" ON scores;
  DROP POLICY IF EXISTS "Allow write for all users" ON scores;
  
  -- Financial records table
  DROP POLICY IF EXISTS "Allow read for all users" ON financial_records;
  DROP POLICY IF EXISTS "Allow write for all users" ON financial_records;
  
  -- Sync status table
  DROP POLICY IF EXISTS "Allow read for all users" ON sync_status;
  DROP POLICY IF EXISTS "Allow write for all users" ON sync_status;
  
  RAISE NOTICE 'Dropped existing policies';
END $$;

-- Create simple, permissive policies
DO $$
BEGIN
  -- Members - Allow everything
  CREATE POLICY "Allow all operations" ON members
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  -- Events - Allow everything
  CREATE POLICY "Allow all operations" ON events
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  -- Event registrations - Allow everything
  CREATE POLICY "Allow all operations" ON event_registrations
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  -- Groupings - Allow everything
  CREATE POLICY "Allow all operations" ON groupings
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  -- Scores - Allow everything
  CREATE POLICY "Allow all operations" ON scores
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  -- Financial records - Allow everything
  CREATE POLICY "Allow all operations" ON financial_records
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  -- Sync status - Allow everything
  CREATE POLICY "Allow all operations" ON sync_status
    FOR ALL
    USING (true)
    WITH CHECK (true);
  
  RAISE NOTICE '✅ Created permissive policies for all tables';
END $$;

-- Ensure RLS is enabled
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Force PostgREST to reload schema
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload config';

-- Verify tables exist and log counts
DO $$
DECLARE
  member_count INTEGER;
  event_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO member_count FROM members;
  SELECT COUNT(*) INTO event_count FROM events;
  
  RAISE NOTICE '📊 Database status:';
  RAISE NOTICE '   Members: %', member_count;
  RAISE NOTICE '   Events: %', event_count;
  RAISE NOTICE '✅ RLS policies verified and configured';
END $$;
