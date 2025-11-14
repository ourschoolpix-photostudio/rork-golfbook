# Issue Summary: Data Not Syncing Across Devices

## Problem
Events created by admin are NOT visible on other players' devices, and registrations don't sync.

## Root Cause
The app has a **hybrid architecture** - partly using backend, partly using local storage (AsyncStorage):

### ✅ What Works (Uses Backend):
1. **Admin creates events** → Saves to backend via `trpc.events.create`
2. **Dashboard loads events** → Fetches from backend via `trpc.events.getAll`
3. **Member login** → Validates against backend members via `trpc.members.getAll`

### ❌ What's Broken (Still Uses Local Storage):
1. **Event registration** (`app/(event)/[eventId]/registration.tsx`)
   - Lines 54-80: Loads data from `storageService.getEvents()` (AsyncStorage)
   - Lines 133-148: Saves registrations via `registrationService` (AsyncStorage)
   - Lines 247-250: Updates events via `storageService.updateEvent()` (AsyncStorage)
   
2. **Registration tracking** (`utils/registrationService.ts`)
   - All registration data stored in AsyncStorage
   - Payment status, guest counts, adjusted handicaps - all local
   - Not synced to backend at all

## Why This Happens
Looking at `app/(event)/[eventId]/registration.tsx` line 54-80:
```typescript
const loadData = async () => {
  const events = await storageService.getEvents();  // ❌ Local storage
  const foundEvent = events.find((e) => e.id === eventId);
  // ...
  const allMembers = await storageService.getMembers();  // ❌ Local storage
}
```

This loads from AsyncStorage instead of fetching from the backend!

## Solution
The registration page needs to be refactored to:

1. **Load events from backend**:
   ```typescript
   const eventsQuery = trpc.events.getAll.useQuery();
   // Use eventsQuery.data instead of storageService
   ```

2. **Load members from backend**:
   ```typescript
   const membersQuery = trpc.members.getAll.useQuery();
   // Use membersQuery.data instead of storageService
   ```

3. **Register players via backend**:
   ```typescript
   const registerMutation = trpc.events.register.useMutation();
   await registerMutation.mutateAsync({ eventId, memberId });
   ```

4. **Store registration details** (payment, guests, etc.) in backend:
   - Need to create new tRPC routes for registration metadata
   - Currently backend only tracks if player is registered, not payment/guest details

## Backend Support Status

### ✅ Already Available:
- `trpc.events.register` - Adds member to event
- `trpc.events.unregister` - Removes member from event
- `trpc.events.getAll` - Returns events with `registeredPlayers[]`

### ❌ Missing (Needed):
- `trpc.registrations.create` - Save payment method, guest count, etc.
- `trpc.registrations.update` - Update payment status, adjusted handicap
- `trpc.registrations.get` - Get full registration details for an event
- Database table for registration metadata (payment, guests, etc.)

## Impact
- ✅ Admin CAN create events → Other devices SHOULD see them
- ❌ Admin creates event → Registration page loads from AsyncStorage → Shows empty/old events
- ❌ Player registers → Saves to AsyncStorage → Not visible on other devices
- ❌ Dashboard shows events from backend → Registration page shows events from AsyncStorage → **Data mismatch**

## Quick Fix (Partial)
The registration page should AT MINIMUM load events and members from backend:

```typescript
// BEFORE (Line 54-80):
const loadData = async () => {
  const events = await storageService.getEvents();  // ❌ Wrong
  const allMembers = await storageService.getMembers();  // ❌ Wrong
};

// AFTER:
const eventsQuery = trpc.events.getAll.useQuery();
const membersQuery = trpc.members.getAll.useQuery();

useEffect(() => {
  if (eventsQuery.data) {
    const foundEvent = eventsQuery.data.find((e) => e.id === eventId);
    setEvent(foundEvent);
  }
  if (membersQuery.data) {
    setMembers(membersQuery.data);
  }
}, [eventsQuery.data, membersQuery.data, eventId]);
```

This would at least make events visible. Full registration sync requires the missing backend routes.
