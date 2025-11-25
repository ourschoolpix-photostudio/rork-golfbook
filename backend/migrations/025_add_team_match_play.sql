-- Migration 025: Add team match play support to personal_games

-- The players field is already JSONB so it can store the new fields
-- This migration adds columns for game type and match play scoring

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS game_type TEXT DEFAULT 'individual-net' CHECK (game_type IN ('individual-net', 'team-match-play'));

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS match_play_scoring_type TEXT CHECK (match_play_scoring_type IN ('best-ball', 'alternate-ball'));

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS team_scores JSONB;

ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS hole_results JSONB;

-- Index for faster game type queries
CREATE INDEX IF NOT EXISTS idx_personal_games_type ON personal_games(game_type);
