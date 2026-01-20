-- Add special_notes column to events table
-- This field will store optional special notes or instructions for event packages

ALTER TABLE events
ADD COLUMN IF NOT EXISTS special_notes TEXT;

-- Add comment to document the column
COMMENT ON COLUMN events.special_notes IS 'Optional special notes or instructions displayed to users during event registration after package selection';
