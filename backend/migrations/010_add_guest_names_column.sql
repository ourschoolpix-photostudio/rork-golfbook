-- Migration: Add guest_names column to event_registrations table
-- Purpose: Store names of guests attending social events with the registered player
-- Date: 2025-01-15

-- Add guest_names column
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS guest_names TEXT;

-- Add a comment to the column for documentation
COMMENT ON COLUMN event_registrations.guest_names IS 'Names of guests attending with the registered player (for social events)';
