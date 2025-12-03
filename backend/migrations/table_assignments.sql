-- Create table_assignments table for social event seating
CREATE TABLE IF NOT EXISTS table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_label TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  guest_slots JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, table_label, table_number)
);

-- Create index for faster lookups
CREATE INDEX idx_table_assignments_event ON table_assignments(event_id);
CREATE INDEX idx_table_assignments_event_table ON table_assignments(event_id, table_label, table_number);

-- Enable RLS
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read for all users" ON table_assignments FOR SELECT USING (true);

-- Allow write access to all users (adjust based on your needs)
CREATE POLICY "Allow insert for all users" ON table_assignments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON table_assignments FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON table_assignments FOR DELETE USING (true);
