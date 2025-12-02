-- ============================================================================
-- FINAL FIX FOR CUSTOM GUEST SUPPORT
-- Modifies event_registrations to support custom guests (no separate table)
-- ============================================================================

-- Step 1: Make member_id nullable
ALTER TABLE event_registrations 
  ALTER COLUMN member_id DROP NOT NULL;

-- Step 2: Add custom guest columns
ALTER TABLE event_registrations 
  ADD COLUMN IF NOT EXISTS is_custom_guest BOOLEAN DEFAULT FALSE;

ALTER TABLE event_registrations 
  ADD COLUMN IF NOT EXISTS custom_guest_name TEXT;

-- Step 3: Drop old unique constraint
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;

-- Step 4: Drop old index if exists
DROP INDEX IF EXISTS event_registrations_event_member_unique;

-- Step 5: Create partial unique index for members only
CREATE UNIQUE INDEX event_registrations_event_member_unique
  ON event_registrations (event_id, member_id)
  WHERE member_id IS NOT NULL;

-- Step 6: Drop old check constraint
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_member_or_guest;

-- Step 7: Add check constraint
ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_member_or_guest 
  CHECK (
    (member_id IS NOT NULL AND is_custom_guest = FALSE) OR
    (member_id IS NULL AND is_custom_guest = TRUE AND custom_guest_name IS NOT NULL)
  );

-- Step 8: Update existing records
UPDATE event_registrations 
SET is_custom_guest = FALSE 
WHERE is_custom_guest IS NULL;

-- Verification
SELECT 
  'is_custom_guest' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_registrations' AND column_name = 'is_custom_guest'
UNION ALL
SELECT 
  'custom_guest_name' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_registrations' AND column_name = 'custom_guest_name'
UNION ALL
SELECT 
  'member_id' as column_name,
  data_type,
  is_nullable
FROM information_schema.columns 
WHERE table_name = 'event_registrations' AND column_name = 'member_id';
