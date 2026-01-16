-- ============================================================================
-- ADD PAYPAL EMAIL COLUMN
-- Adds paypal_email column to organization_settings table
-- ============================================================================

-- Add PayPal email column
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS paypal_email TEXT;

-- Add comment for documentation
COMMENT ON COLUMN organization_settings.paypal_email IS 
  'PayPal email address for receiving payments';

-- Update existing rows to have empty string as default
UPDATE organization_settings 
SET paypal_email = COALESCE(paypal_email, '')
WHERE paypal_email IS NULL;
