-- Migration 011: Add personal games table

CREATE TABLE IF NOT EXISTS personal_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  players JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_personal_games_member ON personal_games(member_id);
CREATE INDEX idx_personal_games_status ON personal_games(status);

-- RLS policies
ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all users" ON personal_games FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON personal_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON personal_games FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON personal_games FOR DELETE USING (true);
