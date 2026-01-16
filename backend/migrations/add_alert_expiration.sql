-- Add expiration column to alerts table
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMP;

-- Create index for better performance when filtering expired alerts
CREATE INDEX IF NOT EXISTS idx_alerts_expires_at ON alerts(expires_at);
