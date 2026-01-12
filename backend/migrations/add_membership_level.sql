-- ============================================================================
-- ADD MEMBERSHIP LEVEL COLUMN TO MEMBERS TABLE
-- This migration adds the membership_level column to track full vs basic membership
-- ============================================================================

-- Add membership_level column
ALTER TABLE members
ADD COLUMN IF NOT EXISTS membership_level TEXT CHECK (membership_level IN ('full', 'basic'));

-- Add comment for documentation
COMMENT ON COLUMN members.membership_level IS 'Membership level: full or basic';

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_members_membership_level ON members(membership_level);
