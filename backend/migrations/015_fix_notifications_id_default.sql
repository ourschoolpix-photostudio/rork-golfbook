-- Migration 015: Fix notifications table to auto-generate IDs

-- Add default UUID generation for notifications id column
ALTER TABLE notifications 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

-- Also fix any other tables that might have the same issue
ALTER TABLE personal_games 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE user_preferences 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;

ALTER TABLE offline_operations 
ALTER COLUMN id SET DEFAULT gen_random_uuid()::text;
