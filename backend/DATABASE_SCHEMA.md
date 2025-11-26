# Database Schema Documentation

This document outlines the Supabase database schema for the golf tournament app with sync capabilities.

## Tables

### members
Stores all golf club members/players.

```sql
CREATE TABLE members (
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
```

### events
Stores tournament and social events.

```sql
CREATE TABLE events (
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
  last_synced_at TIMESTAMPTZ
);
```

### event_registrations
Tracks which members are registered for which events.

```sql
CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ DEFAULT NOW(),
  status TEXT DEFAULT 'registered' CHECK (status IN ('registered', 'confirmed', 'withdrawn')),
  payment_status TEXT CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  adjusted_handicap TEXT,
  number_of_guests INTEGER DEFAULT 0,
  guest_names TEXT,
  is_sponsor BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, member_id)
);
```

### groupings
Stores the player groupings for each day and hole.

```sql
CREATE TABLE groupings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  day INTEGER NOT NULL,
  hole INTEGER NOT NULL,
  slots JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(event_id, day, hole)
);
```

### scores
Stores player scores for each event.

```sql
CREATE TABLE scores (
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
```

### financial_records
Tracks all financial transactions for events.

```sql
CREATE TABLE financial_records (
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
```

### sync_status
Tracks when data was last synced from local to server.

```sql
CREATE TABLE sync_status (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  entity_type TEXT NOT NULL,
  entity_id UUID NOT NULL,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  synced_by UUID REFERENCES members(id),
  sync_version INTEGER DEFAULT 1,
  UNIQUE(entity_type, entity_id)
);
```

### personal_games
Stores personal games (casual rounds) for individual members.

```sql
CREATE TABLE personal_games (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  course_name TEXT NOT NULL,
  course_par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  players JSONB NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### notifications
Stores user notifications for various events.

```sql
CREATE TABLE notifications (
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
```

### user_preferences
Stores user-specific or event-specific preferences.

```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id UUID REFERENCES members(id) ON DELETE CASCADE,
  event_id UUID REFERENCES events(id) ON DELETE CASCADE,
  preference_key TEXT NOT NULL,
  preference_value JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(member_id, event_id, preference_key)
);
```

### offline_operations
Tracks offline operations that need to be synced when connection is restored.

```sql
CREATE TABLE offline_operations (
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
```

## Indexes

```sql
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
CREATE INDEX idx_personal_games_member ON personal_games(member_id);
CREATE INDEX idx_personal_games_status ON personal_games(status);
CREATE INDEX idx_notifications_member ON notifications(member_id);
CREATE INDEX idx_notifications_event ON notifications(event_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
CREATE INDEX idx_user_preferences_member ON user_preferences(member_id);
CREATE INDEX idx_user_preferences_event ON user_preferences(event_id);
CREATE INDEX idx_user_preferences_key ON user_preferences(preference_key);
CREATE INDEX idx_offline_operations_member ON offline_operations(member_id);
CREATE INDEX idx_offline_operations_event ON offline_operations(event_id);
CREATE INDEX idx_offline_operations_status ON offline_operations(status);
CREATE INDEX idx_offline_operations_created_at ON offline_operations(created_at);
```

## Row Level Security (RLS) Policies

Enable RLS on all tables and create policies for authenticated users.

```sql
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_status ENABLE ROW LEVEL SECURITY;

-- Allow read access to all authenticated users
CREATE POLICY "Allow read for all users" ON members FOR SELECT USING (true);
CREATE POLICY "Allow read for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Allow read for all users" ON event_registrations FOR SELECT USING (true);
CREATE POLICY "Allow read for all users" ON groupings FOR SELECT USING (true);
CREATE POLICY "Allow read for all users" ON scores FOR SELECT USING (true);
CREATE POLICY "Allow read for all users" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow read for all users" ON sync_status FOR SELECT USING (true);

-- Allow write access only to admins (implement based on your auth system)
-- These would need to check is_admin flag from members table
```

## Sync Strategy

1. **Initial Sync**: Admin syncs local data to server before tournament
2. **Status Check**: Players see sync status indicators showing when data was last updated
3. **Live Scoring**: Scores are pushed to server in real-time when event status is 'active'
4. **Conflict Resolution**: Server timestamp wins in case of conflicts
5. **Offline Support**: Local storage continues to work, syncs when connection restored
