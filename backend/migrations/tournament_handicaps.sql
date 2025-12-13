-- Add tournament_handicaps field to members table
-- This stores an array of handicap calculations from completed tournaments
-- Format: [{ eventId, eventName, score, par, handicap, date }]

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'tournament_handicaps'
    ) THEN
        ALTER TABLE members ADD COLUMN tournament_handicaps JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Ensure existing members have the field initialized
UPDATE members 
SET tournament_handicaps = '[]'::jsonb 
WHERE tournament_handicaps IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_members_tournament_handicaps ON members USING GIN(tournament_handicaps);

-- Add comment for documentation
COMMENT ON COLUMN members.tournament_handicaps IS 'Array of tournament handicap records: [{ eventId, eventName, score, par, handicap, date }]';
