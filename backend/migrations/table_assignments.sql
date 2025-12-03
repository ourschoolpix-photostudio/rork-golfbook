-- Create table_assignments table for social event seating
CREATE TABLE IF NOT EXISTS table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL,
  table_label TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  guest_slots JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, table_label, table_number)
);

-- Add foreign key constraint separately to handle any type issues
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'table_assignments_event_id_fkey'
    ) THEN
        ALTER TABLE table_assignments ADD CONSTRAINT table_assignments_event_id_fkey 
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index for faster lookups
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
