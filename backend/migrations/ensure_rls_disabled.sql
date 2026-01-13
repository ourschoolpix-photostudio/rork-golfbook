-- ============================================================================
-- ENSURE RLS IS DISABLED ON ALL TABLES
-- This migration ensures RLS is fully disabled for custom auth
-- Created: 2025-01-13
-- ============================================================================

-- Disable RLS on all tables
ALTER TABLE IF EXISTS members DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS events DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS event_registrations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS groupings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS financial_records DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS personal_games DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_preferences DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS offline_operations DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS organization_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS table_assignments DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS custom_guests DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS membership_payments DISABLE ROW LEVEL SECURITY;

-- Grant full access to anon role (used by Supabase client)
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO anon;

-- Grant full access to authenticated role
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- Verify and report status
DO $$
DECLARE
    table_record RECORD;
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '=== RLS Status Report ===';
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        ORDER BY tablename
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = table_record.tablename;
        
        RAISE NOTICE 'Table: % - RLS Enabled: %', table_record.tablename, rls_enabled;
    END LOOP;
    RAISE NOTICE '=== End RLS Status Report ===';
END $$;
