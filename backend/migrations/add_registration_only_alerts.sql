-- Add registration_only column to alerts table
-- When true, event-specific alerts will only be shown to registered participants

ALTER TABLE alerts 
ADD COLUMN IF NOT EXISTS registration_only BOOLEAN DEFAULT false NOT NULL;

-- Create index for better filtering performance
CREATE INDEX IF NOT EXISTS idx_alerts_registration_only 
ON alerts(registration_only) 
WHERE registration_only = true;

-- Update existing event-specific alerts to be registration-only by default
UPDATE alerts 
SET registration_only = true 
WHERE type = 'event' AND event_id IS NOT NULL;
