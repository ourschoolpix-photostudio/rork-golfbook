-- Migration 012: Add notifications table

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  member_id TEXT REFERENCES members(id) ON DELETE CASCADE,
  event_id TEXT REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'cancellation', 'update', 'payment', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_member ON notifications(member_id);
CREATE INDEX idx_notifications_event ON notifications(event_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- RLS policies
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read for all users" ON notifications FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON notifications FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON notifications FOR DELETE USING (true);
