-- ============================================================================
-- ADD MEMBERSHIP LEVEL AND PAYMENT METHOD TRACKING
-- This migration adds columns to track membership level (full/basic) 
-- and payment method for offline renewals
-- ============================================================================

-- Add membership_level column to members table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'membership_level'
    ) THEN
        ALTER TABLE members 
        ADD COLUMN membership_level TEXT 
        CHECK (membership_level IN ('full', 'basic'));
        
        RAISE NOTICE 'Added membership_level column to members table';
    ELSE
        RAISE NOTICE 'membership_level column already exists';
    END IF;
END $$;

-- Add payment_method column to members table for tracking offline renewals
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'payment_method'
    ) THEN
        ALTER TABLE members 
        ADD COLUMN payment_method TEXT 
        CHECK (payment_method IN ('cash', 'check', 'zelle', 'paypal', 'venmo', 'other'));
        
        RAISE NOTICE 'Added payment_method column to members table';
    ELSE
        RAISE NOTICE 'payment_method column already exists';
    END IF;
END $$;

-- Add last_payment_date column to track when the last payment was made
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'last_payment_date'
    ) THEN
        ALTER TABLE members 
        ADD COLUMN last_payment_date DATE;
        
        RAISE NOTICE 'Added last_payment_date column to members table';
    ELSE
        RAISE NOTICE 'last_payment_date column already exists';
    END IF;
END $$;

-- Set default membership level to 'full' for all active members
UPDATE members 
SET membership_level = 'full' 
WHERE membership_type = 'active' 
AND membership_level IS NULL;

-- Create index for membership_level for faster queries
CREATE INDEX IF NOT EXISTS idx_members_membership_level ON members(membership_level);

-- Summary
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'MEMBERSHIP LEVEL AND PAYMENT TRACKING MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Added columns:';
    RAISE NOTICE '  - membership_level (full/basic)';
    RAISE NOTICE '  - payment_method (cash/check/zelle/paypal/venmo/other)';
    RAISE NOTICE '  - last_payment_date (DATE)';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'All active members set to "full" membership level by default';
    RAISE NOTICE '============================================================';
END $$;
