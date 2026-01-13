-- ============================================================================
-- DIAGNOSTIC SCRIPT FOR REGISTRATION ISSUES
-- Run this in Supabase SQL Editor to diagnose why registrations aren't showing
-- ============================================================================

-- 1. Check if RLS is enabled on event_registrations
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'event_registrations';

-- 2. Check all registrations in the table
SELECT 
    id,
    event_id,
    member_id,
    is_custom_guest,
    custom_guest_name,
    status,
    payment_status,
    registered_at
FROM event_registrations
ORDER BY registered_at DESC
LIMIT 20;

-- 3. Count registrations by event
SELECT 
    e.id,
    e.name,
    e.date,
    COUNT(er.id) as registration_count
FROM events e
LEFT JOIN event_registrations er ON e.id = er.event_id
GROUP BY e.id, e.name, e.date
ORDER BY e.date DESC
LIMIT 10;

-- 4. Check for any constraints that might be blocking inserts
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'event_registrations'::regclass;

-- 5. Check permissions on event_registrations table
SELECT 
    grantee, 
    privilege_type
FROM information_schema.table_privileges
WHERE table_name = 'event_registrations'
AND table_schema = 'public';

-- 6. Try to insert a test registration (replace with actual event_id and member_id)
-- UNCOMMENT AND MODIFY THE FOLLOWING TO TEST:
-- INSERT INTO event_registrations (event_id, member_id, status, payment_status)
-- VALUES ('your-event-id-here', 'your-member-id-here', 'registered', 'pending')
-- RETURNING *;
