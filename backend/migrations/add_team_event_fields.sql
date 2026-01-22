-- Add team event fields to events table
DO $$ 
BEGIN
    -- Add number_of_teams column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'number_of_teams'
    ) THEN
        ALTER TABLE events ADD COLUMN number_of_teams TEXT;
    END IF;

    -- Add team_captains column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'events' AND column_name = 'team_captains'
    ) THEN
        ALTER TABLE events ADD COLUMN team_captains TEXT[];
    END IF;

    -- Update type enum to include 'team'
    ALTER TABLE events DROP CONSTRAINT IF EXISTS events_type_check;
    ALTER TABLE events ADD CONSTRAINT events_type_check 
        CHECK (type IN ('tournament', 'team', 'social'));
END $$;
