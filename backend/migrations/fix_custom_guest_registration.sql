-- ============================================================================
-- FIX: Custom Guest Registration Support
-- This migration fixes the event_registrations table to support custom guests
-- ============================================================================

-- Step 1: Drop the existing UNIQUE constraint that requires member_id
ALTER TABLE event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;

-- Step 2: Make member_id nullable (for custom guests)
ALTER TABLE event_registrations 
ALTER COLUMN member_id DROP NOT NULL;

-- Step 3: Add columns for custom guests if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'is_custom_guest') THEN
        ALTER TABLE event_registrations ADD COLUMN is_custom_guest BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'custom_guest_name') THEN
        ALTER TABLE event_registrations ADD COLUMN custom_guest_name TEXT;
    END IF;
END $$;

-- Step 4: Add a new constraint: member_id must be provided OR it must be a custom guest
ALTER TABLE event_registrations 
DROP CONSTRAINT IF EXISTS event_registrations_member_or_custom_guest;

ALTER TABLE event_registrations 
ADD CONSTRAINT event_registrations_member_or_custom_guest 
CHECK (
  (member_id IS NOT NULL AND is_custom_guest = FALSE) OR 
  (member_id IS NULL AND is_custom_guest = TRUE AND custom_guest_name IS NOT NULL)
);

-- Step 5: Add a unique constraint that handles both cases
-- For regular members: unique on (event_id, member_id)
-- For custom guests: unique on (event_id, custom_guest_name)
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_member_unique 
ON event_registrations(event_id, member_id) 
WHERE member_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_custom_guest_unique 
ON event_registrations(event_id, custom_guest_name) 
WHERE is_custom_guest = TRUE;

-- Step 6: Update RLS policies to handle null member_id
DROP POLICY IF EXISTS "Allow read for all users" ON event_registrations;
CREATE POLICY "Allow read for all users" ON event_registrations FOR SELECT USING (true);

DROP POLICY IF EXISTS "Allow insert for all users" ON event_registrations;
CREATE POLICY "Allow insert for all users" ON event_registrations FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow update for all users" ON event_registrations;
CREATE POLICY "Allow update for all users" ON event_registrations FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow delete for all users" ON event_registrations;
CREATE POLICY "Allow delete for all users" ON event_registrations FOR DELETE USING (true);

-- ============================================================================
-- Verification
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CUSTOM GUEST REGISTRATION FIX COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Changes applied:';
    RAISE NOTICE '- member_id is now nullable';
    RAISE NOTICE '- is_custom_guest column added/verified';
    RAISE NOTICE '- custom_guest_name column added/verified';
    RAISE NOTICE '- Constraint added to ensure either member_id OR custom guest';
    RAISE NOTICE '- Unique indexes added for both member and custom guest cases';
    RAISE NOTICE '============================================================';
END $$;
