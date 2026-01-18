-- Add use_course_handicap column to events table
-- This allows the "Play Course HDC" toggle to propagate across all devices via realtime

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'use_course_handicap'
    ) THEN
        ALTER TABLE events ADD COLUMN use_course_handicap BOOLEAN DEFAULT false;
    END IF;
END $$;

-- Update existing events to have the default value
UPDATE events SET use_course_handicap = false WHERE use_course_handicap IS NULL;

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_events_use_course_handicap ON events(use_course_handicap);

-- Log the migration
DO $$
BEGIN
    RAISE NOTICE 'Successfully added use_course_handicap column to events table';
END $$;
