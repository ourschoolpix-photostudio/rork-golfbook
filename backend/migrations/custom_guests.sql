-- Add custom guest support to event_registrations table
-- Custom guests are social event attendees that don't need full member profiles

-- Make member_id nullable to support custom guests
ALTER TABLE event_registrations 
  ALTER COLUMN member_id DROP NOT NULL;

-- Add custom guest fields
ALTER TABLE event_registrations 
  ADD COLUMN IF NOT EXISTS is_custom_guest BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS custom_guest_name TEXT;

-- Add check constraint to ensure either member_id or custom_guest_name is present
ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_member_or_guest 
  CHECK (
    (member_id IS NOT NULL AND is_custom_guest = FALSE) OR
    (member_id IS NULL AND is_custom_guest = TRUE AND custom_guest_name IS NOT NULL)
  );

-- Update the unique constraint to handle custom guests
-- Drop the old unique constraint
ALTER TABLE event_registrations
  DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;

-- Create a new partial unique index for member registrations only
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_member_unique
  ON event_registrations (event_id, member_id)
  WHERE member_id IS NOT NULL;

-- Add comment
COMMENT ON COLUMN event_registrations.is_custom_guest IS 'True for custom guests added for social events only';
COMMENT ON COLUMN event_registrations.custom_guest_name IS 'Name of custom guest (only used when is_custom_guest is true)';
