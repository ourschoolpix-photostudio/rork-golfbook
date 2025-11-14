# Backend Sync System

This document explains how the backend sync system works in the golf tournament app.

## Overview

The app uses a hybrid approach: local-first storage with backend syncing capabilities. This allows the app to work offline while enabling real-time data sharing when connected.

## Architecture

### Local Storage (AsyncStorage)
- All data is stored locally on each device using AsyncStorage
- The app works fully offline
- Admins can make changes locally without internet connection

### Backend (Supabase + tRPC)
- Supabase PostgreSQL database stores synced data
- tRPC provides type-safe API routes for sync operations
- Data flows: Local → Server (via sync) and Server → Local (via fetch)

## How Syncing Works

### 1. Admin Syncs Data to Server

Before a tournament, admins use the "Sync" button to upload:
- **Members**: All player profiles, handicaps, contact info
- **Events**: Tournament details, dates, courses, settings
- **Registrations**: Which players are registered for which events
- **Groupings**: Player pairings and tee times (optional)

**Process:**
1. Admin clicks "Sync All Data" or "Sync Event" button
2. Local data is packaged and sent to tRPC endpoints
3. Server upserts data to Supabase (updates existing, inserts new)
4. `sync_status` table records when each entity was last synced
5. Sync completion confirmation shown to admin

### 2. Players See Sync Status

All users see sync status indicators showing:
- ✅ **Synced recently** (green): Data synced < 1 hour ago
- ⏰ **Synced** (yellow): Data synced > 1 hour ago  
- ❌ **Not synced** (red): No sync record found

**What this means:**
- If status shows "Not synced yet", players see only local data
- Once synced, players can fetch latest server data
- Players don't need to sync - only admins sync data to server

### 3. Live Scoring (Real-time)

During active tournaments, scores are pushed to server immediately:

**Scoring Permissions:**
- **Admins**: Can score anytime, regardless of event status
- **Players**: Can only score when event status = "active"
- **Locked**: Once status = "complete", only admins can modify scores

**Process:**
1. Player enters scores in scoring screen
2. Scores save locally (works offline)
3. If online, scores automatically sync to server via `trpc.sync.scores.submit`
4. Other players fetch updated scores from server
5. Leaderboard calculates using latest server scores

## Database Schema

See `backend/DATABASE_SCHEMA.md` for complete schema documentation.

**Key Tables:**
- `members` - Player profiles and handicaps
- `events` - Tournament information
- `event_registrations` - Player signups
- `groupings` - Player pairings by day/hole
- `scores` - Player scores by event/day/hole
- `sync_status` - Tracks last sync timestamp

## tRPC API Routes

All routes are under `trpc.sync.*`:

### Members
- `trpc.sync.members.sync` - Upload all members to server
- `trpc.sync.members.get` - Fetch all members from server
- `trpc.sync.members.syncStatus` - Check last sync time

### Events
- `trpc.sync.events.sync` - Upload event to server  
- `trpc.sync.events.get` - Fetch all events from server

### Groupings
- `trpc.sync.groupings.sync` - Upload groupings for an event
- `trpc.sync.groupings.get` - Fetch groupings for an event

### Scores
- `trpc.sync.scores.submit` - Submit a player's score
- `trpc.sync.scores.getAll` - Get all scores for an event
- `trpc.sync.scores.getPlayer` - Get specific player's score

### Sync Status
- `trpc.sync.status` - Get sync status for any entity type

## Usage Examples

### Admin: Sync All Tournament Data

\`\`\`typescript
import { trpc } from '@/lib/trpc';

// In admin screen, import SyncButton component
import { SyncButton, SyncStatusIndicator } from '@/components/SyncButton';

// Add to your component
<View>
  <SyncStatusIndicator />
  <SyncButton /> // Syncs all data
</View>

// Or sync specific event
<SyncButton eventId={event.id} />
\`\`\`

### Player: Check Sync Status

\`\`\`typescript
import { SyncStatusIndicator } from '@/components/SyncButton';

// Show sync status for current event
<SyncStatusIndicator eventId={eventId} />

// Show sync status for all members
<SyncStatusIndicator />
\`\`\`

### Live Scoring

\`\`\`typescript
const submitScoreMutation = trpc.sync.scores.submit.useMutation();

// Submit score when player finishes hole
await submitScoreMutation.mutateAsync({
  eventId: event.id,
  memberId: player.id,
  day: currentDay,
  holes: holeScores, // array of 18 numbers
  totalScore: totalScore,
  submittedBy: currentUser.id,
});
\`\`\`

### Fetch Latest Scores

\`\`\`typescript
const scoresQuery = trpc.sync.scores.getAll.useQuery({
  eventId: event.id,
});

// scores automatically refresh
const latestScores = scoresQuery.data;
\`\`\`

## Workflow: Tournament Day

**Before Tournament:**
1. Admin creates event locally
2. Admin adds/updates player info locally  
3. Admin registers players locally
4. Admin creates groupings locally
5. **Admin clicks "Sync All Data"** ✨
6. Server now has all tournament data

**During Tournament:**
7. Players open app, see green sync status
8. Admin changes event status to "active"  
9. Players can now score
10. Each score automatically pushes to server
11. Leaderboard updates in real-time for all players

**After Tournament:**
12. Admin changes event status to "complete"
13. Scores locked for regular players
14. Admin can still make corrections
15. Final leaderboard and stats available

## Offline Behavior

**No Internet Connection:**
- All local features work normally
- Sync button shows "offline" state
- Scores save locally, sync when connection restored
- Sync status shows last known sync time

## Future Enhancements

Potential improvements:
- [ ] Auto-sync on app launch if data is stale
- [ ] Push notifications when admin syncs new data
- [ ] Conflict resolution for simultaneous edits
- [ ] Incremental sync (only changed data)
- [ ] Background sync using background tasks
- [ ] Realtime subscriptions for live scoring updates

## Troubleshooting

**Sync fails:**
- Check internet connection
- Verify Supabase credentials in `.env`
- Check browser console for error messages
- Ensure user is admin (only admins can sync)

**Players don't see updated data:**
- Verify admin has clicked "Sync"
- Check sync status indicator
- Try refreshing the screen
- Ensure players have internet connection

**Scores not updating:**
- Verify event status is "active"
- Check if user is admin (admins can always score)
- Ensure internet connection for real-time sync
- Scores save locally even if sync fails

## Security Notes

- RLS (Row Level Security) policies control data access
- Admin status checked before allowing sync operations
- PIN verification required for sensitive operations
- All API calls include user authentication context
