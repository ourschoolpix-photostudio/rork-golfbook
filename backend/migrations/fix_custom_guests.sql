-- ============================================================================
-- FIX CUSTOM GUEST SUPPORT
-- This ensures event_registrations table properly supports custom guests
-- ============================================================================

-- Step 1: Make member_id nullable to support custom guests
DO $$
BEGIN
    ALTER TABLE event_registrations 
      ALTER COLUMN member_id DROP NOT NULL;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'member_id already nullable or error: %', SQLERRM;
END $$;

-- Step 2: Add custom guest fields if they don't exist
DO $$
BEGIN
    ALTER TABLE event_registrations 
      ADD COLUMN IF NOT EXISTS is_custom_guest BOOLEAN DEFAULT FALSE;
    
    ALTER TABLE event_registrations 
      ADD COLUMN IF NOT EXISTS custom_guest_name TEXT;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Error adding columns: %', SQLERRM;
END $$;

-- Step 3: Drop the old unique constraint if it exists
DO $$
BEGIN
    ALTER TABLE event_registrations
      DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Constraint already dropped: %', SQLERRM;
END $$;

-- Step 4: Drop existing index if it exists
DROP INDEX IF EXISTS event_registrations_event_member_unique;

-- Step 5: Create a new partial unique index for member registrations only
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_member_unique
  ON event_registrations (event_id, member_id)
  WHERE member_id IS NOT NULL;

-- Step 6: Drop old check constraint if exists
DO $$
BEGIN
    ALTER TABLE event_registrations
      DROP CONSTRAINT IF EXISTS event_registrations_member_or_guest;
EXCEPTION
    WHEN others THEN
        RAISE NOTICE 'Constraint already dropped: %', SQLERRM;
END $$;

-- Step 7: Add check constraint to ensure either member_id or custom_guest_name is present
ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_member_or_guest 
  CHECK (
    (member_id IS NOT NULL AND is_custom_guest = FALSE) OR
    (member_id IS NULL AND is_custom_guest = TRUE AND custom_guest_name IS NOT NULL)
  );

-- Step 8: Update any existing records to ensure consistency
UPDATE event_registrations 
SET is_custom_guest = FALSE 
WHERE is_custom_guest IS NULL;

-- Step 9: Add comments for documentation
COMMENT ON COLUMN event_registrations.is_custom_guest IS 'True for custom guests added for social events only';
COMMENT ON COLUMN event_registrations.custom_guest_name IS 'Name of custom guest (only used when is_custom_guest is true)';

-- Step 10: Verification
DO $$
DECLARE
    has_is_custom_guest BOOLEAN;
    has_custom_guest_name BOOLEAN;
    member_id_nullable BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' AND column_name = 'is_custom_guest'
    ) INTO has_is_custom_guest;
    
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' AND column_name = 'custom_guest_name'
    ) INTO has_custom_guest_name;
    
    SELECT is_nullable = 'YES' INTO member_id_nullable
    FROM information_schema.columns
    WHERE table_name = 'event_registrations' AND column_name = 'member_id';
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'CUSTOM GUEST FIX COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Column is_custom_guest exists: %', has_is_custom_guest;
    RAISE NOTICE 'Column custom_guest_name exists: %', has_custom_guest_name;
    RAISE NOTICE 'Column member_id is nullable: %', member_id_nullable;
    RAISE NOTICE '============================================================';
    
    IF has_is_custom_guest AND has_custom_guest_name AND member_id_nullable THEN
        RAISE NOTICE 'SUCCESS: Custom guest support is fully configured!';
    ELSE
        RAISE NOTICE 'WARNING: Some columns may not have been created properly';
    END IF;
    RAISE NOTICE '============================================================';
END $$;
