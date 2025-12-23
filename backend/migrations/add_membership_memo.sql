-- ============================================================================
-- ADD MEMBERSHIP MEMO FIELDS
-- This migration adds full_membership_memo and basic_membership_memo columns
-- to the organization_settings table for storing membership descriptions
-- ============================================================================

-- Add full_membership_memo column
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS full_membership_memo TEXT DEFAULT '';

-- Add basic_membership_memo column
ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS basic_membership_memo TEXT DEFAULT '';

-- Update existing records to have empty strings for the new columns
UPDATE organization_settings
SET 
  full_membership_memo = COALESCE(full_membership_memo, ''),
  basic_membership_memo = COALESCE(basic_membership_memo, '')
WHERE full_membership_memo IS NULL OR basic_membership_memo IS NULL;

-- Add comment for documentation
COMMENT ON COLUMN organization_settings.full_membership_memo IS 'Description/bullet points for full membership tier benefits';
COMMENT ON COLUMN organization_settings.basic_membership_memo IS 'Description/bullet points for basic membership tier benefits';
