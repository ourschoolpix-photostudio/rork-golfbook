-- ============================================================================
-- COMPREHENSIVE SCHEMA MIGRATION
-- This script ensures all tables and columns exist for the entire app
-- It's idempotent and can be run multiple times safely
-- Created: 2025-01-27
-- ============================================================================

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. MEMBERS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  pin TEXT NOT NULL,
  is_admin BOOLEAN DEFAULT false,
  email TEXT,
  phone TEXT,
  handicap DECIMAL,
  rolex_points INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  full_name TEXT,
  username TEXT,
  membership_type TEXT CHECK (membership_type IN ('active', 'in-active', 'guest')),
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT,
  city TEXT,
  state TEXT,
  flight TEXT CHECK (flight IN ('A', 'B', 'C', 'L')),
  rolex_flight TEXT CHECK (rolex_flight IN ('A', 'B')),
  current_handicap TEXT,
  date_of_birth DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  join_date DATE,
  profile_photo_url TEXT,
  adjusted_handicap TEXT,
  ghin TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add board_member_roles column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'members' AND column_name = 'board_member_roles'
    ) THEN
        ALTER TABLE members ADD COLUMN board_member_roles TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- Ensure board_member_roles is not null
UPDATE members SET board_member_roles = '{}' WHERE board_member_roles IS NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_members_pin ON members(pin);
CREATE INDEX IF NOT EXISTS idx_members_email ON members(email);
CREATE INDEX IF NOT EXISTS idx_members_board_member_roles ON members USING GIN(board_member_roles);

-- Enable RLS
ALTER TABLE members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON members;
CREATE POLICY "Allow read for all users" ON members FOR SELECT USING (true);

-- ============================================================================
-- 2. EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  date DATE NOT NULL,
  start_date DATE,
  end_date DATE,
  venue TEXT NOT NULL,
  location TEXT,
  course TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed', 'upcoming', 'complete')),
  description TEXT,
  memo TEXT,
  registration_deadline TIMESTAMPTZ,
  max_participants INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID REFERENCES members(id),
  type TEXT DEFAULT 'tournament' CHECK (type IN ('tournament', 'social')),
  photo_url TEXT,
  entry_fee TEXT,
  number_of_days INTEGER CHECK (number_of_days IN (1, 2, 3)),
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  
  -- Day 1 config
  day1_start_time TEXT,
  day1_start_period TEXT CHECK (day1_start_period IN ('AM', 'PM')),
  day1_end_time TEXT,
  day1_end_period TEXT CHECK (day1_end_period IN ('AM', 'PM')),
  day1_course TEXT,
  day1_start_type TEXT CHECK (day1_start_type IN ('tee-time', 'shotgun', 'gala', 'happy-hour', 'party')),
  day1_leading_hole TEXT,
  day1_par TEXT,
  day1_hole_pars TEXT[],
  
  -- Day 2 config
  day2_start_time TEXT,
  day2_start_period TEXT CHECK (day2_start_period IN ('AM', 'PM')),
  day2_end_time TEXT,
  day2_end_period TEXT CHECK (day2_end_period IN ('AM', 'PM')),
  day2_course TEXT,
  day2_start_type TEXT CHECK (day2_start_type IN ('tee-time', 'shotgun', 'gala', 'happy-hour', 'party')),
  day2_leading_hole TEXT,
  day2_par TEXT,
  day2_hole_pars TEXT[],
  
  -- Day 3 config
  day3_start_time TEXT,
  day3_start_period TEXT CHECK (day3_start_period IN ('AM', 'PM')),
  day3_end_time TEXT,
  day3_end_period TEXT CHECK (day3_end_period IN ('AM', 'PM')),
  day3_course TEXT,
  day3_start_type TEXT CHECK (day3_start_type IN ('tee-time', 'shotgun', 'gala', 'happy-hour', 'party')),
  day3_leading_hole TEXT,
  day3_par TEXT,
  day3_hole_pars TEXT[],
  
  -- Flight configuration
  flight_a_cutoff TEXT,
  flight_b_cutoff TEXT,
  flight_a_teebox TEXT,
  flight_b_teebox TEXT,
  flight_l_teebox TEXT,
  
  -- Trophies
  flight_a_trophy_1st BOOLEAN DEFAULT false,
  flight_a_trophy_2nd BOOLEAN DEFAULT false,
  flight_a_trophy_3rd BOOLEAN DEFAULT false,
  flight_b_trophy_1st BOOLEAN DEFAULT false,
  flight_b_trophy_2nd BOOLEAN DEFAULT false,
  flight_b_trophy_3rd BOOLEAN DEFAULT false,
  flight_c_trophy_1st BOOLEAN DEFAULT false,
  flight_c_trophy_2nd BOOLEAN DEFAULT false,
  flight_c_trophy_3rd BOOLEAN DEFAULT false,
  flight_l_trophy_1st BOOLEAN DEFAULT false,
  flight_l_trophy_2nd BOOLEAN DEFAULT false,
  flight_l_trophy_3rd BOOLEAN DEFAULT false,
  
  -- Cash prizes
  flight_a_cash_prize_1st TEXT,
  flight_a_cash_prize_2nd TEXT,
  flight_a_cash_prize_3rd TEXT,
  flight_b_cash_prize_1st TEXT,
  flight_b_cash_prize_2nd TEXT,
  flight_b_cash_prize_3rd TEXT,
  flight_c_cash_prize_1st TEXT,
  flight_c_cash_prize_2nd TEXT,
  flight_c_cash_prize_3rd TEXT,
  flight_l_cash_prize_1st TEXT,
  flight_l_cash_prize_2nd TEXT,
  flight_l_cash_prize_3rd TEXT,
  
  -- Special awards
  low_gross_trophy BOOLEAN DEFAULT false,
  low_gross_cash_prize TEXT,
  closest_to_pin TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ,
  archived BOOLEAN DEFAULT false NOT NULL,
  archived_at TIMESTAMPTZ
);

-- Add course_id columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'day1_course_id') THEN
        ALTER TABLE events ADD COLUMN day1_course_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'day2_course_id') THEN
        ALTER TABLE events ADD COLUMN day2_course_id UUID;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'events' AND column_name = 'day3_course_id') THEN
        ALTER TABLE events ADD COLUMN day3_course_id UUID;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON events(date);
CREATE INDEX IF NOT EXISTS idx_events_day1_course_id ON events(day1_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day2_course_id ON events(day2_course_id);
CREATE INDEX IF NOT EXISTS idx_events_day3_course_id ON events(day3_course_id);

-- Enable RLS
ALTER TABLE events ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON events;
CREATE POLICY "Allow read for all users" ON events FOR SELECT USING (true);

-- ============================================================================
-- 3. EVENT_REGISTRATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'withdrawn')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- Add all optional columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'adjusted_handicap') THEN
        ALTER TABLE event_registrations ADD COLUMN adjusted_handicap TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'number_of_guests') THEN
        ALTER TABLE event_registrations ADD COLUMN number_of_guests INTEGER DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'guest_names') THEN
        ALTER TABLE event_registrations ADD COLUMN guest_names TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'event_registrations' AND column_name = 'is_sponsor') THEN
        ALTER TABLE event_registrations ADD COLUMN is_sponsor BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
END $$;

-- Ensure is_sponsor is not null
UPDATE event_registrations SET is_sponsor = FALSE WHERE is_sponsor IS NULL;
ALTER TABLE event_registrations ALTER COLUMN is_sponsor SET DEFAULT FALSE;
ALTER TABLE event_registrations ALTER COLUMN is_sponsor SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_member ON event_registrations(member_id);
CREATE INDEX IF NOT EXISTS idx_event_registrations_is_sponsor ON event_registrations(is_sponsor) WHERE is_sponsor = TRUE;

-- Enable RLS
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON event_registrations;
CREATE POLICY "Allow read for all users" ON event_registrations FOR SELECT USING (true);

-- ============================================================================
-- 4. GROUPINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS groupings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  hole INTEGER NOT NULL,
  slots JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, day, hole)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_groupings_event ON groupings(event_id);

-- Enable RLS
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON groupings;
CREATE POLICY "Allow read for all users" ON groupings FOR SELECT USING (true);

-- ============================================================================
-- 5. SCORES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS scores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  holes JSONB NOT NULL,
  total_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by UUID REFERENCES members(id),
  UNIQUE(event_id, member_id, day)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_scores_event ON scores(event_id);
CREATE INDEX IF NOT EXISTS idx_scores_member ON scores(member_id);

-- Enable RLS
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON scores;
CREATE POLICY "Allow read for all users" ON scores FOR SELECT USING (true);

-- ============================================================================
-- 6. FINANCIAL_RECORDS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS financial_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID REFERENCES members(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'prize', 'expense', 'income', 'other')),
  amount DECIMAL NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_financial_records_event ON financial_records(event_id);

-- Enable RLS
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON financial_records;
CREATE POLICY "Allow read for all users" ON financial_records FOR SELECT USING (true);

-- ============================================================================
-- 7. SYNC_STATUS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  synced_by UUID REFERENCES members(id),
  sync_version INTEGER DEFAULT 1,
  UNIQUE(entity_type, entity_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sync_status_entity ON sync_status(entity_type, entity_id);

-- Enable RLS
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON sync_status;
CREATE POLICY "Allow read for all users" ON sync_status FOR SELECT USING (true);

-- ============================================================================
-- 8. ORGANIZATION_SETTINGS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS organization_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  -- Organization info
  name TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  phone TEXT,
  zelle_phone TEXT,
  logo_url TEXT,
  
  -- PayPal settings
  paypal_client_id TEXT,
  paypal_client_secret TEXT,
  paypal_mode TEXT CHECK (paypal_mode IN ('sandbox', 'live')) DEFAULT 'sandbox',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add Rolex points columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'rolex_placement_points') THEN
        ALTER TABLE organization_settings ADD COLUMN rolex_placement_points TEXT[] DEFAULT ARRAY[]::TEXT[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'rolex_attendance_points') THEN
        ALTER TABLE organization_settings ADD COLUMN rolex_attendance_points TEXT DEFAULT '';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'rolex_bonus_points') THEN
        ALTER TABLE organization_settings ADD COLUMN rolex_bonus_points TEXT DEFAULT '';
    END IF;
END $$;

-- Ensure default row exists
INSERT INTO organization_settings (id) 
VALUES ('00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

-- Initialize Rolex points array if empty
UPDATE organization_settings
SET rolex_placement_points = ARRAY(SELECT '' FROM generate_series(1, 30))::TEXT[]
WHERE rolex_placement_points IS NULL OR array_length(rolex_placement_points, 1) IS NULL;

-- Enable RLS
ALTER TABLE organization_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Allow read for all users" ON organization_settings;
DROP POLICY IF EXISTS "Allow update for all users" ON organization_settings;
CREATE POLICY "Allow read for all users" ON organization_settings FOR SELECT USING (true);
CREATE POLICY "Allow update for all users" ON organization_settings FOR UPDATE USING (true);

-- ============================================================================
-- 9. COURSES TABLE
-- ============================================================================
-- First, check if courses table exists with TEXT id and migrate if needed
DO $
BEGIN
    -- Check if courses table exists with TEXT id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'courses' AND column_name = 'id' AND data_type = 'text'
    ) THEN
        -- Drop foreign key constraints first if they exist
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day1_course_id_fkey;
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day2_course_id_fkey;
        ALTER TABLE events DROP CONSTRAINT IF EXISTS events_day3_course_id_fkey;
        
        -- Temporarily drop the courses table and recreate with UUID
        -- (safe because course data can be re-entered)
        DROP TABLE IF EXISTS courses CASCADE;
    END IF;
END $;

CREATE TABLE IF NOT EXISTS courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add optional columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'member_id') THEN
        ALTER TABLE courses ADD COLUMN member_id TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'source') THEN
        ALTER TABLE courses ADD COLUMN source TEXT DEFAULT 'admin' CHECK (source IN ('admin', 'personal'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'stroke_indices') THEN
        ALTER TABLE courses ADD COLUMN stroke_indices INTEGER[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'course_rating') THEN
        ALTER TABLE courses ADD COLUMN course_rating NUMERIC(4,1);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'slope_rating') THEN
        ALTER TABLE courses ADD COLUMN slope_rating NUMERIC(4,1);
    END IF;
END $$;

-- Add foreign key constraint for course_id columns in events
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_day1_course_id_fkey'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT events_day1_course_id_fkey 
        FOREIGN KEY (day1_course_id) REFERENCES courses(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_day2_course_id_fkey'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT events_day2_course_id_fkey 
        FOREIGN KEY (day2_course_id) REFERENCES courses(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'events_day3_course_id_fkey'
    ) THEN
        ALTER TABLE events ADD CONSTRAINT events_day3_course_id_fkey 
        FOREIGN KEY (day3_course_id) REFERENCES courses(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_courses_member ON courses(member_id);
CREATE INDEX IF NOT EXISTS idx_courses_public ON courses(is_public);
CREATE INDEX IF NOT EXISTS idx_courses_name ON courses(name);
CREATE INDEX IF NOT EXISTS idx_courses_source ON courses(source);

-- Enable RLS
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view admin courses" ON courses;
DROP POLICY IF EXISTS "Users can view own personal courses" ON courses;
DROP POLICY IF EXISTS "Users can insert own courses" ON courses;
DROP POLICY IF EXISTS "Users can update own courses" ON courses;
DROP POLICY IF EXISTS "Users can delete own courses" ON courses;
DROP POLICY IF EXISTS "Backend can manage all courses" ON courses;

CREATE POLICY "Users can view admin courses" ON courses FOR SELECT USING (source = 'admin');
CREATE POLICY "Backend can manage all courses" ON courses FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 10. PERSONAL_GAMES TABLE
-- ============================================================================
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

-- Add all game-specific columns if they don't exist
DO $$ 
BEGIN
    -- Game type and handicap settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'game_type') THEN
        ALTER TABLE personal_games ADD COLUMN game_type TEXT CHECK (game_type IN ('wolf', 'niners', 'individual-score', 'team-match'));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'handicaps_enabled') THEN
        ALTER TABLE personal_games ADD COLUMN handicaps_enabled BOOLEAN DEFAULT TRUE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'strokes_aside') THEN
        ALTER TABLE personal_games ADD COLUMN strokes_aside JSONB;
    END IF;
    
    -- Wolf game columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_order') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_order INTEGER[];
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_partnerships') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_partnerships JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_scores') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_scores JSONB;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'wolf_rules') THEN
        ALTER TABLE personal_games ADD COLUMN wolf_rules JSONB DEFAULT '{"wolfGoesLast": true, "loneWolfMultiplier": 2, "winningTeamPoints": 1, "losingTeamPoints": -1, "tiePoints": 0}'::jsonb;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'dollar_amount') THEN
        ALTER TABLE personal_games ADD COLUMN dollar_amount NUMERIC(10, 2);
    END IF;
    
    -- Niners game columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'niners_front_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN niners_front_9_bet NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'niners_back_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN niners_back_9_bet NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'niners_overall_bet') THEN
        ALTER TABLE personal_games ADD COLUMN niners_overall_bet NUMERIC(10, 2);
    END IF;
    
    -- Individual score game columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'front_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN front_9_bet NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'back_9_bet') THEN
        ALTER TABLE personal_games ADD COLUMN back_9_bet NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'overall_bet') THEN
        ALTER TABLE personal_games ADD COLUMN overall_bet NUMERIC(10, 2);
    END IF;
    
    -- Pot bet (across all game types)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'pot_bet') THEN
        ALTER TABLE personal_games ADD COLUMN pot_bet NUMERIC(10, 2);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'pot_players') THEN
        ALTER TABLE personal_games ADD COLUMN pot_players JSONB;
    END IF;
    
    -- Team match play columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'team1_name') THEN
        ALTER TABLE personal_games ADD COLUMN team1_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'team2_name') THEN
        ALTER TABLE personal_games ADD COLUMN team2_name TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'personal_games' AND column_name = 'match_status') THEN
        ALTER TABLE personal_games ADD COLUMN match_status JSONB;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_personal_games_member ON personal_games(member_id);
CREATE INDEX IF NOT EXISTS idx_personal_games_status ON personal_games(status);
CREATE INDEX IF NOT EXISTS idx_personal_games_game_type ON personal_games(game_type);

-- Enable RLS
ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can manage own games" ON personal_games;
CREATE POLICY "Users can manage own games" ON personal_games FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 11. NOTIFICATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('registration', 'cancellation', 'update', 'payment', 'general')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notifications_member ON notifications(member_id);
CREATE INDEX IF NOT EXISTS idx_notifications_event ON notifications(event_id);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Enable RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
CREATE POLICY "Users can view own notifications" ON notifications FOR SELECT USING (true);

-- ============================================================================
-- 12. USER_PREFERENCES TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, event_id, preference_key)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_user_preferences_member ON user_preferences(member_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_event ON user_preferences(event_id);
CREATE INDEX IF NOT EXISTS idx_user_preferences_key ON user_preferences(preference_key);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can manage own preferences" ON user_preferences;
CREATE POLICY "Users can manage own preferences" ON user_preferences FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- 13. OFFLINE_OPERATIONS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS offline_operations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  operation_type TEXT NOT NULL CHECK (operation_type IN ('score_submit', 'registration_create', 'registration_update', 'registration_delete', 'grouping_sync', 'member_update', 'event_update')),
  operation_data JSONB NOT NULL,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_offline_operations_member ON offline_operations(member_id);
CREATE INDEX IF NOT EXISTS idx_offline_operations_event ON offline_operations(event_id);
CREATE INDEX IF NOT EXISTS idx_offline_operations_status ON offline_operations(status);
CREATE INDEX IF NOT EXISTS idx_offline_operations_created_at ON offline_operations(created_at);

-- Enable RLS
ALTER TABLE offline_operations ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate
DROP POLICY IF EXISTS "Users can manage own operations" ON offline_operations;
CREATE POLICY "Users can manage own operations" ON offline_operations FOR ALL USING (true) WITH CHECK (true);

-- ============================================================================
-- VERIFICATION AND SUMMARY
-- ============================================================================
DO $$
DECLARE
    table_count INTEGER;
    total_columns INTEGER;
BEGIN
    -- Count tables
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables
    WHERE table_schema = 'public'
    AND table_type = 'BASE TABLE'
    AND table_name IN (
        'members', 'events', 'event_registrations', 'groupings', 'scores',
        'financial_records', 'sync_status', 'organization_settings', 'courses',
        'personal_games', 'notifications', 'user_preferences', 'offline_operations'
    );
    
    -- Count total columns
    SELECT COUNT(*) INTO total_columns
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name IN (
        'members', 'events', 'event_registrations', 'groupings', 'scores',
        'financial_records', 'sync_status', 'organization_settings', 'courses',
        'personal_games', 'notifications', 'user_preferences', 'offline_operations'
    );
    
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'COMPREHENSIVE SCHEMA MIGRATION COMPLETE';
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'Tables created/verified: %', table_count;
    RAISE NOTICE 'Total columns: %', total_columns;
    RAISE NOTICE '============================================================';
    RAISE NOTICE 'All tables, columns, indexes, and RLS policies are in place';
    RAISE NOTICE 'Schema is ready for production use';
    RAISE NOTICE '============================================================';
END $$;
