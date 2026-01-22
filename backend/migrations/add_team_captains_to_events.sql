-- Migration: Add team captain columns to events table
-- This migration adds support for 4 fixed team captains for team events

-- Add team captain columns to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS team_captain_1 TEXT,
ADD COLUMN IF NOT EXISTS team_captain_2 TEXT,
ADD COLUMN IF NOT EXISTS team_captain_3 TEXT,
ADD COLUMN IF NOT EXISTS team_captain_4 TEXT;

-- Update the type CHECK constraint to include 'team' if not already present
-- First, drop the existing constraint
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;

-- Add the updated constraint with 'team' included
ALTER TABLE events ADD CONSTRAINT events_type_check 
CHECK (type IN ('tournament', 'team', 'social'));

-- Create an index for better query performance on team events
CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

-- Add comment to document the columns
COMMENT ON COLUMN events.team_captain_1 IS 'Team 1 captain name for team tournament events';
COMMENT ON COLUMN events.team_captain_2 IS 'Team 2 captain name for team tournament events';
COMMENT ON COLUMN events.team_captain_3 IS 'Team 3 captain name for team tournament events';
COMMENT ON COLUMN events.team_captain_4 IS 'Team 4 captain name for team tournament events';
