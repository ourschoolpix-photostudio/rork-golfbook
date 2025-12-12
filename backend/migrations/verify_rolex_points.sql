-- ============================================================================
-- VERIFY AND FIX ROLEX POINTS COLUMN
-- This script ensures the rolex_points column exists and is properly configured
-- Run this if rolex_points updates are not persisting
-- ============================================================================

-- Check if rolex_points column exists, if not add it
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'rolex_points'
    ) THEN
        ALTER TABLE members ADD COLUMN rolex_points INTEGER DEFAULT 0;
        RAISE NOTICE 'Added rolex_points column to members table';
    ELSE
        RAISE NOTICE 'rolex_points column already exists';
    END IF;
END $$;

-- Ensure the column has proper default value
ALTER TABLE members ALTER COLUMN rolex_points SET DEFAULT 0;

-- Update any NULL values to 0
UPDATE members SET rolex_points = 0 WHERE rolex_points IS NULL;

-- Verify the column
DO $$
DECLARE
    col_type TEXT;
    col_default TEXT;
BEGIN
    SELECT data_type, column_default 
    INTO col_type, col_default
    FROM information_schema.columns 
    WHERE table_name = 'members' AND column_name = 'rolex_points';
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'ROLEX POINTS COLUMN VERIFICATION';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Column Type: %', col_type;
    RAISE NOTICE 'Column Default: %', col_default;
    RAISE NOTICE '============================================================';
END $$;

-- Show sample data
SELECT id, name, rolex_points, rolex_flight 
FROM members 
LIMIT 5;
