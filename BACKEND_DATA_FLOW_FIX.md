# Backend Data Flow Fix - Complete

## Problem
The application was mixing local storage and backend storage for registration data, specifically:
- Adjusted handicaps were being saved locally via `registrationService` 
- Number of guests were being saved locally
- Payment status was being saved locally
- When screens fetched data, they sometimes used local storage and sometimes used backend, causing inconsistencies

## Solution
**All edited data now flows through the backend** - the single source of truth is the Supabase database.

## Changes Made

### 1. Registration Screen (`app/(event)/[eventId]/registration.tsx`)
**Removed local storage operations:**
- ✅ All registration creation now goes through `registerMutation` (backend)
- ✅ Removed calls to `registrationService.createRegistration()` 
- ✅ Payment status updates go through `updateRegistrationMutation` (backend)
- ✅ Adjusted handicap updates go through `updateRegistrationMutation` (backend)
- ✅ Number of guests updates go through `updateRegistrationMutation` (backend)
- ✅ Data is loaded from `registrationsQuery.data` (backend) instead of local storage
- ✅ After mutations, calls `registrationsQuery.refetch()` to sync with backend

**Key changes:**
- Line 107-133: Load registrations from backend query data
- Line 159-166: Simplified player registration to only use backend
- Line 208-222: Bulk add now uses backend and updates guest counts via mutation
- Line 327-340: Payment toggle uses backend mutation
- Line 365-378: Custom guest registration uses backend mutation
- Line 426-433: User self-registration uses backend mutation
- Line 478-493: Player changes saved to backend via mutation

### 2. Backend Registration Routes (`backend/trpc/routes/registrations/crud/route.ts`)
**Added support for number of guests:**
- ✅ Line 76-78: Added `number_of_guests` field to update mutation
- ✅ Line 129: Return `number_of_guests` from database in get query
- ✅ Added logging for better debugging

### 3. Database Migration
**Created new migration file:**
- ✅ `backend/migrations/004_add_number_of_guests_to_registrations.sql`
- Adds `number_of_guests INTEGER DEFAULT 0` column to `event_registrations` table
- **Action Required:** Run this migration in Supabase SQL Editor

### 4. Event Player Modal (`components/EventPlayerModal.tsx`)
**No changes needed** - already saves to backend via the parent's `onSave` callback which calls `updateRegistrationMutation`

### 5. Scoring Screen (`app/(event)/[eventId]/scoring.tsx`)  
**No changes needed** - already fetches from backend:
- Line 33-36: Fetches registrations from backend via `trpc.registrations.getAll.useQuery`
- Line 114-130: Maps registration data including `adjustedHandicap`
- Line 556-558: Uses `player.effectiveHandicap` which comes from registration data

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     USER INTERACTION                         │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│              REGISTRATION SCREEN                             │
│  • Add/remove players                                        │
│  • Edit adjusted handicap (via EventPlayerModal)             │
│  • Toggle payment status                                     │
│  • Set number of guests                                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ trpc mutations:
                     │ • events.register
                     │ • registrations.update
                     │ • events.unregister
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│                   SUPABASE DATABASE                          │
│  event_registrations table:                                  │
│  • id, event_id, member_id                                   │
│  • status, payment_status                                    │
│  • adjusted_handicap ← EVENT-SPECIFIC                        │
│  • number_of_guests                                          │
│  • registered_at, updated_at                                 │
└────────────────────┬────────────────────────────────────────┘
                     │
                     │ trpc queries:
                     │ • registrations.getAll
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│               SCORING & OTHER SCREENS                        │
│  • Fetch registration data                                   │
│  • Display effective handicap (adjusted or base)             │
│  • Calculate net scores correctly                            │
└─────────────────────────────────────────────────────────────┘
```

## Key Benefits

1. **Single Source of Truth:** All data lives in Supabase database
2. **Consistency:** All screens see the same data
3. **Real-time Sync:** Changes immediately available to all users
4. **Persistence:** Data survives app restarts and reinstalls
5. **Backend Control:** Admin can manage data from backend if needed

## What Happens When User Edits Adjusted Handicap

1. User taps player card on registration screen
2. `EventPlayerModal` opens with current data
3. User edits "Adjusted Handicap" field
4. User taps "Save"
5. Modal calls `onSave` callback with new values
6. Registration screen calls `updateRegistrationMutation.mutateAsync()` 
7. Backend updates `event_registrations.adjusted_handicap` in Supabase
8. Query automatically refetches data
9. All screens now see updated adjusted handicap
10. Scoring screen displays correct handicap via `getDisplayHandicap()`

## What You Need To Do

**Run the database migration:**
```sql
-- In Supabase SQL Editor, run:
-- backend/migrations/004_add_number_of_guests_to_registrations.sql

ALTER TABLE event_registrations 
ADD COLUMN IF NOT EXISTS number_of_guests INTEGER DEFAULT 0;
```

## Testing Checklist

- [ ] Run the migration in Supabase
- [ ] Register a player for an event
- [ ] Edit their adjusted handicap on registration screen
- [ ] Go to scoring screen - verify adjusted handicap displays correctly
- [ ] Enter scores - verify net score calculation uses adjusted handicap
- [ ] Check leaderboard - verify adjusted handicap shown
- [ ] Add guests to a social event
- [ ] Toggle payment status
- [ ] Verify all changes persist after app restart

## Notes

- The `registrationService` is still in the codebase but is no longer used for registration data
- It can be safely removed in a future cleanup
- All registration operations now go through tRPC backend routes
- The `getDisplayHandicap()` helper function correctly prioritizes adjusted handicap over base handicap
