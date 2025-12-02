-- ============================================================================
-- APPLY CUSTOM GUEST SUPPORT TO EVENT_REGISTRATIONS
-- This script modifies event_registrations table to support custom guests
-- ============================================================================

-- Step 1: Make member_id nullable to support custom guests
ALTER TABLE event_registrations 
  ALTER COLUMN member_id DROP NOT NULL;

-- Step 2: Add custom guest fields
ALTER TABLE event_registrations 
  ADD COLUMN IF NOT EXISTS is_custom_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_guest_name TEXT;

-- Step 3: Drop the old unique constraint if it exists
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;

-- Step 4: Create a new partial unique index for member registrations only
-- (This allows multiple custom guests per event)
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_member_unique
  ON event_registrations (event_id, member_id)
  WHERE member_id IS NOT NULL;

-- Step 5: Add check constraint to ensure either member_id or custom_guest_name is present
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_member_or_guest;

ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_member_or_guest 
  CHECK (
    (member_id IS NOT NULL AND is_custom_guest = FALSE) OR
    (member_id IS NULL AND is_custom_guest = TRUE AND custom_guest_name IS NOT NULL)
  );

-- Step 6: Add comments for documentation
COMMENT ON COLUMN event_registrations.is_custom_guest IS 'True for custom guests added for social events only';
COMMENT ON COLUMN event_registrations.custom_guest_name IS 'Name of custom guest (only used when is_custom_guest is true)';

-- Step 7: Update any existing records to ensure consistency
UPDATE event_registrations 
SET is_custom_guest = FALSE 
WHERE is_custom_guest IS NULL;

-- Verification
DO $$
DECLARE
    has_is_custom_guest BOOLEAN;
    has_custom_guest_name BOOLEAN;
    member_id_nullable BOOLEAN;
BEGIN
    -- Check if columns exist
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' AND column_name = 'is_custom_guest'
    ) INTO has_is_custom_guest;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' AND column_name = 'custom_guest_name'
    ) INTO has_custom_guest_name;
    
    -- Check if member_id is nullable
    SELECT is_nullable = 'YES' INTO member_id_nullable
    FROM information_schema.columns
    WHERE table_name = 'event_registrations' AND column_name = 'member_id';
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CUSTOM GUEST MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Column is_custom_guest exists: %', has_is_custom_guest;
    RAISE NOTICE 'Column custom_guest_name exists: %', has_custom_guest_name;
    RAISE NOTICE 'Column member_id is nullable: %', member_id_nullable;
    RAISE NOTICE '============================================================';
    
    IF has_is_custom_guest AND has_custom_guest_name AND member_id_nullable THEN
        RAISE NOTICE '✅ Custom guest support is fully configured!';
    ELSE
        RAISE NOTICE '⚠️  Some columns may not have been created properly';
    END IF;
    RAISE NOTICE '============================================================';
END $$;
