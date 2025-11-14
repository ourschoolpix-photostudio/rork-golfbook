-- MIGRATION: Add number_of_guests field to event_registrations
-- This migration adds the number_of_guests column to event_registrations table
-- Run this in Supabase SQL Editor

-- Add number_of_guests column to event_registrations
ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS number_of_guests INTEGER DEFAULT 0;

-- Migration notes:
-- - Number of guests is used for social events
-- - This tracks how many additional guests a member is bringing
-- - Defaults to 0 for non-social events or members without guests
