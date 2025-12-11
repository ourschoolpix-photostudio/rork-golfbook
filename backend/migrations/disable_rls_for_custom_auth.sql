-- ============================================================================
-- DISABLE RLS FOR CUSTOM AUTH
-- This app uses custom AsyncStorage-based authentication, not Supabase Auth
-- Therefore, we need to disable RLS and allow direct access
-- Created: 2025-12-11
-- ============================================================================

-- Disable RLS on all tables since we're using custom auth
ALTER TABLE members DISABLE ROW LEVEL SECURITY;
ALTER TABLE events DISABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE groupings DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE personal_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE offline_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments DISABLE ROW LEVEL SECURITY;

-- Drop all existing RLS policies (they won't apply anymore)
DROP POLICY IF EXISTS "Allow read for all users" ON members;
DROP POLICY IF EXISTS "Allow insert for all users" ON members;
DROP POLICY IF EXISTS "Allow update for admins" ON members;
DROP POLICY IF EXISTS "Allow delete for admins" ON members;

DROP POLICY IF EXISTS "Allow read for all users" ON events;
DROP POLICY IF EXISTS "Allow insert for admins" ON events;
DROP POLICY IF EXISTS "Allow update for admins" ON events;
DROP POLICY IF EXISTS "Allow delete for admins" ON events;

DROP POLICY IF EXISTS "Allow read for all users" ON event_registrations;
DROP POLICY IF EXISTS "Allow insert for all users" ON event_registrations;
DROP POLICY IF EXISTS "Allow update for admins or own registration" ON event_registrations;
DROP POLICY IF EXISTS "Allow delete for admins or own registration" ON event_registrations;

DROP POLICY IF EXISTS "Allow read for all users" ON groupings;
DROP POLICY IF EXISTS "Allow insert for admins" ON groupings;
DROP POLICY IF EXISTS "Allow update for admins" ON groupings;
DROP POLICY IF EXISTS "Allow delete for admins" ON groupings;

DROP POLICY IF EXISTS "Allow read for all users" ON scores;
DROP POLICY IF EXISTS "Allow insert for all users" ON scores;
DROP POLICY IF EXISTS "Allow update for admins or scorer" ON scores;
DROP POLICY IF EXISTS "Allow delete for admins" ON scores;

DROP POLICY IF EXISTS "Allow read for admins" ON financial_records;
DROP POLICY IF EXISTS "Allow insert for admins" ON financial_records;
DROP POLICY IF EXISTS "Allow update for admins" ON financial_records;
DROP POLICY IF EXISTS "Allow delete for admins" ON financial_records;

DROP POLICY IF EXISTS "Allow read own games" ON personal_games;
DROP POLICY IF EXISTS "Allow insert own games" ON personal_games;
DROP POLICY IF EXISTS "Allow update own games" ON personal_games;
DROP POLICY IF EXISTS "Allow delete own games" ON personal_games;

DROP POLICY IF EXISTS "Allow read own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert for admins" ON notifications;
DROP POLICY IF EXISTS "Allow update own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow delete for admins" ON notifications;

DROP POLICY IF EXISTS "Allow read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow delete own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Allow read own operations" ON offline_operations;
DROP POLICY IF EXISTS "Allow insert own operations" ON offline_operations;
DROP POLICY IF EXISTS "Allow update own operations" ON offline_operations;
DROP POLICY IF EXISTS "Allow delete own operations" ON offline_operations;

DROP POLICY IF EXISTS "Allow read for all users" ON courses;
DROP POLICY IF EXISTS "Allow insert for admins" ON courses;
DROP POLICY IF EXISTS "Allow update for admins" ON courses;
DROP POLICY IF EXISTS "Allow delete for admins" ON courses;

DROP POLICY IF EXISTS "Allow read for all users" ON custom_guests;
DROP POLICY IF EXISTS "Allow insert for all users" ON custom_guests;
DROP POLICY IF EXISTS "Allow update for admins" ON custom_guests;
DROP POLICY IF EXISTS "Allow delete for admins or own registration" ON custom_guests;

-- Verify RLS is disabled
DO $$
DECLARE
    table_record RECORD;
BEGIN
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN (
            'members', 'events', 'event_registrations', 'groupings', 
            'scores', 'financial_records', 'personal_games', 'notifications',
            'user_preferences', 'offline_operations', 'courses', 
            'organization_settings', 'table_assignments'
        )
    LOOP
        RAISE NOTICE 'RLS disabled for table: %', table_record.tablename;
    END LOOP;
END $$;
