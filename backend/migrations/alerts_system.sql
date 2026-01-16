-- Alerts table for organizational and event-specific alerts
CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('organizational', 'event')),
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'critical')),
  event_id TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES members(id) ON DELETE CASCADE
);

-- Alert dismissals to track which users have dismissed which alerts
CREATE TABLE IF NOT EXISTS alert_dismissals (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  dismissed_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(alert_id, member_id)
);

-- Alert templates for pre-designed alerts
CREATE TABLE IF NOT EXISTS alert_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  priority TEXT NOT NULL CHECK (priority IN ('normal', 'critical')),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(type);
CREATE INDEX IF NOT EXISTS idx_alerts_event_id ON alerts(event_id);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_alert_id ON alert_dismissals(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_dismissals_member_id ON alert_dismissals(member_id);

-- Insert some default alert templates
INSERT OR IGNORE INTO alert_templates (id, name, title, message, priority) VALUES
  ('template-1', 'Rule Change', 'Important Rule Change', 'Please note the following rule change for this tournament: [INSERT RULE CHANGE]', 'critical'),
  ('template-2', 'Schedule Update', 'Schedule Update', 'The tournament schedule has been updated. Please review the new times.', 'normal'),
  ('template-3', 'Weather Alert', 'Weather Alert', 'Weather conditions may affect play. Please check with tournament officials.', 'critical'),
  ('template-4', 'Payment Reminder', 'Payment Due', 'Reminder: Payment is due for this event. Please settle your balance.', 'normal'),
  ('template-5', 'General Announcement', 'Announcement', '[INSERT ANNOUNCEMENT MESSAGE]', 'normal');
