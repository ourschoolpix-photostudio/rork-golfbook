-- Fix table_assignments foreign key constraint to match events.id type
-- Drop the existing table_assignments table and recreate with TEXT type for event_id

DROP TABLE IF EXISTS table_assignments CASCADE;

-- Create table_assignments table with TEXT event_id to match events table
CREATE TABLE table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_label TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  guest_slots JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, table_label, table_number)
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_table_assignments_event ON table_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_event_table ON table_assignments(event_id, table_label, table_number);

-- Enable RLS
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for all users" ON table_assignments;
DROP POLICY IF EXISTS "Allow insert for all users" ON table_assignments;
DROP POLICY IF EXISTS "Allow update for all users" ON table_assignments;
DROP POLICY IF EXISTS "Allow delete for all users" ON table_assignments;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read for all users" ON table_assignments FOR SELECT USING (true);

-- Allow write access to all users (adjust based on your needs)
CREATE POLICY "Allow insert for all users" ON table_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON table_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON table_assignments FOR DELETE USING (true);
