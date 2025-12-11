-- ============================================================================
-- FIX SCORES TABLE ID TYPE
-- Change scores.id from UUID to TEXT to support composite IDs
-- Created: 2025-12-11
-- ============================================================================

-- Drop dependent objects first
ALTER TABLE scores DROP CONSTRAINT IF EXISTS scores_pkey CASCADE;

-- Modify the id column to TEXT
ALTER TABLE scores ALTER COLUMN id TYPE TEXT;

-- Re-add primary key constraint
ALTER TABLE scores ADD PRIMARY KEY (id);

-- Verify the change
DO $$
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'SCORES TABLE ID FIX COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Column id in scores table is now TEXT type';
    RAISE NOTICE 'This allows for composite IDs like: eventId-memberId-dayX';
    RAISE NOTICE '============================================================';
END $$;
