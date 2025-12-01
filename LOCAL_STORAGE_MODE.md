# Local Storage Mode Implementation

## Overview

A local storage mode has been added to allow the app to function completely offline without backend dependencies. This is useful when the backend is experiencing issues or during development.

## How to Enable

1. Navigate to **Admin > Settings**
2. Expand the **Storage Mode** section (it's expanded by default)
3. Toggle the switch from "Backend Storage" to "Local Storage"
4. Confirm the switch when prompted
5. Restart the app for best results

## What's Implemented

### ✅ Fully Supported (Local Storage)

1. **Settings Context** - Reads/writes settings from AsyncStorage
2. **Auth Context** - Members CRUD operations work locally
3. **Events Context** - Events CRUD operations work locally
4. **Local Storage Service** - Complete CRUD operations for:
   - Members
   - Events
   - Games (structure ready)
   - Notifications (structure ready)

### ⚠️ Partially Supported

1. **Games Context** - Uses tRPC hooks which don't easily switch. Requires refactoring to match Auth/Events pattern.
2. **Notifications Context** - Uses tRPC hooks, needs similar refactoring.

### ❌ Not Supported (Backend Only)

The following features still require backend:
- PayPal payment processing
- Email notifications
- Photo uploads (uses Supabase storage)
- Event registration sync
- Groupings and scoring sync systems

## Implementation Details

### Storage Keys

```typescript
'@golf_settings' - Organization settings
'@golf_current_user' - Current logged-in user
'@golf_local_members' - All members
'@golf_local_events' - All events  
'@golf_local_games' - All games
'@golf_local_notifications' - All notifications
```

### Architecture

When `useLocalStorage` is true in settings:
1. All CRUD operations bypass tRPC and use `localStorageService`
2. Data is stored in AsyncStorage in JSON format
3. No network requests are made for supported operations
4. Backend errors don't affect functionality

## Usage in Code

```typescript
// In any context
const { orgInfo } = useSettings();
const useLocalStorage = orgInfo?.useLocalStorage || false;

// Then conditionally use local storage or backend
if (useLocalStorage) {
  await localStorageService.members.create(member);
} else {
  await trpcClient.members.create.mutate(member);
}
```

## Limitations

1. **No Data Migration** - Switching modes doesn't migrate existing data
2. **No Cross-Device Sync** - Local storage is device-specific
3. **No Backup** - Data only exists on the device
4. **Games/Notifications** - These contexts need refactoring to fully support local mode

## Future Improvements

To fully support Games and Notifications:

1. Refactor `GamesContext` to use callbacks instead of tRPC hooks
2. Refactor `NotificationsContext` similarly
3. Add data export/import functionality
4. Add data migration between modes
5. Implement local backup/restore

## Benefits

✅ App works without backend
✅ No network errors when backend is down
✅ Faster CRUD operations (no network latency)
✅ Useful for development and testing
✅ Can continue working offline

## Current Status

- ✅ Storage mode toggle UI implemented
- ✅ Settings context supports local storage
- ✅ Auth context fully supports local storage
- ✅ Events context fully supports local storage
- ✅ Local storage service created
- ⚠️ Games context needs refactoring
- ⚠️ Notifications context needs refactoring
- ❌ Photo upload still needs backend
- ❌ Payment processing still needs backend
