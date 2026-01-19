-- Fix: Only set replica identity without adding to publication again
-- This ensures Supabase sends the full row data in DELETE events

ALTER TABLE event_registrations REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE groupings REPLICA IDENTITY FULL;
ALTER TABLE scores REPLICA IDENTITY FULL;
ALTER TABLE members REPLICA IDENTITY FULL;
ALTER TABLE alerts REPLICA IDENTITY FULL;
ALTER TABLE table_assignments REPLICA IDENTITY FULL;
ALTER TABLE courses REPLICA IDENTITY FULL;
