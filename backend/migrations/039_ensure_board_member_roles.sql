-- Ensure board_member_roles column exists in members table
-- This migration refreshes the schema cache for this column

-- First, check if column exists and add it if it doesn't
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'members' 
        AND column_name = 'board_member_roles'
    ) THEN
        ALTER TABLE members 
        ADD COLUMN board_member_roles TEXT[] DEFAULT '{}';
        
        CREATE INDEX IF NOT EXISTS idx_members_board_member_roles 
        ON members USING GIN(board_member_roles);
        
        COMMENT ON COLUMN members.board_member_roles IS 'Array of board member roles: Admin, President, VP, Tournament Director, Handicap Director, Operations, Financer, Member Relations';
    END IF;
END $$;

-- Refresh the schema cache by running a simple query
SELECT board_member_roles FROM members LIMIT 1;

-- Update any NULL values to empty array
UPDATE members 
SET board_member_roles = '{}' 
WHERE board_member_roles IS NULL;
