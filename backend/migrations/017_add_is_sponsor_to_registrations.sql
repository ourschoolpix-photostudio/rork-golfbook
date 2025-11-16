-- Add is_sponsor column to event_registrations table
-- This column tracks whether the registrant is a sponsor for the event

-- Add the column
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS is_sponsor BOOLEAN DEFAULT FALSE;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_is_sponsor 
ON event_registrations(is_sponsor) WHERE is_sponsor = TRUE;

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Successfully added is_sponsor column to event_registrations table';
END $$;
