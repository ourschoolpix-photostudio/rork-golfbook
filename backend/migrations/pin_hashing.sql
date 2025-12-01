-- Migration script to prepare for PIN hashing
-- Note: PIN hashing should be done on the client side during authentication
-- This script adds a new column to track migration status

ALTER TABLE members ADD COLUMN IF NOT EXISTS pin_hashed BOOLEAN DEFAULT FALSE;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_members_pin_hashed ON members(pin_hashed);

-- The actual PIN hashing migration will happen gradually:
-- 1. When users log in with plain PINs, the app will hash them and update the database
-- 2. New users will have their PINs hashed immediately
-- 3. Admin can trigger bulk migration for all users

COMMENT ON COLUMN members.pin_hashed IS 'Indicates whether the PIN has been hashed (TRUE) or is still plain text (FALSE)';
