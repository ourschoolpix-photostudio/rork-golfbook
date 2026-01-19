-- Enable replica identity for realtime to work properly with DELETE operations
-- This ensures Supabase sends the full row data in DELETE events

ALTER TABLE event_registrations REPLICA IDENTITY FULL;
ALTER TABLE events REPLICA IDENTITY FULL;
ALTER TABLE groupings REPLICA IDENTITY FULL;
ALTER TABLE scores REPLICA IDENTITY FULL;
ALTER TABLE members REPLICA IDENTITY FULL;

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE event_registrations;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE groupings;
ALTER PUBLICATION supabase_realtime ADD TABLE scores;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
