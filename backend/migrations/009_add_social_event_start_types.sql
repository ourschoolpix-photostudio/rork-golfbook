-- Migration: Add social event start types to day start type constraints
-- This adds 'gala', 'happy-hour', and 'party' as valid options for day1/2/3_start_type

-- Drop existing constraints
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day1_start_type_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day2_start_type_check;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day3_start_type_check;

-- Add new constraints with social event types
ALTER TABLE events ADD CONSTRAINT events_day1_start_type_check 
  CHECK (day1_start_type IN ('tee-time', 'shotgun', 'gala', 'happy-hour', 'party'));

ALTER TABLE events ADD CONSTRAINT events_day2_start_type_check 
  CHECK (day2_start_type IN ('tee-time', 'shotgun', 'gala', 'happy-hour', 'party'));

ALTER TABLE events ADD CONSTRAINT events_day3_start_type_check 
  CHECK (day3_start_type IN ('tee-time', 'shotgun', 'gala', 'happy-hour', 'party'));
