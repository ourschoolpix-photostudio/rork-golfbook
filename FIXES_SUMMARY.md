# Backend Migration - Fixes Summary

## ✅ Completed Fixes

### 1. Supabase Connection Configuration
**File**: `integrations/supabase/client.ts`
- Added timeout protection (15 seconds) to prevent connection hangs
- Disabled auto-refresh tokens for simpler auth flow
- Added proper abort signal handling for requests
- Configured realtime params for better performance

### 2. Auth Context (Member Management)
**File**: `contexts/AuthContext.tsx`
- ✅ Members are loaded from backend via `trpc.members.getAll`
- ✅ Member CRUD operations use backend mutations
- ✅ Current user session stored in AsyncStorage (session management only)
- ✅ Login validates against backend member data
- ✅ Auto-creates default admin if no members exist

### 3. Dashboard Screen
**File**: `app/(tabs)/dashboard.tsx`
- ✅ Events loaded from backend via `trpc.events.getAll`
- ✅ Always refetches data when screen is focused
- ✅ Shows all events to all logged-in users (both admins and non-admins)
- ✅ Proper loading states and error handling
- ✅ Member profile synced from backend

### 4. Events Context
**File**: `contexts/EventsContext.tsx`
- ✅ Events loaded from backend
- ✅ Event CRUD operations use backend mutations
- ✅ Registration/unregistration use backend endpoints
- ✅ Auto-refetch after mutations

## ⚠️ Issues That Need Fixing

### 1. Registration Screen Still Uses Local Storage
**File**: `app/(event)/[eventId]/registration.tsx`
**Problem**: This screen still uses:
- `storageService.getEvents()` 
- `storageService.getMembers()`
- `storageService.updateEvent()`
- `registrationService` (which uses AsyncStorage)

**Solution Needed**:
- Replace all `storageService` calls with trpc queries/mutations
- Use `trpc.events.register.useMutation()` for registrations
- Use `trpc.events.get.useQuery()` to load event data
- Use `trpc.members.getAll.useQuery()` to load member list
- Remove all references to `registrationService`

### 2. Registration Service Uses AsyncStorage
**Files**: 
- `utils/registrationService.ts`
- `utils/storage.ts`

**Problem**: These services store registration data locally
**Solution**: Replace with backend trpc calls or remove entirely

### 3. Other Screens May Use Local Storage
Need to audit these screens:
- `app/(admin)/*` - Admin screens
- `app/(event)/[eventId]/*` - Event management screens (groupings, scoring, leaderboard, finance)
- `app/(tabs)/admin.tsx`
- `app/(tabs)/members.tsx`

## 🎯 Recommended Next Steps

### Step 1: Fix Registration Screen (HIGH PRIORITY)
This is the main blocker. Users can't register properly because:
1. Registration adds wrong player (uses first member with PIN 1111)
2. Data not synced across devices
3. Still using local storage

**Action Items**:
1. Remove all `storageService` imports
2. Replace with `trpc` hooks
3. Update registration flow to use `trpc.events.register`
4. Load registered players from event.registeredPlayers (already returned from backend)

### Step 2: Audit and Fix All Screens
Go through each screen systematically:
1. Search for `storageService` usage
2. Search for `AsyncStorage` usage (except for currentUser session)
3. Replace with appropriate trpc queries/mutations

### Step 3: Add Backend Routes for Missing Features
Some features may need new backend routes:
- Groupings CRUD
- Scores CRUD  
- Financial records CRUD
- Registration payment status updates

### Step 4: Remove Unused Files
Once migration is complete:
- Delete `utils/storage.ts`
- Delete `utils/registrationService.ts`
- Delete any other local-storage-based utilities

## 📊 Current State

**Backend**:
✅ Members: Fully migrated
✅ Events: Fully migrated
✅ Event Registrations: Backend ready
⚠️ Groupings: Backend exists but not used
⚠️ Scores: Backend exists but not used
⚠️ Financial: Backend exists but not used

**Frontend**:
✅ AuthContext: Uses backend
✅ EventsContext: Uses backend
✅ Dashboard: Uses backend
⚠️ Registration Screen: Uses local storage (NEEDS FIX)
❌ Admin Screens: Unknown (needs audit)
❌ Event Management: Unknown (needs audit)

## 🔍 How to Verify Everything Works

1. **Login on Device A** → Create event → Should appear on Device B
2. **Register on Device B** → Should show on Device A
3. **Restart app** → Data should persist (from backend, not local)
4. **Check console logs** → Should see "Fetching from backend" messages
5. **Network offline** → App should show loading/error states gracefully

## 🐛 Known Issues

1. **Connection Timeout**: Fixed with AbortSignal timeout
2. **Duplicate PINs**: Bulk-added members have PIN "1111" → Need unique PINs
3. **Registration Bug**: Registers wrong player → Fixed when registration uses currentUser.id
4. **Cross-device Sync**: Events not showing → Fixed with proper backend queries

## 🛠️ Quick Fix for Registration (Priority)

The registration button press should:
```typescript
const registerMutation = trpc.events.register.useMutation({
  onSuccess: () => {
    eventsQuery.refetch();
  },
});

const handleRegisterCurrentUser = async () => {
  if (!currentUser || !event) return;
  
  await registerMutation.mutateAsync({
    eventId: event.id,
    memberId: currentUser.id,  // <-- Use logged-in user's ID
  });
};
```

This ensures the correct player (logged-in user) is registered, not the first member with PIN 1111.
