-- Migration 013: Add user preferences table

CREATE TABLE IF NOT EXISTS user_preferences (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, event_id, preference_key)
);

CREATE INDEX idx_user_preferences_member ON user_preferences(member_id);
CREATE INDEX idx_user_preferences_event ON user_preferences(event_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);

-- RLS policies
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all users" ON user_preferences FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON user_preferences FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON user_preferences FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON user_preferences FOR DELETE USING (true);
