-- Migration 020: Complete recent features for Rolex points and sponsor functionality
-- This migration ensures all recent features are properly saved to the cloud

-- ============================================================================
-- 1. ENSURE SPONSOR FEATURE IS COMPLETE
-- ============================================================================
-- The is_sponsor column should already exist from migration 017, but let's ensure it's there
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'registrations' AND column_name = 'is_sponsor'
    ) THEN
        ALTER TABLE registrations ADD COLUMN is_sponsor BOOLEAN DEFAULT FALSE;
    END IF;
END $$;

-- Add index for faster sponsor queries
CREATE INDEX IF NOT EXISTS idx_registrations_is_sponsor ON registrations(event_id, is_sponsor) 
WHERE is_sponsor = TRUE;

-- ============================================================================
-- 2. ENSURE ROLEX POINTS CONFIGURATION IS COMPLETE
-- ============================================================================
-- These columns should already exist from migration 019, but let's ensure they're there
DO $$ 
BEGIN
    -- Check and add rolex_placement_points array (30 positions)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_placement_points'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN rolex_placement_points TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;

    -- Check and add rolex_attendance_points
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_attendance_points'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN rolex_attendance_points TEXT DEFAULT '';
    END IF;

    -- Check and add rolex_bonus_points (net score bonus)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'organization_settings' AND column_name = 'rolex_bonus_points'
    ) THEN
        ALTER TABLE organization_settings 
        ADD COLUMN rolex_bonus_points TEXT DEFAULT '';
    END IF;
END $$;

-- Update comments for clarity
COMMENT ON COLUMN organization_settings.rolex_placement_points IS 'Array of 30 Rolex point values for tournament placement (1st through 30th and above). Each index represents a placement position.';
COMMENT ON COLUMN organization_settings.rolex_attendance_points IS 'Rolex points awarded for event attendance';
COMMENT ON COLUMN organization_settings.rolex_bonus_points IS 'Bonus Rolex points awarded for net score achievements';

-- ============================================================================
-- 3. INITIALIZE DEFAULT ROLEX POINTS IF NOT SET
-- ============================================================================
-- Set default values for Rolex points if the array is empty
UPDATE organization_settings
SET rolex_placement_points = ARRAY(
    SELECT '' FROM generate_series(1, 30)
)::TEXT[]
WHERE rolex_placement_points IS NULL OR array_length(rolex_placement_points, 1) IS NULL;

-- Ensure the array always has exactly 30 elements
UPDATE organization_settings
SET rolex_placement_points = (
    SELECT array_agg(
        COALESCE(
            rolex_placement_points[i],
            ''
        )
    )::TEXT[]
    FROM generate_series(1, 30) i
)
WHERE array_length(rolex_placement_points, 1) != 30;

-- ============================================================================
-- 4. ADD AUDIT TRAIL FOR ROLEX POINTS CHANGES (OPTIONAL BUT RECOMMENDED)
-- ============================================================================
-- Create a table to track Rolex points changes for auditing
CREATE TABLE IF NOT EXISTS rolex_points_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    changed_at TIMESTAMPTZ DEFAULT NOW(),
    changed_by TEXT,
    change_type TEXT CHECK (change_type IN ('placement', 'attendance', 'bonus')),
    old_value TEXT,
    new_value TEXT,
    notes TEXT
);

-- Enable RLS
ALTER TABLE rolex_points_history ENABLE ROW LEVEL SECURITY;

-- Allow read access to all
CREATE POLICY "Allow read for all users" ON rolex_points_history FOR SELECT USING (true);

-- Allow insert for all (you might want to restrict this)
CREATE POLICY "Allow insert for all users" ON rolex_points_history FOR INSERT WITH CHECK (true);

-- ============================================================================
-- 5. VERIFY EVENT TYPES SUPPORT
-- ============================================================================
-- Ensure event_type includes both tournament and social events
COMMENT ON COLUMN events.event_type IS 'Type of event: tournament or social. Both support sponsor add-on feature.';

-- ============================================================================
-- 6. ADD HELPFUL VIEWS
-- ============================================================================

-- View to see all sponsors across all events
CREATE OR REPLACE VIEW event_sponsors AS
SELECT 
    e.id AS event_id,
    e.name AS event_name,
    e.event_type,
    r.player_id,
    m.first_name,
    m.last_name,
    r.created_at AS sponsored_at
FROM registrations r
JOIN events e ON r.event_id = e.id
JOIN members m ON r.player_id = m.id
WHERE r.is_sponsor = TRUE
ORDER BY e.start_date DESC, m.last_name, m.first_name;

-- View to get Rolex points configuration in a readable format
CREATE OR REPLACE VIEW rolex_points_config AS
SELECT 
    id,
    rolex_placement_points,
    rolex_attendance_points,
    rolex_bonus_points,
    jsonb_build_object(
        'placement', 
        jsonb_object_agg(
            'position_' || position,
            points
        ) FILTER (WHERE points IS NOT NULL),
        'attendance',
        rolex_attendance_points,
        'bonus',
        rolex_bonus_points
    ) AS points_json
FROM organization_settings,
LATERAL (
    SELECT 
        generate_series AS position,
        rolex_placement_points[generate_series] AS points
    FROM generate_series(1, array_length(rolex_placement_points, 1))
) AS placement_data
GROUP BY id, rolex_placement_points, rolex_attendance_points, rolex_bonus_points;

-- ============================================================================
-- 7. VERIFICATION QUERIES
-- ============================================================================
-- You can run these queries to verify the migration worked correctly:

-- Check if sponsor column exists and has data
-- SELECT COUNT(*) as sponsor_count FROM registrations WHERE is_sponsor = TRUE;

-- Check Rolex points configuration
-- SELECT * FROM rolex_points_config;

-- Check all sponsors
-- SELECT * FROM event_sponsors;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- This migration adds/ensures:
-- 1. Sponsor feature for both tournament and social events (is_sponsor column)
-- 2. Rolex points distribution settings (30 placement positions + attendance + bonus)
-- 3. Audit trail for Rolex points changes
-- 4. Helpful views for querying sponsors and Rolex points
-- 5. Proper indexing for performance
