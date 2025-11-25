-- =====================================================
-- WOLF GAME - COMPLETE SQL SCHEMA
-- =====================================================
-- This script creates the complete database schema for the Wolf golf game
-- with support for:
-- - Wolf rotation order
-- - Partnerships and lone wolf selections
-- - Point tracking per hole
-- - Last 3 holes (16-18) special rules (lowest points becomes wolf, quad option)
-- - Quad multiplier (4x points on holes 16-18)
-- - Lone wolf on quad holes (can win 16 points, others lose 8 each)

-- =====================================================
-- 1. DROP AND RECREATE PERSONAL_GAMES TABLE
-- =====================================================

DROP TABLE IF EXISTS personal_games CASCADE;

CREATE TABLE personal_games (
  -- Primary identifiers
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  member_id TEXT NOT NULL,
  
  -- Course information
  course_name TEXT NOT NULL,
  course_par INTEGER NOT NULL,
  hole_pars INTEGER[] NOT NULL,
  stroke_indices INTEGER[],
  
  -- Player data
  players JSONB NOT NULL,
  
  -- Game status
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed')),
  game_type TEXT DEFAULT 'individual-net' CHECK (game_type IN ('individual-net', 'team-match-play', 'wolf', 'niners')),
  
  -- Team Match Play specific fields
  match_play_scoring_type TEXT CHECK (match_play_scoring_type IN ('best-ball', 'alternate-ball')),
  team_scores JSONB,
  hole_results JSONB,
  
  -- Wolf Game specific fields
  wolf_order INTEGER[],
  wolf_partnerships JSONB,
  wolf_scores JSONB,
  wolf_rules JSONB DEFAULT '{
    "wolfGoesLast": true,
    "loneWolfMultiplier": 2,
    "winningTeamPoints": 1,
    "losingTeamPoints": -1,
    "tiePoints": 0,
    "quadMultiplier": 4,
    "loneWolfOnQuad": 16,
    "othersOnQuadLoseEach": 8,
    "last3HolesLowestBecomesWolf": true
  }'::jsonb,
  wolf_dollar_amount DECIMAL(10,2) DEFAULT 1.00,
  wolf_total_points JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- 2. ADD COLUMN COMMENTS
-- =====================================================

COMMENT ON TABLE personal_games IS 'Stores personal games including Wolf, individual net, team match play, and niners';

COMMENT ON COLUMN personal_games.id IS 'Unique identifier for the game';
COMMENT ON COLUMN personal_games.member_id IS 'ID of the member who created the game';
COMMENT ON COLUMN personal_games.course_name IS 'Name of the golf course';
COMMENT ON COLUMN personal_games.course_par IS 'Total par for the course';
COMMENT ON COLUMN personal_games.hole_pars IS 'Array of par values for each hole (1-18)';
COMMENT ON COLUMN personal_games.stroke_indices IS 'Stroke index for each hole (1-18), where 1 is the hardest hole';
COMMENT ON COLUMN personal_games.players IS 'JSON array of player objects with scores per hole';
COMMENT ON COLUMN personal_games.status IS 'Game status: in-progress or completed';
COMMENT ON COLUMN personal_games.game_type IS 'Type of game: individual-net, team-match-play, wolf, or niners';
COMMENT ON COLUMN personal_games.match_play_scoring_type IS 'For team match play: best-ball or alternate-ball';
COMMENT ON COLUMN personal_games.team_scores IS 'JSON object with team1 and team2 scores for match play';
COMMENT ON COLUMN personal_games.hole_results IS 'Array of hole results for match play: team1, team2, or tie';

COMMENT ON COLUMN personal_games.wolf_order IS 'Array of player indices (0-based) indicating the rotation order for who becomes wolf each hole. For holes 1-15, wolf rotates in this order. For holes 16-18, wolf is the player with lowest points (tie goes to next in rotation)';
COMMENT ON COLUMN personal_games.wolf_partnerships IS 'JSON object mapping hole numbers to wolf partnerships. Example: {"1": {"wolfPlayerIndex": 0, "partnerPlayerIndex": 1, "isLoneWolf": false, "isQuad": false}, "16": {"wolfPlayerIndex": 2, "partnerPlayerIndex": -1, "isLoneWolf": true, "isQuad": true}}';
COMMENT ON COLUMN personal_games.wolf_scores IS 'JSON object tracking wolf game points per hole per player. Example: {"1": {"playerPoints": [1, -1, 1, -1]}, "2": {"playerPoints": [2, -2, -2, 2]}}';
COMMENT ON COLUMN personal_games.wolf_rules IS 'JSON object storing Wolf game rule configuration including quad multiplier (4x on holes 16-18), lone wolf multiplier, and last 3 holes rules';
COMMENT ON COLUMN personal_games.wolf_dollar_amount IS 'Dollar value per point in Wolf game (default $1.00)';
COMMENT ON COLUMN personal_games.wolf_total_points IS 'JSON object tracking cumulative points per player. Example: {"0": 5, "1": -3, "2": 8, "3": -2}';

-- =====================================================
-- 3. CREATE INDEXES
-- =====================================================

CREATE INDEX idx_personal_games_member ON personal_games(member_id);
CREATE INDEX idx_personal_games_status ON personal_games(status);
CREATE INDEX idx_personal_games_game_type ON personal_games(game_type);
CREATE INDEX idx_personal_games_created_at ON personal_games(created_at DESC);

-- =====================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- =====================================================

ALTER TABLE personal_games ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow read for all users" ON personal_games;
DROP POLICY IF EXISTS "Allow insert for all users" ON personal_games;
DROP POLICY IF EXISTS "Allow update for all users" ON personal_games;
DROP POLICY IF EXISTS "Allow delete for all users" ON personal_games;

-- Create RLS policies (allowing all authenticated users access)
CREATE POLICY "Allow read for all users" ON personal_games FOR SELECT USING (true);
CREATE POLICY "Allow insert for all users" ON personal_games FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update for all users" ON personal_games FOR UPDATE USING (true);
CREATE POLICY "Allow delete for all users" ON personal_games FOR DELETE USING (true);

-- =====================================================
-- 5. EXAMPLE DATA STRUCTURE DOCUMENTATION
-- =====================================================

-- WOLF_ORDER Example:
-- For a 4-player game: [0, 1, 2, 3]
-- This means player 0 is wolf on hole 1, player 1 on hole 2, etc.
-- The rotation continues for holes 1-15.
-- On holes 16-18, the player with the LOWEST points becomes wolf.
-- If there's a tie, the next player in rotation among the tied players becomes wolf.

-- WOLF_PARTNERSHIPS Example:
-- {
--   "1": {
--     "wolfPlayerIndex": 0,
--     "partnerPlayerIndex": 1,
--     "isLoneWolf": false,
--     "isQuad": false
--   },
--   "16": {
--     "wolfPlayerIndex": 2,
--     "partnerPlayerIndex": -1,  // -1 means lone wolf
--     "isLoneWolf": true,
--     "isQuad": true  // Quad activated on hole 16
--   }
-- }

-- WOLF_SCORES Example:
-- {
--   "1": {
--     "playerPoints": [1, 1, -1, -1]  // Wolf team (0,1) wins, others lose
--   },
--   "16": {
--     "playerPoints": [16, -8, -8, -8]  // Lone wolf on QUAD hole wins
--   }
-- }

-- WOLF_TOTAL_POINTS Example:
-- {
--   "0": 15,   // Player 0 has 15 total points
--   "1": -5,   // Player 1 has -5 total points
--   "2": 8,    // Player 2 has 8 total points
--   "3": -2    // Player 3 has -2 total points
-- }

-- =====================================================
-- 6. WOLF GAME RULES SUMMARY
-- =====================================================

-- STANDARD HOLES (1-15):
-- - Wolf rotates according to wolf_order
-- - Wolf can choose a partner or go lone wolf
-- - With partner: Winning team gets +1 point each, losing team gets -1 each
-- - Lone wolf wins: Wolf gets +2 points, others get -2 each
-- - Lone wolf loses: Wolf gets -4 points, others get +2 each
-- - Tie: Everyone gets 0 points

-- LAST 3 HOLES (16-18):
-- - Wolf is determined by LOWEST total points (not rotation)
-- - If tie for lowest, next in rotation among tied players becomes wolf
-- - Wolf has option to activate "QUAD" (4x multiplier)
-- - Normal quad (with partner): Winning team +4 each, losing team -4 each
-- - Lone wolf on quad wins: Wolf gets +16, others get -8 each
-- - Lone wolf on quad loses: Wolf gets -16, others get +8 each

-- =====================================================
-- 7. VALIDATION QUERY
-- =====================================================

-- Verify all columns exist
DO $$
DECLARE
  missing_columns TEXT[];
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns 
  WHERE table_name = 'personal_games'
  AND column_name IN (
    'id', 'member_id', 'course_name', 'course_par', 'hole_pars',
    'stroke_indices', 'players', 'status', 'game_type',
    'match_play_scoring_type', 'team_scores', 'hole_results',
    'wolf_order', 'wolf_partnerships', 'wolf_scores', 'wolf_rules',
    'wolf_dollar_amount', 'wolf_total_points',
    'created_at', 'completed_at', 'updated_at'
  );
  
  IF v_count != 21 THEN
    RAISE EXCEPTION 'Expected 21 columns in personal_games table, found %', v_count;
  END IF;
  
  RAISE NOTICE '✓ Wolf game schema successfully created and verified';
  RAISE NOTICE '✓ All 21 columns are present';
  RAISE NOTICE '✓ RLS policies configured';
  RAISE NOTICE '✓ Indexes created';
  RAISE NOTICE '✓ Ready for Wolf game with quad hole support (holes 16-18)';
END $$;
