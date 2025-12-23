-- ============================================================================
-- ADD MEMBERSHIP PRICING COLUMNS
-- This migration adds full_membership_price and basic_membership_price columns
-- to the organization_settings table
-- ============================================================================

-- Add full_membership_price column
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS full_membership_price TEXT DEFAULT '';

-- Add basic_membership_price column
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS basic_membership_price TEXT DEFAULT '';

-- Update existing records to have empty strings for the new columns
UPDATE organization_settings
SET 
  full_membership_price = COALESCE(full_membership_price, ''),
  basic_membership_price = COALESCE(basic_membership_price, '')
WHERE full_membership_price IS NULL OR basic_membership_price IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN organization_settings.full_membership_price IS 'Price for full membership tier';
COMMENT ON COLUMN organization_settings.basic_membership_price IS 'Price for basic membership tier';
