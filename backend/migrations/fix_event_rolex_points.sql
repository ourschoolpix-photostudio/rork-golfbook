-- Fix event_rolex_points table
-- Run this migration to ensure the table exists with correct structure

-- Drop existing table if it has wrong structure
DROP TABLE IF EXISTS event_rolex_points CASCADE;

-- Create the table with correct types (TEXT for event_id to match events.id)
CREATE TABLE event_rolex_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  rank INTEGER NOT NULL,
  attendance_points INTEGER DEFAULT 0,
  placement_points INTEGER DEFAULT 0,
  total_points INTEGER NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_event_rolex_points_event ON event_rolex_points(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rolex_points_member ON event_rolex_points(member_id);
CREATE INDEX IF NOT EXISTS idx_event_rolex_points_distributed_at ON event_rolex_points(distributed_at DESC);

-- Ensure the events table has the required columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS rolex_points_distributed BOOLEAN DEFAULT false;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rolex_points_distributed_at TIMESTAMPTZ;
ALTER TABLE events ADD COLUMN IF NOT EXISTS rolex_points_distributed_by TEXT;
