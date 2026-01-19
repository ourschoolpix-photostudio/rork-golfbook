-- Add 'individual' to alert type enum
-- Drop the old constraint and add a new one with 'individual' included
ALTER TABLE alerts DROP CONSTRAINT IF EXISTS alerts_type_check;
ALTER TABLE alerts ADD CONSTRAINT alerts_type_check CHECK (type IN ('organizational', 'event', 'board', 'individual'));

-- Create alert recipients table to track which members receive individual alerts
CREATE TABLE IF NOT EXISTS alert_recipients (
  id TEXT PRIMARY KEY,
  alert_id TEXT NOT NULL,
  member_id TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT now(),
  FOREIGN KEY (alert_id) REFERENCES alerts(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE,
  UNIQUE(alert_id, member_id)
);

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_alert_recipients_alert_id ON alert_recipients(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_recipients_member_id ON alert_recipients(member_id);
