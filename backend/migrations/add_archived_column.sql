-- Add archived column to events table
-- This migration adds the archived and archived_at columns to support archiving events

DO $$ 
BEGIN
    -- Add archived column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'archived'
    ) THEN
        ALTER TABLE events ADD COLUMN archived BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE 'Added archived column to events table';
    ELSE
        RAISE NOTICE 'archived column already exists';
    END IF;
    
    -- Add archived_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'archived_at'
    ) THEN
        ALTER TABLE events ADD COLUMN archived_at TIMESTAMPTZ;
        RAISE NOTICE 'Added archived_at column to events table';
    ELSE
        RAISE NOTICE 'archived_at column already exists';
    END IF;
    
    -- Ensure all existing events have archived set to false
    UPDATE events SET archived = false WHERE archived IS NULL;
    
    -- Create index for archived column to improve query performance
    CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived);
    
    RAISE NOTICE '✅ Archived columns added successfully to events table';
END $$;
