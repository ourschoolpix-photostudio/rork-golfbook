# Team Match Play Implementation Complete! 🎉

## What's New

I've added comprehensive team match play functionality to your games:

### 1. Game Types
- **Individual Net Score** - Traditional individual scoring
- **Team Match Play** - Team-based hole-by-hole competition

### 2. Match Play Scoring Types
When creating a team match play game, you can choose:

#### Best Ball
- Best score from either team member wins the hole
- If scores are tied, the hole is halved

#### Alternate Ball  
- If any 2 players tie on a hole, the other players' scores determine the winner
- Adds strategic depth to team play

### 3. Team Features
- Assign players to Team 1 or Team 2
- Each player can receive strokes (handicap allowance)
- During scoring, use the "Use Stroke" button to deduct 1 from a player's gross score
- Real-time match score tracking (Team 1 vs Team 2)

### 4. Stroke Allocation
- Set strokes received for each player during game creation
- Mark when strokes are used on specific holes
- Net scores automatically calculated for match play

## Database Migration Required ⚠️

**IMPORTANT:** You need to run the migration to add team match play support to your database.

### How to Run Migration:

1. Open your **Supabase Dashboard**
2. Go to **SQL Editor**
3. Create a new query
4. Copy and paste the contents of `backend/migrations/025_add_team_match_play.sql`
5. Click **Run**

The migration adds:
- `game_type` column (individual-net or team-match-play)
- `match_play_scoring_type` column (best-ball or alternate-ball)
- `team_scores` column (tracks team wins)
- `hole_results` column (tracks each hole's result)

## Files Updated

### Types
- ✅ `types/index.ts` - Added team match play fields to PersonalGame and PersonalGamePlayer

### Components
- ✅ `components/CreateGameModal.tsx` - Complete redesign with:
  - Game type selector
  - Match play scoring type selector
  - Team assignment UI
  - Stroke allocation inputs

### Screens
- ✅ `app/(game)/[gameId]/scoring.tsx` - Complete rewrite with:
  - Team-based scoring UI
  - Stroke tracking per hole
  - Net score calculations
  - Match play result tracking
  - Real-time team scoreboard

### Context
- ✅ `contexts/GamesContext.tsx` - Updated to pass new game type parameters

### Backend
- ✅ `backend/trpc/routes/games/crud/route.ts` - Updated to handle:
  - Game type storage
  - Team scores tracking
  - Hole results storage
  - Strokes received per player

### Database
- ✅ `backend/migrations/025_add_team_match_play.sql` - New migration

## How to Use

### Creating a Team Match Play Game

1. Tap "Create Game" on Games screen
2. Select **Team Match Play** as game type
3. Choose scoring type:
   - **Best Ball** - Simple best score wins
   - **Alternate Ball** - Strategic scoring with tie resolution
4. Enter course information (or select saved course)
5. Add 2 or 4 players (must be even number)
6. For each player:
   - Assign to Team 1 or Team 2
   - Set strokes received (0 if no handicap allowance)
7. Create game!

### Scoring a Match Play Game

1. Navigate through holes using arrow buttons
2. Enter gross scores for each player using +/- buttons
3. If a player receives strokes on a hole, tap **"Use Stroke"**
   - This deducts 1 from their gross score
   - Net score is displayed below the gross score
4. Hole result is calculated automatically based on net scores
5. Team scoreboard at top shows running match score
6. Save scores when complete

### Match Play Scoring Logic

#### Best Ball Mode
- Team 1: Players score 4 and 5 → Best is 4
- Team 2: Players score 4 and 6 → Best is 4
- Result: **Tie** (halved hole)

#### Alternate Ball Mode
- Team 1: Players score 4 and 5
- Team 2: Players score 4 and 6
- Both teams have a player with 4 (tied)
- Remaining scores: Team 1 has 5, Team 2 has 6
- Result: **Team 1 wins** (5 beats 6)

## Testing Checklist

- [ ] Run database migration in Supabase
- [ ] Create an individual net score game (existing functionality)
- [ ] Create a team match play game with 2 players
- [ ] Create a team match play game with 4 players
- [ ] Test best ball scoring
- [ ] Test alternate ball scoring
- [ ] Use stroke allocation during scoring
- [ ] Verify team scoreboard updates correctly
- [ ] Complete a game and view scorecard

## Next Steps

You mentioned you'll add rules for other game types next. When you're ready, we can add:
- Stroke play variants
- Stableford scoring
- Nassau betting games
- Skins games
- And more!

The architecture is now set up to support multiple game types easily. 🎯
