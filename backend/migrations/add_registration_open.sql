-- Add registration_open column to events table
-- This controls whether registration is open or closed for an event

ALTER TABLE events 
ADD COLUMN IF NOT EXISTS registration_open BOOLEAN DEFAULT false;

-- Update existing events to have registration open by default for backwards compatibility
UPDATE events SET registration_open = false WHERE registration_open IS NULL;
