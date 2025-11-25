-- Migration 044: Fix rolex_placement_points column issue
-- The rolex_placement_points column is referenced in code but appears to be missing from the schema cache

DO $$ 
BEGIN
    -- Drop the column if it exists (to clean up any corrupted state)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_placement_points'
    ) THEN
        ALTER TABLE organization_settings DROP COLUMN rolex_placement_points;
    END IF;
    
    -- Add it back fresh using array_fill instead of subquery
    ALTER TABLE organization_settings 
    ADD COLUMN rolex_placement_points TEXT[] DEFAULT array_fill(''::text, ARRAY[30]);
    
    COMMENT ON COLUMN organization_settings.rolex_placement_points IS 'Array of 30 Rolex point values for tournament placement (1st through 30th place)';
END $$;

-- Ensure the existing row has the default array value
UPDATE organization_settings
SET rolex_placement_points = array_fill(''::text, ARRAY[30])
WHERE rolex_placement_points IS NULL OR array_length(rolex_placement_points, 1) IS NULL;

-- Verify the columns exist
DO $$
BEGIN
    -- Check all three Rolex columns
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_placement_points'
    ) THEN
        RAISE EXCEPTION 'rolex_placement_points column still missing!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_attendance_points'
    ) THEN
        RAISE EXCEPTION 'rolex_attendance_points column missing!';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_bonus_points'
    ) THEN
        RAISE EXCEPTION 'rolex_bonus_points column missing!';
    END IF;
    
    RAISE NOTICE 'All Rolex points columns verified successfully';
END $$;
