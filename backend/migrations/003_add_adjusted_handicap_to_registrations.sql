-- MIGRATION: Add adjusted_handicap field to event_registrations
-- This migration adds the adjusted_handicap column to event_registrations table
-- Run this in Supabase SQL Editor

-- Add adjusted_handicap column to event_registrations
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS adjusted_handicap TEXT;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_event_registrations_adjusted_handicap 
ON event_registrations(adjusted_handicap);

-- Migration notes:
-- - Adjusted handicaps are event-specific, not member-specific
-- - This allows different handicaps for different events
-- - The field is TEXT to match the member's handicap field type
