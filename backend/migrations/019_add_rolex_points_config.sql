-- Add Rolex points configuration columns to organization_settings table

ALTER TABLE organization_settings
ADD COLUMN IF NOT EXISTS rolex_placement_points TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN IF NOT EXISTS rolex_attendance_points TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS rolex_bonus_points TEXT DEFAULT '';

-- Add comment explaining the columns
COMMENT ON COLUMN organization_settings.rolex_placement_points IS 'Array of 30 Rolex point values for placement (1st through 30th place)';
COMMENT ON COLUMN organization_settings.rolex_attendance_points IS 'Rolex points awarded for event attendance';
COMMENT ON COLUMN organization_settings.rolex_bonus_points IS 'Bonus Rolex points for net score achievements';
