-- Migration 051: Ensure all betting columns exist with correct types

-- First, check and add columns if they don't exist
DO $$ 
BEGIN
  -- front_9_bet
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'personal_games' 
                 AND column_name = 'front_9_bet') THEN
    ALTER TABLE personal_games ADD COLUMN front_9_bet NUMERIC(10, 2) DEFAULT NULL;
  END IF;

  -- back_9_bet
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'personal_games' 
                 AND column_name = 'back_9_bet') THEN
    ALTER TABLE personal_games ADD COLUMN back_9_bet NUMERIC(10, 2) DEFAULT NULL;
  END IF;

  -- overall_bet
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'personal_games' 
                 AND column_name = 'overall_bet') THEN
    ALTER TABLE personal_games ADD COLUMN overall_bet NUMERIC(10, 2) DEFAULT NULL;
  END IF;

  -- pot_bet
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'personal_games' 
                 AND column_name = 'pot_bet') THEN
    ALTER TABLE personal_games ADD COLUMN pot_bet NUMERIC(10, 2) DEFAULT NULL;
  END IF;

  -- pot_players
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'personal_games' 
                 AND column_name = 'pot_players') THEN
    ALTER TABLE personal_games ADD COLUMN pot_players JSONB DEFAULT NULL;
  END IF;

  -- handicaps_enabled
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                 WHERE table_schema = 'public' 
                 AND table_name = 'personal_games' 
                 AND column_name = 'handicaps_enabled') THEN
    ALTER TABLE personal_games ADD COLUMN handicaps_enabled BOOLEAN DEFAULT TRUE;
  END IF;
END $$;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';

-- Add comments for documentation
COMMENT ON COLUMN personal_games.front_9_bet IS 'Dollar amount bet for front 9 holes in individual score games';
COMMENT ON COLUMN personal_games.back_9_bet IS 'Dollar amount bet for back 9 holes in individual score games';
COMMENT ON COLUMN personal_games.overall_bet IS 'Dollar amount bet for overall score in individual score games';
COMMENT ON COLUMN personal_games.pot_bet IS 'Dollar amount for pot bet where additional players can join';
COMMENT ON COLUMN personal_games.pot_players IS 'Array of players participating in pot bet - JSON array with name, handicap, memberId';
COMMENT ON COLUMN personal_games.handicaps_enabled IS 'Whether handicaps are enabled for individual score games';
