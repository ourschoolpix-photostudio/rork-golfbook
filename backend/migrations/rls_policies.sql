-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for all users" ON members;
DROP POLICY IF EXISTS "Allow insert for all users" ON members;
DROP POLICY IF EXISTS "Allow update for admins" ON members;
DROP POLICY IF EXISTS "Allow delete for admins" ON members;

DROP POLICY IF EXISTS "Allow read for all users" ON events;
DROP POLICY IF EXISTS "Allow insert for admins" ON events;
DROP POLICY IF EXISTS "Allow update for admins" ON events;
DROP POLICY IF EXISTS "Allow delete for admins" ON events;

DROP POLICY IF EXISTS "Allow read for all users" ON event_registrations;
DROP POLICY IF EXISTS "Allow insert for all users" ON event_registrations;
DROP POLICY IF EXISTS "Allow update for admins or own registration" ON event_registrations;
DROP POLICY IF EXISTS "Allow delete for admins or own registration" ON event_registrations;

DROP POLICY IF EXISTS "Allow read for all users" ON groupings;
DROP POLICY IF EXISTS "Allow insert for admins" ON groupings;
DROP POLICY IF EXISTS "Allow update for admins" ON groupings;
DROP POLICY IF EXISTS "Allow delete for admins" ON groupings;

DROP POLICY IF EXISTS "Allow read for all users" ON scores;
DROP POLICY IF EXISTS "Allow insert for all users" ON scores;
DROP POLICY IF EXISTS "Allow update for admins or scorer" ON scores;
DROP POLICY IF EXISTS "Allow delete for admins" ON scores;

DROP POLICY IF EXISTS "Allow read for admins" ON financial_records;
DROP POLICY IF EXISTS "Allow insert for admins" ON financial_records;
DROP POLICY IF EXISTS "Allow update for admins" ON financial_records;
DROP POLICY IF EXISTS "Allow delete for admins" ON financial_records;

DROP POLICY IF EXISTS "Allow read own games" ON personal_games;
DROP POLICY IF EXISTS "Allow insert own games" ON personal_games;
DROP POLICY IF EXISTS "Allow update own games" ON personal_games;
DROP POLICY IF EXISTS "Allow delete own games" ON personal_games;

DROP POLICY IF EXISTS "Allow read own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow insert for admins" ON notifications;
DROP POLICY IF EXISTS "Allow update own notifications" ON notifications;
DROP POLICY IF EXISTS "Allow delete for admins" ON notifications;

DROP POLICY IF EXISTS "Allow read own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow insert own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow update own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Allow delete own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Allow read own operations" ON offline_operations;
DROP POLICY IF EXISTS "Allow insert own operations" ON offline_operations;
DROP POLICY IF EXISTS "Allow update own operations" ON offline_operations;
DROP POLICY IF EXISTS "Allow delete own operations" ON offline_operations;

DROP POLICY IF EXISTS "Allow read for all users" ON courses;
DROP POLICY IF EXISTS "Allow insert for admins" ON courses;
DROP POLICY IF EXISTS "Allow update for admins" ON courses;
DROP POLICY IF EXISTS "Allow delete for admins" ON courses;

DROP POLICY IF EXISTS "Allow read for all users" ON custom_guests;
DROP POLICY IF EXISTS "Allow insert for all users" ON custom_guests;
DROP POLICY IF EXISTS "Allow update for admins" ON custom_guests;
DROP POLICY IF EXISTS "Allow delete for admins or own registration" ON custom_guests;

-- Enable Row Level Security on all tables
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE events ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE groupings ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE offline_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_guests ENABLE ROW LEVEL SECURITY;

-- Members table policies
CREATE POLICY "Allow read for all users" ON members FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for admins" ON members FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
  OR members.id = auth.uid()
);
CREATE POLICY "Allow delete for admins" ON members FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- Events table policies
CREATE POLICY "Allow read for all users" ON events FOR SELECT USING (true);
CREATE POLICY "Allow insert for admins" ON events FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow update for admins" ON events FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow delete for admins" ON events FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- Event registrations policies
CREATE POLICY "Allow read for all users" ON event_registrations FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON event_registrations FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for admins or own registration" ON event_registrations FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
  OR event_registrations.member_id = auth.uid()
);
CREATE POLICY "Allow delete for admins or own registration" ON event_registrations FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
  OR event_registrations.member_id = auth.uid()
);

-- Groupings policies
CREATE POLICY "Allow read for all users" ON groupings FOR SELECT USING (true);
CREATE POLICY "Allow insert for admins" ON groupings FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow update for admins" ON groupings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow delete for admins" ON groupings FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- Scores policies
CREATE POLICY "Allow read for all users" ON scores FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON scores FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for admins or scorer" ON scores FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
  OR scores.submitted_by = auth.uid()
  OR scores.member_id = auth.uid()
);
CREATE POLICY "Allow delete for admins" ON scores FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- Financial records policies
CREATE POLICY "Allow read for admins" ON financial_records FOR SELECT USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow insert for admins" ON financial_records FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow update for admins" ON financial_records FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow delete for admins" ON financial_records FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- Personal games policies
CREATE POLICY "Allow read own games" ON personal_games FOR SELECT USING (
  personal_games.member_id = auth.uid()
);
CREATE POLICY "Allow insert own games" ON personal_games FOR INSERT WITH CHECK (
  personal_games.member_id = auth.uid()
);
CREATE POLICY "Allow update own games" ON personal_games FOR UPDATE USING (
  personal_games.member_id = auth.uid()
);
CREATE POLICY "Allow delete own games" ON personal_games FOR DELETE USING (
  personal_games.member_id = auth.uid()
);

-- Notifications policies
CREATE POLICY "Allow read own notifications" ON notifications FOR SELECT USING (
  notifications.member_id = auth.uid()
);
CREATE POLICY "Allow insert for admins" ON notifications FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow update own notifications" ON notifications FOR UPDATE USING (
  notifications.member_id = auth.uid()
);
CREATE POLICY "Allow delete for admins" ON notifications FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- User preferences policies
CREATE POLICY "Allow read own preferences" ON user_preferences FOR SELECT USING (
  user_preferences.member_id = auth.uid()
);
CREATE POLICY "Allow insert own preferences" ON user_preferences FOR INSERT WITH CHECK (
  user_preferences.member_id = auth.uid()
);
CREATE POLICY "Allow update own preferences" ON user_preferences FOR UPDATE USING (
  user_preferences.member_id = auth.uid()
);
CREATE POLICY "Allow delete own preferences" ON user_preferences FOR DELETE USING (
  user_preferences.member_id = auth.uid()
);

-- Offline operations policies
CREATE POLICY "Allow read own operations" ON offline_operations FOR SELECT USING (
  offline_operations.member_id = auth.uid()
);
CREATE POLICY "Allow insert own operations" ON offline_operations FOR INSERT WITH CHECK (
  offline_operations.member_id = auth.uid()
);
CREATE POLICY "Allow update own operations" ON offline_operations FOR UPDATE USING (
  offline_operations.member_id = auth.uid()
);
CREATE POLICY "Allow delete own operations" ON offline_operations FOR DELETE USING (
  offline_operations.member_id = auth.uid()
);

-- Courses policies
CREATE POLICY "Allow read for all users" ON courses FOR SELECT USING (true);
CREATE POLICY "Allow insert for admins" ON courses FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow update for admins" ON courses FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow delete for admins" ON courses FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);

-- Custom guests policies
CREATE POLICY "Allow read for all users" ON custom_guests FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON custom_guests FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for admins" ON custom_guests FOR UPDATE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
);
CREATE POLICY "Allow delete for admins or own registration" ON custom_guests FOR DELETE USING (
  EXISTS (SELECT 1 FROM members WHERE members.id = auth.uid() AND members.is_admin = true)
  OR custom_guests.event_id IN (
    SELECT event_id FROM event_registrations WHERE member_id = auth.uid()
  )
);
