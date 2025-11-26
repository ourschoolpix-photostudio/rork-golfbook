-- Migration 048: Add game_type, handicaps_enabled, and strokes_aside fields

-- Add game_type to identify the type of game
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS game_type TEXT CHECK (game_type IN ('wolf', 'niners', 'individual-score', 'team-match'));

-- Add handicaps_enabled for Individual Score games
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS handicaps_enabled BOOLEAN DEFAULT true;

-- Add strokes_aside for pot bet players when handicaps are not enabled
-- Format: { "playerId": number, ... }
ALTER TABLE personal_games
ADD COLUMN IF NOT EXISTS strokes_aside JSONB;

COMMENT ON COLUMN personal_games.game_type IS 'Type of game: wolf, niners, individual-score, team-match';
COMMENT ON COLUMN personal_games.handicaps_enabled IS 'Whether handicaps are in effect for Individual Score games (determines net vs gross scoring)';
COMMENT ON COLUMN personal_games.strokes_aside IS 'Strokes a side for pot bet players when handicaps are not enabled - JSON object with player IDs as keys';
