-- ============================================================================
-- CREATE MEMBERSHIP PAYMENTS TABLE
-- Tracks membership renewal payments
-- ============================================================================

CREATE TABLE IF NOT EXISTS membership_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  membership_type TEXT NOT NULL CHECK (membership_type IN ('full', 'basic')),
  amount TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('paypal', 'zelle')),
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  email TEXT NOT NULL,
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

-- Enable RLS
ALTER TABLE membership_payments ENABLE ROW LEVEL SECURITY;

-- Allow read access for all authenticated users
CREATE POLICY "Allow read for all users" ON membership_payments FOR SELECT USING (true);

-- Allow insert/update for authenticated users (you may want to restrict this further)
CREATE POLICY "Allow insert for all users" ON membership_payments FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON membership_payments FOR UPDATE USING (true);

-- Add comment for documentation
COMMENT ON TABLE membership_payments IS 'Tracks membership renewal payments via PayPal or Zelle';
