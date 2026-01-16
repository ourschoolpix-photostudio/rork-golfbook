-- ============================================================================
-- ADD PAYPAL FEE CONFIGURATION COLUMNS
-- Adds processing fee (percentage) and transaction fee (dollar amount)
-- to organization_settings table
-- ============================================================================

-- Add PayPal processing fee column (percentage, e.g., 3.0 for 3%)
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS paypal_processing_fee TEXT DEFAULT '3';

-- Add PayPal transaction fee column (dollar amount, e.g., 0.30 for $0.30)
ALTER TABLE organization_settings 
ADD COLUMN IF NOT EXISTS paypal_transaction_fee TEXT DEFAULT '0.30';

-- Add comments for documentation
COMMENT ON COLUMN organization_settings.paypal_processing_fee IS 
  'PayPal processing fee as a percentage (e.g., 3 for 3%). Used to calculate payment amounts.';

COMMENT ON COLUMN organization_settings.paypal_transaction_fee IS 
  'PayPal fixed transaction fee in dollars (e.g., 0.30 for $0.30). Used to calculate payment amounts.';

-- Update existing rows to have default values
UPDATE organization_settings 
SET 
  paypal_processing_fee = COALESCE(paypal_processing_fee, '3'),
  paypal_transaction_fee = COALESCE(paypal_transaction_fee, '0.30')
WHERE paypal_processing_fee IS NULL OR paypal_transaction_fee IS NULL;
