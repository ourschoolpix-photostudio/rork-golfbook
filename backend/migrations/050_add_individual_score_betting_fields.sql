-- Migration 050: Add individual score betting fields (front_9_bet, back_9_bet, overall_bet, pot_bet, pot_players, handicaps_enabled)

-- Drop columns if they exist (to handle partial migrations)
ALTER TABLE personal_games DROP COLUMN IF EXISTS front_9_bet;
ALTER TABLE personal_games DROP COLUMN IF EXISTS back_9_bet;
ALTER TABLE personal_games DROP COLUMN IF EXISTS overall_bet;
ALTER TABLE personal_games DROP COLUMN IF EXISTS pot_bet;
ALTER TABLE personal_games DROP COLUMN IF EXISTS pot_players;
ALTER TABLE personal_games DROP COLUMN IF EXISTS handicaps_enabled;

-- Add front_9_bet, back_9_bet, overall_bet columns for individual score betting
ALTER TABLE personal_games
ADD COLUMN front_9_bet NUMERIC(10, 2) DEFAULT NULL;

ALTER TABLE personal_games
ADD COLUMN back_9_bet NUMERIC(10, 2) DEFAULT NULL;

ALTER TABLE personal_games
ADD COLUMN overall_bet NUMERIC(10, 2) DEFAULT NULL;

-- Add pot_bet column for pot betting across all game types
ALTER TABLE personal_games
ADD COLUMN pot_bet NUMERIC(10, 2) DEFAULT NULL;

-- Add pot_players column to store pot bet players (JSONB array)
ALTER TABLE personal_games
ADD COLUMN pot_players JSONB DEFAULT NULL;

-- Add handicaps_enabled to track whether handicaps are used in individual games
ALTER TABLE personal_games
ADD COLUMN handicaps_enabled BOOLEAN DEFAULT TRUE;

-- Add comments for documentation
COMMENT ON COLUMN personal_games.front_9_bet IS 'Dollar amount bet for front 9 holes in individual score games';
COMMENT ON COLUMN personal_games.back_9_bet IS 'Dollar amount bet for back 9 holes in individual score games';
COMMENT ON COLUMN personal_games.overall_bet IS 'Dollar amount bet for overall score in individual score games';
COMMENT ON COLUMN personal_games.pot_bet IS 'Dollar amount for pot bet where additional players can join';
COMMENT ON COLUMN personal_games.pot_players IS 'Array of players participating in pot bet - JSON array with name, handicap, memberId';
COMMENT ON COLUMN personal_games.handicaps_enabled IS 'Whether handicaps are enabled for individual score games';
