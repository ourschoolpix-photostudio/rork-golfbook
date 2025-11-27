-- Migration: Force refresh of is_sponsor column in event_registrations
-- Purpose: Fix schema cache error by ensuring the column exists and forcing a schema reload

-- First, ensure the column exists
DO $$ 
BEGIN
    -- Add the column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'is_sponsor'
    ) THEN
        ALTER TABLE event_registrations 
        ADD COLUMN is_sponsor BOOLEAN DEFAULT FALSE;
        RAISE NOTICE 'Added is_sponsor column';
    ELSE
        RAISE NOTICE 'is_sponsor column already exists';
    END IF;
END $$;

-- Ensure the column is NOT NULL with a default value
ALTER TABLE event_registrations 
ALTER COLUMN is_sponsor SET DEFAULT FALSE;

-- Update any NULL values to FALSE
UPDATE event_registrations 
SET is_sponsor = FALSE 
WHERE is_sponsor IS NULL;

-- Set the column to NOT NULL
ALTER TABLE event_registrations 
ALTER COLUMN is_sponsor SET NOT NULL;

-- Recreate the index to ensure it's fresh
DROP INDEX IF EXISTS idx_event_registrations_is_sponsor;
CREATE INDEX idx_event_registrations_is_sponsor 
ON event_registrations(is_sponsor) 
WHERE is_sponsor = TRUE;

-- Force a schema cache refresh by updating the table comment
COMMENT ON TABLE event_registrations IS 'Event registrations - Updated: 2025-01-27 - Schema cache refresh';

-- Add column comment
COMMENT ON COLUMN event_registrations.is_sponsor IS 'Flag indicating if the registrant is a sponsor of the event';

-- Verify the column exists
DO $$ 
DECLARE
    column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'is_sponsor'
    ) INTO column_exists;
    
    IF column_exists THEN
        RAISE NOTICE '✅ SUCCESS: is_sponsor column exists in event_registrations';
    ELSE
        RAISE EXCEPTION '❌ ERROR: is_sponsor column does not exist in event_registrations';
    END IF;
END $$;
