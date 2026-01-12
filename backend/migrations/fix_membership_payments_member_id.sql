-- ============================================================================
-- FIX MEMBERSHIP PAYMENTS MEMBER_ID TYPE
-- Change member_id from UUID to TEXT to match the members table
-- ============================================================================

-- First, drop the existing foreign key constraint and table
DROP TABLE IF EXISTS membership_payments CASCADE;

-- Recreate the table with TEXT member_id (matching the members table)
CREATE TABLE IF NOT EXISTS membership_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id TEXT NOT NULL,
  member_name TEXT NOT NULL,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('full', 'basic')),
  amount TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'zelle')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  email TEXT NOT NULL DEFAULT '',
  phone TEXT,
  paypal_order_id TEXT,
  paypal_capture_id TEXT,
  zelle_confirmation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_membership_payments_member ON membership_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_status ON membership_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_membership_payments_paypal_order ON membership_payments(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_membership_payments_created_at ON membership_payments(created_at DESC);

-- Disable RLS (using custom auth)
ALTER TABLE membership_payments DISABLE ROW LEVEL SECURITY;

-- Add comment for documentation
COMMENT ON TABLE membership_payments IS 'Tracks membership renewal payments via PayPal or Zelle';
