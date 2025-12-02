-- Fix event_registrations table to ensure id has DEFAULT uuid_generate_v4()
-- This migration ensures the id column can auto-generate UUIDs

-- First ensure UUID extension is enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Check and fix the event_registrations table
DO $$
BEGIN
    -- Drop the default if it exists and recreate it
    ALTER TABLE event_registrations ALTER COLUMN id SET DEFAULT uuid_generate_v4();
    
    RAISE NOTICE 'Successfully set DEFAULT uuid_generate_v4() on event_registrations.id';
END $$;
