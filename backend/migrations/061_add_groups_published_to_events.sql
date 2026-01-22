-- Add groups_published column to events table
-- This flag controls whether groupings are visible to non-admin players

ALTER TABLE events ADD COLUMN IF NOT EXISTS groups_published BOOLEAN DEFAULT false;

-- Add index for efficient filtering
CREATE INDEX IF NOT EXISTS idx_events_groups_published ON events(groups_published);
