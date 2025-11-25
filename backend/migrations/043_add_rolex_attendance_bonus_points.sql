-- Migration 043: Add missing rolex_attendance_points and rolex_bonus_points columns
-- These columns were referenced in code but never actually added to the database

DO $$ 
BEGIN
    -- Check and add rolex_attendance_points
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_attendance_points'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN rolex_attendance_points TEXT DEFAULT '';
        
        COMMENT ON COLUMN organization_settings.rolex_attendance_points IS 'Rolex points awarded for event attendance';
    END IF;

    -- Check and add rolex_bonus_points (net score bonus)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_bonus_points'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN rolex_bonus_points TEXT DEFAULT '';
        
        COMMENT ON COLUMN organization_settings.rolex_bonus_points IS 'Bonus Rolex points awarded for net score achievements';
    END IF;
END $$;
