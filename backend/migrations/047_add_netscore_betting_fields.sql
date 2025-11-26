-- Migration 047: Add netscore betting fields to personal_games

-- Add betting fields for individual netscore games
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS front9_bet DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS back9_bet DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS overall_bet DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS pot_bet DECIMAL(10, 2),
ADD COLUMN IF NOT EXISTS pot_players JSONB;

COMMENT ON COLUMN personal_games.front9_bet IS 'Dollar amount bet on front 9 for individual netscore games';
COMMENT ON COLUMN personal_games.back9_bet IS 'Dollar amount bet on back 9 for individual netscore games';
COMMENT ON COLUMN personal_games.overall_bet IS 'Dollar amount bet on overall score for individual netscore games';
COMMENT ON COLUMN personal_games.pot_bet IS 'Dollar amount per player for pot bet in individual netscore games';
COMMENT ON COLUMN personal_games.pot_players IS 'Additional players participating in pot bet only (not on scorecard)';
