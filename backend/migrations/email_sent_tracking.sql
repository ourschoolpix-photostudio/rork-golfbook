-- Add email_sent field to track if admin has sent email for registration
-- This helps admins track which registrations need email reminders

ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS email_sent BOOLEAN DEFAULT false;

-- Add index for better performance when filtering by email status
CREATE INDEX IF NOT EXISTS idx_event_registrations_email_sent 
ON event_registrations(email_sent) WHERE email_sent = false;
