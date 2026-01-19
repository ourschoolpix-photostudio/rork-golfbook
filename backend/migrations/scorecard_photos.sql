CREATE TABLE IF NOT EXISTS scorecard_photos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
  event_id TEXT NOT NULL,
  group_label TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  day INTEGER,
  tee TEXT,
  hole_range TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX idx_scorecard_photos_event ON scorecard_photos(event_id);
CREATE INDEX idx_scorecard_photos_group ON scorecard_photos(event_id, group_label);
