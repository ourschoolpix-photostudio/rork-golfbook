-- Migration 049: Add betting fields for individual score games

-- Add front_9_bet, back_9_bet, overall_bet columns
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS front_9_bet NUMERIC(10, 2);

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS back_9_bet NUMERIC(10, 2);

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS overall_bet NUMERIC(10, 2);

-- Add pot_bet column
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS pot_bet NUMERIC(10, 2);

-- Add pot_players column to store pot bet players
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS pot_players JSONB;

COMMENT ON COLUMN personal_games.front_9_bet IS 'Dollar amount bet for front 9 holes in individual score games';
COMMENT ON COLUMN personal_games.back_9_bet IS 'Dollar amount bet for back 9 holes in individual score games';
COMMENT ON COLUMN personal_games.overall_bet IS 'Dollar amount bet for overall score in individual score games';
COMMENT ON COLUMN personal_games.pot_bet IS 'Dollar amount for pot bet where additional players can join';
COMMENT ON COLUMN personal_games.pot_players IS 'Array of players participating in pot bet - JSON array with name, handicap, memberId';
