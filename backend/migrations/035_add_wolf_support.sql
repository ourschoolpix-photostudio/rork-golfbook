-- Migration: Add Wolf game support to personal_games table

-- Add wolf_order column to track rotation of wolf role
ALTER TABLE personal_games ADD COLUMN IF NOT EXISTS wolf_order INTEGER[];

-- Add wolf_partnerships column to track partnerships per hole
ALTER TABLE personal_games ADD COLUMN IF NOT EXISTS wolf_partnerships JSONB;

-- Add comments to explain the columns
COMMENT ON COLUMN personal_games.wolf_order IS 'Array of player indices indicating the order in which players become the wolf';
COMMENT ON COLUMN personal_games.wolf_partnerships IS 'JSON object mapping hole numbers to wolf partnerships: { hole: { wolfPlayerIndex, partnerPlayerIndex, isLoneWolf } }';
