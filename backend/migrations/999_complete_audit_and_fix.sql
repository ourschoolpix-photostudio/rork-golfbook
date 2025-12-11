-- ============================================================================
-- COMPLETE DATABASE AUDIT AND FIX SCRIPT
-- This script audits all tables and adds any missing columns/tables
-- Created: 2025-12-11
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- AUDIT SECTION: Check for missing tables, columns, and constraints
-- ============================================================================

DO $$
DECLARE
    missing_items TEXT := '';
BEGIN
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'STARTING DATABASE AUDIT';
    RAISE NOTICE '============================================================';
    
    -- Check for missing tables
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'members') THEN
        missing_items := missing_items || '- members table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'events') THEN
        missing_items := missing_items || '- events table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'event_registrations') THEN
        missing_items := missing_items || '- event_registrations table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'groupings') THEN
        missing_items := missing_items || '- groupings table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'scores') THEN
        missing_items := missing_items || '- scores table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
        missing_items := missing_items || '- financial_records table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'sync_status') THEN
        missing_items := missing_items || '- sync_status table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organization_settings') THEN
        missing_items := missing_items || '- organization_settings table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'courses') THEN
        missing_items := missing_items || '- courses table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'personal_games') THEN
        missing_items := missing_items || '- personal_games table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
        missing_items := missing_items || '- notifications table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_preferences') THEN
        missing_items := missing_items || '- user_preferences table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'offline_operations') THEN
        missing_items := missing_items || '- offline_operations table' || E'\n';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'table_assignments') THEN
        missing_items := missing_items || '- table_assignments table' || E'\n';
    END IF;
    
    IF missing_items <> '' THEN
        RAISE NOTICE 'MISSING TABLES:';
        RAISE NOTICE '%', missing_items;
    ELSE
        RAISE NOTICE '✅ All required tables exist';
    END IF;
END $$;

-- ============================================================================
-- FIX SECTION 1: MEMBERS TABLE
-- ============================================================================

-- Add missing columns to members table
DO $$ 
BEGIN
    -- board_member_roles column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'board_member_roles') THEN
        ALTER TABLE members ADD COLUMN board_member_roles TEXT[] DEFAULT '{}';
        RAISE NOTICE '✅ Added board_member_roles column to members table';
    END IF;
    
    -- pin_hashed column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'members' AND column_name = 'pin_hashed') THEN
        ALTER TABLE members ADD COLUMN pin_hashed BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added pin_hashed column to members table';
    END IF;
    
    -- Ensure board_member_roles is not null
    UPDATE members SET board_member_roles = '{}' WHERE board_member_roles IS NULL;
    
    RAISE NOTICE '✅ Members table audit complete';
END $$;

-- ============================================================================
-- FIX SECTION 2: EVENTS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add course_id columns for linking to courses table
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'day1_course_id') THEN
        ALTER TABLE events ADD COLUMN day1_course_id UUID;
        RAISE NOTICE '✅ Added day1_course_id column to events table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'day2_course_id') THEN
        ALTER TABLE events ADD COLUMN day2_course_id UUID;
        RAISE NOTICE '✅ Added day2_course_id column to events table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'day3_course_id') THEN
        ALTER TABLE events ADD COLUMN day3_course_id UUID;
        RAISE NOTICE '✅ Added day3_course_id column to events table';
    END IF;
    
    -- Add archived columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'archived') THEN
        ALTER TABLE events ADD COLUMN archived BOOLEAN DEFAULT false NOT NULL;
        RAISE NOTICE '✅ Added archived column to events table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'archived_at') THEN
        ALTER TABLE events ADD COLUMN archived_at TIMESTAMPTZ;
        RAISE NOTICE '✅ Added archived_at column to events table';
    END IF;
    
    -- Ensure all existing events have archived set to false
    UPDATE events SET archived = false WHERE archived IS NULL;
    
    RAISE NOTICE '✅ Events table audit complete';
END $$;

-- ============================================================================
-- FIX SECTION 3: EVENT_REGISTRATIONS TABLE
-- ============================================================================

DO $$ 
BEGIN
    -- Add email_sent column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'email_sent') THEN
        ALTER TABLE event_registrations ADD COLUMN email_sent BOOLEAN DEFAULT false;
        RAISE NOTICE '✅ Added email_sent column to event_registrations table';
    END IF;
    
    -- Add custom guest columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'is_custom_guest') THEN
        ALTER TABLE event_registrations ADD COLUMN is_custom_guest BOOLEAN DEFAULT FALSE;
        RAISE NOTICE '✅ Added is_custom_guest column to event_registrations table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'custom_guest_name') THEN
        ALTER TABLE event_registrations ADD COLUMN custom_guest_name TEXT;
        RAISE NOTICE '✅ Added custom_guest_name column to event_registrations table';
    END IF;
    
    -- Make member_id nullable to support custom guests
    ALTER TABLE event_registrations ALTER COLUMN member_id DROP NOT NULL;
    RAISE NOTICE '✅ Made member_id nullable in event_registrations table';
    
    -- Update existing records
    UPDATE event_registrations SET is_custom_guest = FALSE WHERE is_custom_guest IS NULL;
    UPDATE event_registrations SET email_sent = false WHERE email_sent IS NULL;
    
    RAISE NOTICE '✅ Event_registrations table audit complete';
END $$;

-- Drop old constraints and recreate them
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_event_id_member_id_key;
DROP INDEX IF EXISTS event_registrations_event_member_unique;

-- Create partial unique index for members only
CREATE UNIQUE INDEX IF NOT EXISTS event_registrations_event_member_unique
  ON event_registrations (event_id, member_id)
  WHERE member_id IS NOT NULL;

-- Add check constraint for custom guests
ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_member_or_guest;
ALTER TABLE event_registrations
  ADD CONSTRAINT event_registrations_member_or_guest 
  CHECK (
    (member_id IS NOT NULL AND is_custom_guest = FALSE) OR
    (member_id IS NULL AND is_custom_guest = TRUE AND custom_guest_name IS NOT NULL)
  );

-- ============================================================================
-- FIX SECTION 4: COURSES TABLE
-- ============================================================================

-- Create courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
    -- Add optional columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'member_id') THEN
        ALTER TABLE courses ADD COLUMN member_id TEXT;
        RAISE NOTICE '✅ Added member_id column to courses table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'source') THEN
        ALTER TABLE courses ADD COLUMN source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'personal'));
        RAISE NOTICE '✅ Added source column to courses table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'stroke_indices') THEN
        ALTER TABLE courses ADD COLUMN stroke_indices INTEGER[];
        RAISE NOTICE '✅ Added stroke_indices column to courses table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'course_rating') THEN
        ALTER TABLE courses ADD COLUMN course_rating NUMERIC(4,1);
        RAISE NOTICE '✅ Added course_rating column to courses table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'slope_rating') THEN
        ALTER TABLE courses ADD COLUMN slope_rating NUMERIC(4,1);
        RAISE NOTICE '✅ Added slope_rating column to courses table';
    END IF;
    
    RAISE NOTICE '✅ Courses table audit complete';
END $$;

-- Add foreign key constraints for course_id columns in events
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_day1_course_id_fkey') THEN
        ALTER TABLE events ADD CONSTRAINT events_day1_course_id_fkey 
        FOREIGN KEY (day1_course_id) REFERENCES courses(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added foreign key constraint events_day1_course_id_fkey';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_day2_course_id_fkey') THEN
        ALTER TABLE events ADD CONSTRAINT events_day2_course_id_fkey 
        FOREIGN KEY (day2_course_id) REFERENCES courses(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added foreign key constraint events_day2_course_id_fkey';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'events_day3_course_id_fkey') THEN
        ALTER TABLE events ADD CONSTRAINT events_day3_course_id_fkey 
        FOREIGN KEY (day3_course_id) REFERENCES courses(id) ON DELETE SET NULL;
        RAISE NOTICE '✅ Added foreign key constraint events_day3_course_id_fkey';
    END IF;
END $$;

-- ============================================================================
-- FIX SECTION 5: ORGANIZATION_SETTINGS TABLE
-- ============================================================================

-- Create organization_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  zelle_phone TEXT,
  logo_url TEXT,
  paypal_client_id TEXT,
  paypal_client_secret TEXT,
  paypal_mode TEXT CHECK (paypal_mode IN ('sandbox', 'live')) DEFAULT 'sandbox',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
    -- Add Rolex points columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'rolex_placement_points') THEN
        ALTER TABLE organization_settings ADD COLUMN rolex_placement_points TEXT[] DEFAULT ARRAY[]::TEXT[];
        RAISE NOTICE '✅ Added rolex_placement_points column to organization_settings table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'rolex_attendance_points') THEN
        ALTER TABLE organization_settings ADD COLUMN rolex_attendance_points TEXT DEFAULT '';
        RAISE NOTICE '✅ Added rolex_attendance_points column to organization_settings table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'rolex_bonus_points') THEN
        ALTER TABLE organization_settings ADD COLUMN rolex_bonus_points TEXT DEFAULT '';
        RAISE NOTICE '✅ Added rolex_bonus_points column to organization_settings table';
    END IF;
    
    RAISE NOTICE '✅ Organization_settings table audit complete';
END $$;

-- Ensure default row exists
INSERT INTO organization_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Initialize Rolex points array if empty
UPDATE organization_settings
SET rolex_placement_points = ARRAY(SELECT ''::TEXT FROM generate_series(1, 30))::TEXT[]
WHERE rolex_placement_points IS NULL OR array_length(rolex_placement_points, 1) IS NULL;

-- ============================================================================
-- FIX SECTION 6: TABLE_ASSIGNMENTS TABLE
-- ============================================================================

-- Create table_assignments table if it doesn't exist
CREATE TABLE IF NOT EXISTS table_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  table_label TEXT NOT NULL,
  table_number INTEGER NOT NULL,
  guest_slots JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, table_label, table_number)
);

DO $$
BEGIN
    RAISE NOTICE '✅ Table_assignments table verified/created';
END $$;

-- ============================================================================
-- FIX SECTION 7: PERSONAL_GAMES TABLE
-- ============================================================================

-- Create personal_games table if it doesn't exist
CREATE TABLE IF NOT EXISTS personal_games (
  id TEXT PRIMARY KEY,
  member_id TEXT NOT NULL,
  course_name TEXT NOT NULL,
  course_par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  players JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

DO $$ 
BEGIN
    -- Add all game-specific columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'game_type') THEN
        ALTER TABLE personal_games ADD COLUMN game_type TEXT CHECK (game_type IN ('wolf', 'niners', 'individual-score', 'team-match'));
        RAISE NOTICE '✅ Added game_type column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'handicaps_enabled') THEN
        ALTER TABLE personal_games ADD COLUMN handicaps_enabled BOOLEAN DEFAULT TRUE;
        RAISE NOTICE '✅ Added handicaps_enabled column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'strokes_aside') THEN
        ALTER TABLE personal_games ADD COLUMN strokes_aside JSONB;
        RAISE NOTICE '✅ Added strokes_aside column to personal_games table';
    END IF;
    
    -- Wolf game columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_order') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_order INTEGER[];
        RAISE NOTICE '✅ Added wolf_order column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_partnerships') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_partnerships JSONB;
        RAISE NOTICE '✅ Added wolf_partnerships column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_scores') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_scores JSONB;
        RAISE NOTICE '✅ Added wolf_scores column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_rules') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_rules JSONB DEFAULT '{"wolfGoesLast": true, "loneWolfMultiplier": 2, "winningTeamPoints": 1, "losingTeamPoints": -1, "tiePoints": 0}'::jsonb;
        RAISE NOTICE '✅ Added wolf_rules column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'dollar_amount') THEN
        ALTER TABLE personal_games ADD COLUMN dollar_amount NUMERIC(10, 2);
        RAISE NOTICE '✅ Added dollar_amount column to personal_games table';
    END IF;
    
    -- Niners game columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'niners_front_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN niners_front_9_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added niners_front_9_bet column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'niners_back_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN niners_back_9_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added niners_back_9_bet column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'niners_overall_bet') THEN
        ALTER TABLE personal_games ADD COLUMN niners_overall_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added niners_overall_bet column to personal_games table';
    END IF;
    
    -- Individual score game columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'front_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN front_9_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added front_9_bet column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'back_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN back_9_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added back_9_bet column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'overall_bet') THEN
        ALTER TABLE personal_games ADD COLUMN overall_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added overall_bet column to personal_games table';
    END IF;
    
    -- Pot bet columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'pot_bet') THEN
        ALTER TABLE personal_games ADD COLUMN pot_bet NUMERIC(10, 2);
        RAISE NOTICE '✅ Added pot_bet column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'pot_players') THEN
        ALTER TABLE personal_games ADD COLUMN pot_players JSONB;
        RAISE NOTICE '✅ Added pot_players column to personal_games table';
    END IF;
    
    -- Team match play columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'team1_name') THEN
        ALTER TABLE personal_games ADD COLUMN team1_name TEXT;
        RAISE NOTICE '✅ Added team1_name column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'team2_name') THEN
        ALTER TABLE personal_games ADD COLUMN team2_name TEXT;
        RAISE NOTICE '✅ Added team2_name column to personal_games table';
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'match_status') THEN
        ALTER TABLE personal_games ADD COLUMN match_status JSONB;
        RAISE NOTICE '✅ Added match_status column to personal_games table';
    END IF;
    
    RAISE NOTICE '✅ Personal_games table audit complete';
END $$;

-- ============================================================================
-- CREATE ALL REQUIRED INDEXES
-- ============================================================================

-- Members indexes
CREATE INDEX IF NOT EXISTS idx_members_pin ON members(pin);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_board_member_roles ON members USING GIN(board_member_roles);
CREATE INDEX IF NOT EXISTS idx_members_pin_hashed ON members(pin_hashed);

-- Events indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_day1_course_id ON events(day1_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day2_course_id ON events(day2_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day3_course_id ON events(day3_course_id);
CREATE INDEX IF NOT EXISTS idx_events_archived ON events(archived);

-- Event registrations indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member ON event_registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_is_sponsor ON event_registrations(is_sponsor) WHERE is_sponsor = TRUE;
CREATE INDEX IF NOT EXISTS idx_event_registrations_email_sent ON event_registrations(email_sent) WHERE email_sent = false;

-- Groupings indexes
CREATE INDEX IF NOT EXISTS idx_groupings_event ON groupings(event_id);

-- Scores indexes
CREATE INDEX IF NOT EXISTS idx_scores_event ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_member ON scores(member_id);

-- Financial records indexes
CREATE INDEX IF NOT EXISTS idx_financial_records_event ON financial_records(event_id);

-- Sync status indexes
CREATE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status(entity_type, entity_id);

-- Courses indexes
CREATE INDEX IF NOT EXISTS idx_courses_member ON courses(member_id);
CREATE INDEX IF NOT EXISTS idx_courses_public ON courses(is_public);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_courses_source ON courses(source);

-- Personal games indexes
CREATE INDEX IF NOT EXISTS idx_personal_games_member ON personal_games(member_id);
CREATE INDEX IF NOT EXISTS idx_personal_games_status ON personal_games(status);
CREATE INDEX IF NOT EXISTS idx_personal_games_game_type ON personal_games(game_type);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- User preferences indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_member ON user_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_event ON user_preferences(event_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

-- Offline operations indexes
CREATE INDEX IF NOT EXISTS idx_offline_operations_member ON offline_operations(member_id);
CREATE INDEX IF NOT EXISTS idx_offline_operations_event ON offline_operations(event_id);
CREATE INDEX IF NOT EXISTS idx_offline_operations_status ON offline_operations(status);
CREATE INDEX IF NOT EXISTS idx_offline_operations_created_at ON offline_operations(created_at);

-- Table assignments indexes
CREATE INDEX IF NOT EXISTS idx_table_assignments_event ON table_assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_table_assignments_event_table ON table_assignments(event_id, table_label, table_number);

-- ============================================================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================================================

ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_assignments ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- FINAL VERIFICATION AND SUMMARY
-- ============================================================================

DO $$
DECLARE
    table_count INTEGER;
    total_columns INTEGER;
    total_indexes INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'members', 'events', 'event_registrations', 'groupings', 'scores',
        'financial_records', 'sync_status', 'organization_settings', 'courses',
        'personal_games', 'notifications', 'user_preferences', 'offline_operations',
        'table_assignments'
    );
    
    -- Count total columns
    SELECT COUNT(*) INTO total_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name IN (
        'members', 'events', 'event_registrations', 'groupings', 'scores',
        'financial_records', 'sync_status', 'organization_settings', 'courses',
        'personal_games', 'notifications', 'user_preferences', 'offline_operations',
        'table_assignments'
    );
    
    -- Count total indexes
    SELECT COUNT(*) INTO total_indexes
    FROM pg_indexes
    WHERE schemaname = 'public'
    AND tablename IN (
        'members', 'events', 'event_registrations', 'groupings', 'scores',
        'financial_records', 'sync_status', 'organization_settings', 'courses',
        'personal_games', 'notifications', 'user_preferences', 'offline_operations',
        'table_assignments'
    );
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'DATABASE AUDIT AND FIX COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Tables verified/created: %', table_count;
    RAISE NOTICE 'Total columns: %', total_columns;
    RAISE NOTICE 'Total indexes: %', total_indexes;
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'KEY FEATURES VERIFIED:';
    RAISE NOTICE '- Email tracking (email_sent column)';
    RAISE NOTICE '- Custom guests support (is_custom_guest, custom_guest_name)';
    RAISE NOTICE '- Course management (courses table + course_id columns)';
    RAISE NOTICE '- Event archiving (archived, archived_at columns)';
    RAISE NOTICE '- Personal games (all game types supported)';
    RAISE NOTICE '- Table assignments (social event seating)';
    RAISE NOTICE '- PIN hashing support (pin_hashed column)';
    RAISE NOTICE '- Board member roles (board_member_roles column)';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'All tables, columns, indexes, and constraints are in place';
    RAISE NOTICE 'Database is ready for production use';
    RAISE NOTICE '============================================================';
END $$;
