# Backend Migration TODO

## Current Issues

Your app has been partially migrated to use a backend, but there are still critical issues that prevent proper multi-device synchronization:

### ❌ Problems:

1. **Registration page still uses local storage** (`app/(event)/[eventId]/registration.tsx`)
   - Lines 16, 54-80: Uses `storageService.getEvents()`, `storageService.getMembers()`
   - Lines 93-96, 148-149, 247-250: Updates events via `storageService.updateEvent()`
   - Lines 94-95: Uses `registrationService` which stores to AsyncStorage
   - Result: Registrations are stored locally, not synced to backend

2. **No registration/grouping/scoring backend routes**
   - Backend only has member and event CRUD operations
   - Registrations, groupings, and scores need backend endpoints
   - Currently stored in AsyncStorage via `utils/registrationService.ts`

3. **Login with duplicate PINs** (`contexts/AuthContext.tsx` line 82-86)
   - Currently finds the FIRST member with matching PIN
   - Should check both username AND PIN for correct login
   - Issue: Bulk imported members may have same default PIN

## ✅ Already Fixed:

1. **Dashboard now uses backend** for member profiles
2. **Admin events page** properly creates/updates/deletes via backend
3. **Events are synced** and visible across devices

## 🔧 Required Fixes:

### High Priority:

1. **Create registration backend routes** in `backend/trpc/routes/registrations/crud/route.ts`:
   ```typescript
   - createRegistration(eventId, memberId, paymentMethod, etc)
   - updateRegistration(registrationId, updates)
   - deleteRegistration(registrationId)
   - getRegistrationsForEvent(eventId)
   ```

2. **Update registration page** to use tRPC instead of storageService:
   - Replace all `storageService.getEvents()` with `trpc.events.getAll.useQuery()`
   - Replace all `storageService.getMembers()` with `trpc.members.getAll.useQuery()`
   - Replace `registrationService` calls with new `trpc.registrations.*` mutations
   - Remove AsyncStorage usage entirely from this screen

3. **Fix login logic** to properly check username+PIN:
   ```typescript
   // Current (WRONG):
   const member = allMembers.find((m: Member) => 
     (m.username?.toLowerCase() === username.trim().toLowerCase() || 
      m.name?.toLowerCase() === username.trim().toLowerCase()) && 
     m.pin === pin.trim()
   );
   
   // Should ensure it's an exact match, not just first match with PIN
   ```

### Medium Priority:

4. **Create database schema** for registrations table (similar to members/events)
5. **Deprecate utils/storageService.ts** - mark all methods as deprecated
6. **Update all remaining files** that use storageService to use tRPC

### Low Priority:

7. **Create groupings/scores backend routes** (less critical for now)
8. **Migrate financial records** to backend

## 📋 Migration Checklist:

- [x] Members CRUD (backend)
- [x] Events CRUD (backend)  
- [x] Dashboard uses backend
- [ ] Registrations CRUD (backend) ⚠️ CRITICAL
- [ ] Registration page uses backend ⚠️ CRITICAL
- [ ] Fix PIN login logic ⚠️ IMPORTANT
- [ ] Groupings CRUD (backend)
- [ ] Scores CRUD (backend)
- [ ] Financial records (backend)
- [ ] Deprecate storageService completely

## 🎯 Next Steps:

1. Create registration database schema in Supabase
2. Create backend tRPC routes for registrations
3. Update registration page to use tRPC mutations
4. Test registration flow across multiple devices
5. Fix PIN login to check both username AND PIN correctly

## Current Data Flow:

```
LOGIN:
User → AuthContext (tRPC members.getAll) → Finds member by username+PIN ✅

DASHBOARD:
User → Dashboard (tRPC events.getAll + members.getAll) → Shows events ✅

ADMIN EVENTS:
Admin → Admin Events (tRPC events.create/update/delete) → Syncs to backend ✅

REGISTRATION (BROKEN ❌):
User → Registration Page → storageService (AsyncStorage) → LOCAL ONLY
                         → registrationService (AsyncStorage) → LOCAL ONLY
```

## Target Data Flow:

```
REGISTRATION (FIXED ✅):
User → Registration Page → tRPC registrations.create → Backend → All devices
                         → tRPC events.register → Updates event → All devices
```
