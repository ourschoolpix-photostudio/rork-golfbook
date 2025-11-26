-- Migration: Add end time columns for social events
-- This adds day1/2/3_end_time and day1/2/3_end_period columns to support social events with end times

-- Add end time columns
ALTER TABLE events ADD COLUMN IF NOT EXISTS day1_end_time TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS day1_end_period TEXT CHECK (day1_end_period IN ('AM', 'PM'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS day2_end_time TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS day2_end_period TEXT CHECK (day2_end_period IN ('AM', 'PM'));

ALTER TABLE events ADD COLUMN IF NOT EXISTS day3_end_time TEXT;
ALTER TABLE events ADD COLUMN IF NOT EXISTS day3_end_period TEXT CHECK (day3_end_period IN ('AM', 'PM'));
