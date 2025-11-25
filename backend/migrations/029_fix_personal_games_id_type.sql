-- Migration 029: Fix personal_games id column to use UUID instead of TEXT
-- This ensures compatibility with Supabase's default UUID functions

DROP TABLE IF EXISTS personal_games CASCADE;

CREATE TABLE personal_games (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  course_par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  stroke_indices INTEGER[],
  players JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')),
  game_type TEXT DEFAULT 'individual-net' CHECK (game_type IN ('individual-net', 'team-match-play')),
  match_play_scoring_type TEXT CHECK (match_play_scoring_type IN ('best-ball', 'alternate-ball')),
  team_scores JSONB,
  hole_results JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_personal_games_member ON personal_games(member_id);
CREATE INDEX idx_personal_games_status ON personal_games(status);
CREATE INDEX idx_personal_games_type ON personal_games(game_type);

-- Enable RLS
ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow read for all users" ON personal_games FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON personal_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON personal_games FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON personal_games FOR DELETE USING (true);

-- Add comments
COMMENT ON TABLE personal_games IS 'Stores personal/casual golf games for individual members';
COMMENT ON COLUMN personal_games.id IS 'Unique game identifier (UUID)';
COMMENT ON COLUMN personal_games.member_id IS 'ID of the member who created the game';
COMMENT ON COLUMN personal_games.stroke_indices IS 'Stroke index for each hole (1-18), where 1 is the hardest hole. Optional field from course.';
COMMENT ON COLUMN personal_games.game_type IS 'Type of game: individual-net or team-match-play';
COMMENT ON COLUMN personal_games.match_play_scoring_type IS 'For team match play: best-ball or alternate-ball';
COMMENT ON COLUMN personal_games.team_scores IS 'JSON object with team1 and team2 scores for match play';
COMMENT ON COLUMN personal_games.hole_results IS 'Array of hole results for match play: team1, team2, or tie';
COMMENT ON COLUMN personal_games.players IS 'JSON array of player objects with scores and other data';
