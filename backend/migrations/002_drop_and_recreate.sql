-- MIGRATION: Drop existing tables and recreate with TEXT IDs
-- This migration fixes the ID type mismatch between app (string) and database (UUID)
-- Run this in Supabase SQL Editor

-- ============================================================
-- DROP EXISTING TABLES IN REVERSE ORDER (to handle foreign keys)
-- ============================================================
DROP TABLE IF EXISTS sync_status CASCADE;
DROP TABLE IF EXISTS financial_records CASCADE;
DROP TABLE IF EXISTS scores CASCADE;
DROP TABLE IF EXISTS groupings CASCADE;
DROP TABLE IF EXISTS event_registrations CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS members CASCADE;

-- ============================================================
-- RECREATE MEMBERS TABLE WITH TEXT ID
-- ============================================================
CREATE TABLE members (
  id TEXT PRIMARY KEY,
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

-- ============================================================
-- RECREATE EVENTS TABLE WITH TEXT ID
-- ============================================================
CREATE TABLE events (
  id TEXT PRIMARY KEY,
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
  created_by TEXT REFERENCES members(id),
  type TEXT DEFAULT 'tournament' CHECK (type IN ('tournament', 'social')),
  photo_url TEXT,
  entry_fee TEXT,
  number_of_days INTEGER CHECK (number_of_days IN (1, 2, 3)),
  address TEXT,
  city TEXT,
  state TEXT,
  zipcode TEXT,
  
  day1_start_time TEXT,
  day1_start_period TEXT CHECK (day1_start_period IN ('AM', 'PM')),
  day1_course TEXT,
  day1_start_type TEXT CHECK (day1_start_type IN ('tee-time', 'shotgun')),
  day1_leading_hole TEXT,
  day1_par TEXT,
  day1_hole_pars TEXT[],
  
  day2_start_time TEXT,
  day2_start_period TEXT CHECK (day2_start_period IN ('AM', 'PM')),
  day2_course TEXT,
  day2_start_type TEXT CHECK (day2_start_type IN ('tee-time', 'shotgun')),
  day2_leading_hole TEXT,
  day2_par TEXT,
  day2_hole_pars TEXT[],
  
  day3_start_time TEXT,
  day3_start_period TEXT CHECK (day3_start_period IN ('AM', 'PM')),
  day3_course TEXT,
  day3_start_type TEXT CHECK (day3_start_type IN ('tee-time', 'shotgun')),
  day3_leading_hole TEXT,
  day3_par TEXT,
  day3_hole_pars TEXT[],
  
  flight_a_cutoff TEXT,
  flight_b_cutoff TEXT,
  flight_a_teebox TEXT,
  flight_b_teebox TEXT,
  flight_l_teebox TEXT,
  
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
  
  low_gross_trophy BOOLEAN DEFAULT false,
  low_gross_cash_prize TEXT,
  closest_to_pin TEXT,
  
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_synced_at TIMESTAMPTZ
);

-- ============================================================
-- RECREATE EVENT REGISTRATIONS TABLE WITH TEXT IDS
-- ============================================================
CREATE TABLE event_registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'withdrawn')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);

-- ============================================================
-- RECREATE GROUPINGS TABLE WITH TEXT IDS
-- ============================================================
CREATE TABLE groupings (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  hole INTEGER NOT NULL,
  slots JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, day, hole)
);

-- ============================================================
-- RECREATE SCORES TABLE WITH TEXT IDS
-- ============================================================
CREATE TABLE scores (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  holes JSONB NOT NULL,
  total_score INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  submitted_by TEXT REFERENCES members(id),
  UNIQUE(event_id, member_id, day)
);

-- ============================================================
-- RECREATE FINANCIAL RECORDS TABLE WITH TEXT IDS
-- ============================================================
CREATE TABLE financial_records (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id TEXT REFERENCES members(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('registration', 'prize', 'expense', 'income', 'other')),
  amount DECIMAL NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- RECREATE SYNC STATUS TABLE WITH TEXT IDS
-- ============================================================
CREATE TABLE sync_status (
  id TEXT PRIMARY KEY,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  synced_by TEXT REFERENCES members(id),
  sync_version BIGINT DEFAULT 1,
  UNIQUE(entity_type, entity_id)
);

-- ============================================================
-- RECREATE INDEXES
-- ============================================================
CREATE INDEX idx_members_pin ON members(pin);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(date);
CREATE INDEX idx_event_registrations_event ON event_registrations(event_id);
CREATE INDEX idx_event_registrations_member ON event_registrations(member_id);
CREATE INDEX idx_groupings_event ON groupings(event_id);
CREATE INDEX idx_scores_event ON scores(event_id);
CREATE INDEX idx_scores_member ON scores(member_id);
CREATE INDEX idx_financial_records_event ON financial_records(event_id);
CREATE INDEX idx_sync_status_entity ON sync_status(entity_type, entity_id);

-- ============================================================
-- ENABLE ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- CREATE PERMISSIVE POLICIES
-- ============================================================
CREATE POLICY "Allow read for all users" ON members FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON members FOR ALL USING (true);

CREATE POLICY "Allow read for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON events FOR ALL USING (true);

CREATE POLICY "Allow read for all users" ON event_registrations FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON event_registrations FOR ALL USING (true);

CREATE POLICY "Allow read for all users" ON groupings FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON groupings FOR ALL USING (true);

CREATE POLICY "Allow read for all users" ON scores FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON scores FOR ALL USING (true);

CREATE POLICY "Allow read for all users" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON financial_records FOR ALL USING (true);

CREATE POLICY "Allow read for all users" ON sync_status FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON sync_status FOR ALL USING (true);

-- ============================================================
-- MIGRATION COMPLETED
-- ============================================================
-- All tables have been recreated with TEXT IDs
-- You can now sync your app data to Supabase successfully
