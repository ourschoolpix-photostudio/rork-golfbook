-- Add dollar_amount column to personal_games table

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS dollar_amount DECIMAL(10, 2);

COMMENT ON COLUMN personal_games.dollar_amount IS 'Dollar amount per point/hole for betting games like Wolf';
