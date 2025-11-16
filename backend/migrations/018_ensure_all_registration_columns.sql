-- Migration: Ensure all event_registrations columns exist
-- Purpose: Consolidate all registration-related columns to ensure they're all present
-- This is a safety migration that adds any missing columns

-- Add adjusted_handicap if it doesn't exist
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS adjusted_handicap TEXT;

-- Add number_of_guests if it doesn't exist
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS number_of_guests INTEGER DEFAULT 0;

-- Add guest_names if it doesn't exist
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS guest_names TEXT;

-- Add is_sponsor if it doesn't exist
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS is_sponsor BOOLEAN DEFAULT FALSE;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_adjusted_handicap 
ON event_registrations(adjusted_handicap);

CREATE INDEX IF NOT EXISTS idx_event_registrations_is_sponsor 
ON event_registrations(is_sponsor) WHERE is_sponsor = TRUE;

-- Add comments for documentation
COMMENT ON COLUMN event_registrations.adjusted_handicap IS 'Event-specific adjusted handicap (overrides member handicap for this event)';
COMMENT ON COLUMN event_registrations.number_of_guests IS 'Number of additional guests attending with the registered player (for social events)';
COMMENT ON COLUMN event_registrations.guest_names IS 'Names of guests attending with the registered player (for social events), stored as newline-separated text';
COMMENT ON COLUMN event_registrations.is_sponsor IS 'Flag indicating if the registrant is a sponsor of the event';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Successfully ensured all event_registrations columns exist';
END $$;
