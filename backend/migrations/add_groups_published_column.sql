-- Migration: Add groups_published column to events table
-- This column controls whether groups/pairings are visible to players

ALTER TABLE events ADD COLUMN IF NOT EXISTS groups_published BOOLEAN DEFAULT false;

-- Add index for quick filtering
CREATE INDEX IF NOT EXISTS idx_events_groups_published ON events(groups_published);

-- Update existing events to have groups_published = false by default
UPDATE events SET groups_published = false WHERE groups_published IS NULL;
