-- Migration: Ensure course_rating and slope_rating columns exist in courses table
-- This migration is idempotent and can be run multiple times

-- Check and add course_rating column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='courses' 
        AND column_name='course_rating'
    ) THEN
        ALTER TABLE courses ADD COLUMN course_rating NUMERIC(4,1);
        COMMENT ON COLUMN courses.course_rating IS 'USGA Course Rating (typically 67-77 for standard courses). Optional field.';
    END IF;
END $$;

-- Check and add slope_rating column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='courses' 
        AND column_name='slope_rating'
    ) THEN
        ALTER TABLE courses ADD COLUMN slope_rating NUMERIC(4,1);
        COMMENT ON COLUMN courses.slope_rating IS 'USGA Slope Rating (55-155, typically 113 for average difficulty). Optional field.';
    END IF;
END $$;

-- Verify columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'courses' 
AND column_name IN ('course_rating', 'slope_rating')
ORDER BY column_name;
