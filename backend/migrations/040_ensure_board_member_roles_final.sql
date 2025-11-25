-- Ensure board_member_roles column exists in members table
DO $$ 
BEGIN
  -- Add board_member_roles column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'members' 
    AND column_name = 'board_member_roles'
  ) THEN
    ALTER TABLE members ADD COLUMN board_member_roles text[] DEFAULT '{}';
    RAISE NOTICE 'Added board_member_roles column';
  ELSE
    RAISE NOTICE 'board_member_roles column already exists';
  END IF;
END $$;

-- Ensure all existing records have default empty array
UPDATE members 
SET board_member_roles = '{}' 
WHERE board_member_roles IS NULL;

-- Refresh the schema cache
NOTIFY pgrst, 'reload schema';
