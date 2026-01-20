-- Migration: Add event package pricing fields
-- Description: Adds support for up to 3 different pricing packages per event
-- Date: 2024

-- Add package fields to events table
ALTER TABLE events
ADD COLUMN IF NOT EXISTS package1_name TEXT,
ADD COLUMN IF NOT EXISTS package1_price TEXT,
ADD COLUMN IF NOT EXISTS package1_description TEXT,
ADD COLUMN IF NOT EXISTS package2_name TEXT,
ADD COLUMN IF NOT EXISTS package2_price TEXT,
ADD COLUMN IF NOT EXISTS package2_description TEXT,
ADD COLUMN IF NOT EXISTS package3_name TEXT,
ADD COLUMN IF NOT EXISTS package3_price TEXT,
ADD COLUMN IF NOT EXISTS package3_description TEXT;

-- Add comments for documentation
COMMENT ON COLUMN events.package1_name IS 'Name of pricing package 1 (e.g., "Golf Only", "Full Package")';
COMMENT ON COLUMN events.package1_price IS 'Price of package 1 in dollars (stored as text to preserve formatting)';
COMMENT ON COLUMN events.package1_description IS 'Description of what is included in package 1';
COMMENT ON COLUMN events.package2_name IS 'Name of pricing package 2 (optional)';
COMMENT ON COLUMN events.package2_price IS 'Price of package 2 in dollars (optional)';
COMMENT ON COLUMN events.package2_description IS 'Description of what is included in package 2 (optional)';
COMMENT ON COLUMN events.package3_name IS 'Name of pricing package 3 (optional)';
COMMENT ON COLUMN events.package3_price IS 'Price of package 3 in dollars (optional)';
COMMENT ON COLUMN events.package3_description IS 'Description of what is included in package 3 (optional)';

-- Migrate existing entry_fee data to package1_price for events that have an entry_fee
-- This preserves existing pricing information
UPDATE events
SET 
  package1_name = 'Standard Entry',
  package1_price = entry_fee,
  package1_description = 'Event registration fee'
WHERE entry_fee IS NOT NULL 
  AND entry_fee != '' 
  AND (package1_price IS NULL OR package1_price = '');

-- Note: We keep the entry_fee column for backward compatibility
-- It can be used as a default/fallback value

-- Verify the migration
SELECT 
  id,
  name,
  entry_fee,
  package1_name,
  package1_price,
  package1_description
FROM events
WHERE entry_fee IS NOT NULL
LIMIT 5;
