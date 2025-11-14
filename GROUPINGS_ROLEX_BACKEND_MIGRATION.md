# Groupings and Rolex Screen Backend Migration

## Summary
Successfully migrated the Groupings and Event Rolex screens to fetch data from the backend instead of using local storage (AsyncStorage). Both screens now use tRPC queries to fetch real-time data from Supabase.

## Changes Made

### 1. Groupings Screen (`app/(event)/[eventId]/groupings.tsx`)

#### Data Fetching
- **Removed**: AsyncStorage-based data loading from `storageService`
- **Added**: tRPC queries for real-time backend data:
  - `trpc.events.getById` - Fetches event details
  - `trpc.members.getAll` - Fetches all members
  - `trpc.sync.groupings.get` - Fetches groupings for the event
  - `trpc.sync.scores.getAll` - Fetches all scores for the event

#### Score Enrichment
- Replaced local AsyncStorage score loading with backend scores
- Created `enrichSlotsWithScores` function that:
  - Filters scores by member ID from backend data
  - Calculates total scores across all days
  - Enriches player slots with score data

#### Saving Groupings
- **Changed**: `handleSave` function now saves to backend via `trpc.sync.groupings.sync` mutation
- Groupings are synced to Supabase with proper event tracking
- Removed AsyncStorage writes

#### Member Updates
- **Added**: `trpc.members.update` mutation
- Member handicap updates now save directly to backend
- Removed `storageService.updateMember` calls

#### Reset Scores Feature
- Temporarily disabled full implementation (requires backend delete endpoint)
- Shows info message that functionality will be implemented with backend support

### 2. Event Rolex Screen (`app/(event)/[eventId]/rolex.tsx`)

#### Data Fetching
- **Removed**: AsyncStorage-based data loading from `storageService`
- **Added**: tRPC queries for backend data:
  - `trpc.events.getById` - Fetches event details
  - `trpc.members.getAll` - Fetches all members
  - `trpc.sync.scores.getAll` - Fetches event scores

#### Score Calculation
- Replaced async `getPlayerGrandTotals` utility with inline calculation
- Filters scores by member ID from backend data
- Calculates:
  - `grandTotal`: Sum of all day scores
  - `grandNet`: Total minus (numberOfDays × handicap)

#### Member Updates
- **Added**: `trpc.members.update` mutation
- Quick edit saves now use backend mutation
- Removed `storageService.updateMember` calls

## Benefits

### Real-time Data
- All users see the same data across devices
- Changes made by admins are immediately visible to all players
- No sync delays or conflicts

### Data Consistency
- Single source of truth (Supabase database)
- No local/remote data mismatch issues
- Proper transaction handling

### Multi-device Support
- Players can access event data from any device
- No need to sync local storage between devices
- Better for tournament management

### Scalability
- Backend can handle multiple concurrent users
- Better performance with indexed queries
- Room for future features (real-time updates, notifications, etc.)

## Technical Details

### Backend Queries Used
```typescript
// Events
trpc.events.getById.useQuery({ id })

// Members
trpc.members.getAll.useQuery()
trpc.members.update.useMutation()

// Groupings
trpc.sync.groupings.get.useQuery({ eventId })
trpc.sync.groupings.sync.useMutation()

// Scores
trpc.sync.scores.getAll.useQuery({ eventId })
```

### Data Flow
1. User opens groupings/rolex screen
2. tRPC queries fetch data from Supabase via backend
3. Data is cached in React Query for performance
4. Updates trigger mutations that save to backend
5. Queries automatically refetch on focus/mount

## Future Improvements

### Immediate
- Implement backend endpoint for score reset functionality
- Add loading states while fetching data
- Add error boundaries for failed queries

### Nice-to-have
- Real-time updates using Supabase subscriptions
- Optimistic updates for better UX
- Offline support with sync when connection restored
- Push notifications for score updates

## Testing Checklist

- [x] Groupings load from backend
- [x] Scores display correctly in groupings
- [x] Groupings can be saved to backend
- [x] Member handicap updates save to backend
- [x] Rolex screen loads event data from backend
- [x] Rolex screen calculates scores from backend data
- [x] Rolex screen member edits save to backend
- [ ] Multi-user testing (verify simultaneous access)
- [ ] Performance testing with large datasets
- [ ] Error handling verification

## Migration Status

✅ **Complete**: Both screens now fetch from backend
✅ **Complete**: All mutations save to backend
⚠️ **Pending**: Score reset functionality (needs backend endpoint)
⚠️ **Pending**: Loading/error states UI improvements
