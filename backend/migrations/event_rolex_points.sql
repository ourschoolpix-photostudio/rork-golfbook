-- Create table to store event-specific rolex points distribution
-- This provides historical records of points earned per event

CREATE TABLE IF NOT EXISTS event_rolex_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  rank INTEGER NOT NULL,
  attendance_points INTEGER DEFAULT 0,
  placement_points INTEGER DEFAULT 0,
  total_points INTEGER NOT NULL,
  distributed_at TIMESTAMPTZ DEFAULT NOW(),
  distributed_by UUID REFERENCES members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_event_rolex_points_event ON event_rolex_points(event_id);
CREATE INDEX IF NOT EXISTS idx_event_rolex_points_member ON event_rolex_points(member_id);
CREATE INDEX IF NOT EXISTS idx_event_rolex_points_distributed_at ON event_rolex_points(distributed_at DESC);

-- Add column to events table to track if points have been distributed
ALTER TABLE events 
ADD COLUMN IF NOT EXISTS rolex_points_distributed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS rolex_points_distributed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rolex_points_distributed_by UUID REFERENCES members(id);
