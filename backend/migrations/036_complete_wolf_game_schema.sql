-- Migration 036: Complete Wolf game schema setup
-- This migration ensures all necessary columns and constraints are in place for Wolf game functionality

-- Ensure wolf_order column exists and is properly configured
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_games' 
    AND column_name = 'wolf_order'
  ) THEN
    ALTER TABLE personal_games ADD COLUMN wolf_order INTEGER[];
    COMMENT ON COLUMN personal_games.wolf_order IS 'Array of player indices indicating the order in which players become the wolf';
  END IF;
END $$;

-- Ensure wolf_partnerships column exists and is properly configured
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_games' 
    AND column_name = 'wolf_partnerships'
  ) THEN
    ALTER TABLE personal_games ADD COLUMN wolf_partnerships JSONB;
    COMMENT ON COLUMN personal_games.wolf_partnerships IS 'JSON object mapping hole numbers to wolf partnerships: { "1": { "wolfPlayerIndex": 0, "partnerPlayerIndex": 1, "isLoneWolf": false }, "2": ... }';
  END IF;
END $$;

-- Ensure wolf_scores column exists for tracking points per hole
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_games' 
    AND column_name = 'wolf_scores'
  ) THEN
    ALTER TABLE personal_games ADD COLUMN wolf_scores JSONB;
    COMMENT ON COLUMN personal_games.wolf_scores IS 'JSON object tracking wolf game points per hole: { "1": { "players": [points_per_player] }, "2": ... }';
  END IF;
END $$;

-- Add wolf_rules column to store custom rule settings
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'personal_games' 
    AND column_name = 'wolf_rules'
  ) THEN
    ALTER TABLE personal_games ADD COLUMN wolf_rules JSONB DEFAULT '{
      "wolfGoesLast": true,
      "loneWolfMultiplier": 2,
      "winningTeamPoints": 1,
      "losingTeamPoints": -1,
      "tiePoints": 0
    }'::jsonb;
    COMMENT ON COLUMN personal_games.wolf_rules IS 'JSON object storing Wolf game rule configuration';
  END IF;
END $$;

-- Create index for Wolf games for better query performance
CREATE INDEX IF NOT EXISTS idx_personal_games_game_type ON personal_games(game_type);

-- Update game_type constraint to ensure 'wolf' is a valid option
DO $$
BEGIN
  -- Drop existing constraint if it exists
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'personal_games_game_type_check' 
    AND table_name = 'personal_games'
  ) THEN
    ALTER TABLE personal_games DROP CONSTRAINT personal_games_game_type_check;
  END IF;
  
  -- Add updated constraint with wolf and niners
  ALTER TABLE personal_games ADD CONSTRAINT personal_games_game_type_check 
    CHECK (game_type IN ('individual-net', 'team-match-play', 'wolf', 'niners'));
END $$;

-- Verify the schema is correct
DO $$
DECLARE
  missing_columns TEXT[];
BEGIN
  SELECT ARRAY_AGG(col) INTO missing_columns
  FROM (
    SELECT 'wolf_order' AS col WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'personal_games' AND column_name = 'wolf_order'
    )
    UNION ALL
    SELECT 'wolf_partnerships' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'personal_games' AND column_name = 'wolf_partnerships'
    )
    UNION ALL
    SELECT 'wolf_scores' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'personal_games' AND column_name = 'wolf_scores'
    )
    UNION ALL
    SELECT 'wolf_rules' WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'personal_games' AND column_name = 'wolf_rules'
    )
  ) AS cols;
  
  IF array_length(missing_columns, 1) > 0 THEN
    RAISE EXCEPTION 'Wolf game schema incomplete. Missing columns: %', array_to_string(missing_columns, ', ');
  END IF;
  
  RAISE NOTICE 'Wolf game schema successfully verified. All required columns are present.';
END $$;
