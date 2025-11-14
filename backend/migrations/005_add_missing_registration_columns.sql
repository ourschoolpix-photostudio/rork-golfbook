-- MIGRATION: Add missing columns to event_registrations
-- This migration adds adjusted_handicap and number_of_guests columns if they don't exist
-- Run this in Supabase SQL Editor

-- Add adjusted_handicap column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'adjusted_handicap'
    ) THEN
        ALTER TABLE event_registrations 
        ADD COLUMN adjusted_handicap TEXT;
        
        CREATE INDEX idx_event_registrations_adjusted_handicap 
        ON event_registrations(adjusted_handicap);
    END IF;
END $$;

-- Add number_of_guests column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'event_registrations' 
        AND column_name = 'number_of_guests'
    ) THEN
        ALTER TABLE event_registrations 
        ADD COLUMN number_of_guests INTEGER DEFAULT 0;
    END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'event_registrations'
AND column_name IN ('adjusted_handicap', 'number_of_guests');
