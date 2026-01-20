-- Create event_payments table for historical tracking of event payments
CREATE TABLE IF NOT EXISTS event_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_name TEXT NOT NULL,
  event_name TEXT NOT NULL,
  amount TEXT NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'zelle', 'paypal')),
  payment_status TEXT NOT NULL DEFAULT 'completed' CHECK (payment_status IN ('pending', 'completed', 'failed', 'refunded')),
  number_of_guests INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_event_payments_event_id ON event_payments(event_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_member_id ON event_payments(member_id);
CREATE INDEX IF NOT EXISTS idx_event_payments_created_at ON event_payments(created_at DESC);

-- Enable RLS
ALTER TABLE event_payments ENABLE ROW LEVEL SECURITY;

-- Create policy to allow all operations (since we use custom auth)
CREATE POLICY "Allow all operations on event_payments" ON event_payments
  FOR ALL USING (true) WITH CHECK (true);

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_event_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS event_payments_updated_at ON event_payments;
CREATE TRIGGER event_payments_updated_at
  BEFORE UPDATE ON event_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_event_payments_updated_at();
