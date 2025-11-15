-- Add board_member_roles column to members table
-- This stores an array of roles that a member can have
-- Possible roles: Admin, President, VP, Tournament Director, Handicap Director, Operations, Financer, Member Relations

ALTER TABLE members 
ADD COLUMN board_member_roles TEXT[] DEFAULT '{}';

-- Create an index for faster querying of members by role
CREATE INDEX idx_members_board_member_roles ON members USING GIN(board_member_roles);

-- Add a comment to document the column
COMMENT ON COLUMN members.board_member_roles IS 'Array of board member roles: Admin, President, VP, Tournament Director, Handicap Director, Operations, Financer, Member Relations';
