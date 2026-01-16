-- ============================================================================
-- DISABLE RLS FOR ALERTS TABLES
-- Alerts tables need RLS disabled for custom auth to work with real-time
-- Created: 2025-01-16
-- ============================================================================

-- Disable RLS on alerts tables
ALTER TABLE IF EXISTS alerts DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_dismissals DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS alert_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_templates DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS email_member_groups DISABLE ROW LEVEL SECURITY;

-- Grant full access to anon role (used by Supabase client)
GRANT ALL ON alerts TO anon;
GRANT ALL ON alert_dismissals TO anon;
GRANT ALL ON alert_templates TO anon;
GRANT ALL ON email_templates TO anon;
GRANT ALL ON email_member_groups TO anon;

-- Grant full access to authenticated role
GRANT ALL ON alerts TO authenticated;
GRANT ALL ON alert_dismissals TO authenticated;
GRANT ALL ON alert_templates TO authenticated;
GRANT ALL ON email_templates TO authenticated;
GRANT ALL ON email_member_groups TO authenticated;

-- Verify and report status
DO $$
DECLARE
    table_record RECORD;
    rls_enabled BOOLEAN;
BEGIN
    RAISE NOTICE '=== Alerts Tables RLS Status Report ===';
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('alerts', 'alert_dismissals', 'alert_templates', 'email_templates', 'email_member_groups')
        ORDER BY tablename
    LOOP
        SELECT relrowsecurity INTO rls_enabled
        FROM pg_class
        WHERE relname = table_record.tablename;
        
        RAISE NOTICE 'Table: % - RLS Enabled: %', table_record.tablename, rls_enabled;
    END LOOP;
    RAISE NOTICE '=== End Alerts Tables RLS Status Report ===';
END $$;
