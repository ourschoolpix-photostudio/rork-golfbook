-- ============================================================================
-- ADD LOCKED STATUS TO EVENTS
-- This migration adds the 'locked' status to the event status workflow
-- Status flow: start -> active -> locked -> complete
-- Created: 2025-01-16
-- ============================================================================

-- Drop the existing CHECK constraint on status column
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_status_check;

-- Add the new CHECK constraint with 'locked' status included
ALTER TABLE events ADD CONSTRAINT events_status_check 
CHECK (status IN ('draft', 'active', 'completed', 'upcoming', 'complete', 'locked'));

-- Migration complete
-- Event status now supports: draft, active, locked, complete
-- Status workflow: start -> active -> locked -> complete
