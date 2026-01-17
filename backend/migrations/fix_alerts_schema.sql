-- Fix alerts schema - add missing expires_at column
-- This migration ensures the alerts table has all required columns

-- Add expires_at column if it doesn't exist
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ;

-- Create index for better performance when filtering expired alerts
CREATE INDEX IF NOT EXISTS idx_alerts_expires_at ON alerts(expires_at);

-- Verify the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'alerts' 
ORDER BY column_name;
