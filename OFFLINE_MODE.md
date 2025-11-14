# Offline Mode System Documentation

## Overview

The Golf Tournament app now includes a comprehensive offline mode system that allows admins to work entirely offline when internet signal is weak. All changes are queued locally and automatically synced when connection is restored.

## Key Features

1. **Manual Offline Mode Toggle**: Admin can manually enable offline mode before a tournament starts
2. **Automatic Offline Detection**: Automatically detects when device loses internet connection
3. **Operation Queuing**: All changes (scores, registrations, groupings, handicap updates) are queued locally
4. **Automatic Sync**: When connection is restored, pending changes are automatically synced to backend
5. **Sync Status Indicators**: Visual indicators show offline status and pending change count
6. **Manual Sync Control**: Admin can manually trigger sync at any time

## Architecture

### Core Components

1. **OfflineModeContext** (`contexts/OfflineModeContext.tsx`)
   - Manages offline/online state
   - Tracks pending operations
   - Monitors network connectivity
   - Stores offline data cache

2. **Offline Sync Service** (`utils/offlineSync.ts`)
   - Handles syncing of pending operations
   - Processes different operation types
   - Reports sync results

3. **OfflineModeToggle Component** (`components/OfflineModeToggle.tsx`)
   - UI for toggling offline mode
   - Displays connection status
   - Shows pending operation count
   - Provides manual sync button

## Supported Operations

The following operations can be performed offline:

1. **Score Submission** (`score_submit`)
   - Admin can enter scores for players
   - Scores are cached locally
   - Synced when online

2. **Registration Create** (`registration_create`)
   - Add players to event
   - Create registration records
   - Synced when online

3. **Registration Update** (`registration_update`)
   - Update payment status
   - Update handicap adjustments
   - Update guest counts
   - Synced when online

4. **Registration Delete** (`registration_delete`)
   - Remove players from event
   - Synced when online

5. **Groupings Sync** (`grouping_sync`)
   - Save player groupings for each day
   - Synced when online

6. **Member Update** (`member_update`)
   - Update player handicaps
   - Update player information
   - Synced when online

7. **Event Update** (`event_update`)
   - Update event configuration
   - Synced when online

## Usage Instructions

### For Admins

#### Before Tournament (Good Signal)
1. Open the event
2. Tap the cloud icon in the header or footer
3. Review connection status
4. If signal is weak, tap "Go Offline"
5. Confirm the action

#### During Tournament (Offline Mode)
1. Enter scores as normal - they will be queued
2. Make registration changes - they will be queued
3. Update groupings - they will be queued
4. Monitor the pending changes counter (badge on cloud icon)

#### After Tournament (Restored Connection)
1. Wait for automatic sync OR
2. Tap the cloud icon to view sync status
3. Tap "Sync Now" to manually trigger sync
4. Review sync results
5. If errors occur, operations will be retried
6. Once all synced, tap "Go Online"

## Integration Guide

### Adding Offline Support to a Screen

1. **Import the hook**:
```typescript
import { useOfflineMode } from '@/contexts/OfflineModeContext';
```

2. **Use the hook**:
```typescript
const { 
  shouldUseOfflineMode, 
  addPendingOperation,
  isOfflineMode,
  isConnected
} = useOfflineMode();
```

3. **Check before backend operations**:
```typescript
if (shouldUseOfflineMode) {
  // Queue the operation
  await addPendingOperation({
    type: 'score_submit',
    data: {
      eventId,
      memberId,
      day,
      holes,
      totalScore,
      submittedBy,
    },
    eventId,
  });
  
  // Save to local storage
  await saveScoreLocally(eventId, memberId, day, score);
} else {
  // Call backend directly
  await trpcClient.sync.scores.submit.mutate({...});
}
```

4. **Add the toggle component**:
```typescript
import { OfflineModeToggle } from '@/components/OfflineModeToggle';

// In your component:
<OfflineModeToggle eventId={eventId} position="footer" />
```

## Status Indicators

### Cloud Icon Colors
- 🟢 **Green**: Online and connected
- 🟠 **Orange**: Offline mode enabled (manual)
- 🔴 **Red**: No internet connection (automatic)

### Badge Numbers
- Shows count of pending operations
- Appears on cloud icon when changes are queued

## Data Storage

### Local Storage Keys
- `@golf_offline_mode`: Offline mode state (boolean)
- `@golf_pending_operations`: Array of pending operations
- `@golf_offline_data_cache`: Cached data for offline viewing

### Existing Storage (Still Used)
- Admin scores: `@golf_admin_scores_{eventId}_day_{day}`
- Player scores: `@golf_scores_{eventId}_day_{day}`
- Groupings: `@golf_groupings_{eventId}_day_{day}`

## Error Handling

### Sync Errors
- Failed operations remain in queue
- Errors are logged with operation ID
- Admin sees summary of successes/failures
- Failed operations can be retried manually

### Connection Loss During Sync
- Sync stops gracefully
- Already-synced operations are removed from queue
- Remaining operations stay queued
- Resume sync when connection returns

## Best Practices

### For Administrators
1. **Test Before Tournament**: Enable offline mode briefly to ensure it works
2. **Check Pending Count**: Monitor the badge to see how many changes are queued
3. **Sync Regularly**: When signal improves, sync to reduce queue size
4. **Communicate with Players**: Let players know when live scoring is unavailable

### For Developers
1. **Always Check `shouldUseOfflineMode`**: Before any backend operation
2. **Save Locally First**: When offline, save to AsyncStorage immediately
3. **Queue After Local Save**: Only queue if local save succeeds
4. **Use Consistent Data Format**: Ensure offline and online data formats match
5. **Test Offline Scenarios**: Test with airplane mode enabled

## Troubleshooting

### Pending Changes Not Syncing
1. Check internet connection
2. View sync modal for error details
3. Try manual sync
4. Check console logs for specific errors

### Scores Not Appearing
1. Check if in offline mode
2. Verify local storage has the data
3. Try syncing manually
4. Check if operation is in pending queue

### Duplicate Data After Sync
1. Check if operation was queued multiple times
2. Verify unique IDs are being used
3. Check backend upsert logic

## Future Enhancements

Potential improvements to consider:

1. **Selective Sync**: Allow syncing specific operations
2. **Conflict Resolution**: Handle conflicts when same data modified offline and online
3. **Bandwidth Optimization**: Compress data before syncing
4. **Background Sync**: Sync automatically in background when connection detected
5. **Offline Data Viewer**: Show cached data even when offline
6. **Operation History**: View history of synced operations
