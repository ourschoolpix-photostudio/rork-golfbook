-- ============================================================================
-- ORGANIZATION SETTINGS TABLE
-- This table stores organization-level settings including PayPal configuration
-- ============================================================================

CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  zelle_phone TEXT,
  logo_url TEXT,
  paypal_client_id TEXT,
  paypal_client_secret TEXT,
  paypal_mode TEXT CHECK (paypal_mode IN ('sandbox', 'live')) DEFAULT 'sandbox',
  rolex_placement_points TEXT[],
  rolex_attendance_points TEXT,
  rolex_bonus_points TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_organization_settings_id ON organization_settings(id);

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Allow all users to read organization settings
DROP POLICY IF EXISTS "Allow read for all users" ON organization_settings;
CREATE POLICY "Allow read for all users" ON organization_settings FOR SELECT USING (true);

-- Allow all users to insert if no settings exist (initial setup)
DROP POLICY IF EXISTS "Allow insert for initial setup" ON organization_settings;
CREATE POLICY "Allow insert for initial setup" ON organization_settings 
  FOR INSERT 
  WITH CHECK ((SELECT COUNT(*) FROM organization_settings) = 0);

-- Allow all users to update settings (since they're organization-wide)
DROP POLICY IF EXISTS "Allow update for all users" ON organization_settings;
CREATE POLICY "Allow update for all users" ON organization_settings FOR UPDATE USING (true);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_organization_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS organization_settings_updated_at ON organization_settings;
CREATE TRIGGER organization_settings_updated_at
  BEFORE UPDATE ON organization_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_organization_settings_updated_at();

-- Insert default settings if none exist
INSERT INTO organization_settings (
  name, 
  address, 
  city, 
  state, 
  zip_code, 
  phone, 
  zelle_phone, 
  logo_url,
  paypal_client_id,
  paypal_client_secret,
  paypal_mode,
  rolex_placement_points,
  rolex_attendance_points,
  rolex_bonus_points
)
SELECT 
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  '',
  'sandbox',
  ARRAY(SELECT ''::TEXT FROM generate_series(1, 30)),
  '',
  ''
WHERE NOT EXISTS (SELECT 1 FROM organization_settings LIMIT 1);
