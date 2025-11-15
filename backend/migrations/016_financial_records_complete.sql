-- Financial Records Complete Migration
-- This migration ensures financial_records table is complete and ready for use
-- Run this in Supabase SQL Editor

-- Verify table structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
        RAISE EXCEPTION 'financial_records table does not exist. Run initial schema migration first.';
    END IF;
END $$;

-- Ensure all columns exist
DO $$ 
BEGIN
    -- Add any missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_records' AND column_name = 'created_at') THEN
        ALTER TABLE financial_records ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_records' AND column_name = 'updated_at') THEN
        ALTER TABLE financial_records ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update type constraint to match frontend types
ALTER TABLE financial_records DROP CONSTRAINT IF EXISTS financial_records_type_check;
ALTER TABLE financial_records ADD CONSTRAINT financial_records_type_check 
    CHECK (type IN ('registration', 'prize', 'expense', 'income', 'other'));

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_financial_records_event ON financial_records(event_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_member ON financial_records(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);

-- Enable RLS if not already enabled
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow read for all users" ON financial_records;
DROP POLICY IF EXISTS "Allow write for all users" ON financial_records;

CREATE POLICY "Allow read for all users" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON financial_records FOR ALL USING (true);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Financial records migration completed successfully!';
END $$;
