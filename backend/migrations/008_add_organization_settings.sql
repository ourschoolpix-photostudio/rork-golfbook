-- Create organization_settings table
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Organization info
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  zelle_phone TEXT,
  logo_url TEXT,
  
  -- PayPal settings
  paypal_client_id TEXT,
  paypal_client_secret TEXT,
  paypal_mode TEXT CHECK (paypal_mode IN ('sandbox', 'live')) DEFAULT 'sandbox',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert a default row (there should only ever be one row in this table)
INSERT INTO organization_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT DO NOTHING;

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Allow read for all users" ON organization_settings FOR SELECT USING (true);

-- Allow update for all (you might want to restrict this to admins only)
CREATE POLICY "Allow update for all users" ON organization_settings FOR UPDATE USING (true);
