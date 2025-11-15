# Complete AsyncStorage to Backend Migration

## Overview
This migration removes ALL AsyncStorage usage for data persistence and moves everything to Supabase backend. Only session data (current logged-in user) remains in AsyncStorage.

## Migration Summary

### ✅ Migrated to Backend

#### 1. **Personal Games** (`GamesContext.tsx`)
- **Table**: `personal_games`
- **Migration**: `011_add_games_table.sql`
- **tRPC Routes**: `backend/trpc/routes/games/crud/route.ts`
- **API**: 
  - `trpc.games.getAll` - Get all games for a member
  - `trpc.games.create` - Create new game
  - `trpc.games.update` - Update game scores/status
  - `trpc.games.delete` - Delete game

#### 2. **Notifications** (`NotificationsContext.tsx`)
- **Table**: `notifications`
- **Migration**: `012_add_notifications_table.sql`
- **tRPC Routes**: `backend/trpc/routes/notifications/crud/route.ts`
- **API**:
  - `trpc.notifications.getAll` - Get all notifications
  - `trpc.notifications.create` - Create notification
  - `trpc.notifications.markAsRead` - Mark single as read
  - `trpc.notifications.markAllAsRead` - Mark all as read
  - `trpc.notifications.delete` - Delete notification
  - `trpc.notifications.clearAll` - Clear all notifications

#### 3. **Organization Settings** (`SettingsContext.tsx`)
- **Table**: `organization_settings` (existing, migration 008)
- **tRPC Routes**: `backend/trpc/routes/settings/crud/route.ts`
- **API**:
  - `trpc.settings.getSettings` - Get organization info
  - `trpc.settings.updateSettings` - Update organization info

#### 4. **User Preferences**
- **Table**: `user_preferences`
- **Migration**: `013_add_user_preferences_table.sql`
- **tRPC Routes**: `backend/trpc/routes/preferences/crud/route.ts`
- **API**:
  - `trpc.preferences.getAll` - Get all preferences
  - `trpc.preferences.get` - Get single preference
  - `trpc.preferences.set` - Set preference (upsert)
  - `trpc.preferences.delete` - Delete preference
- **Use Cases**:
  - Double mode toggles (groupings page)
  - UI state preferences
  - Per-event settings

#### 5. **Offline Operations**
- **Table**: `offline_operations`
- **Migration**: `014_add_offline_operations_table.sql`
- **tRPC Routes**: `backend/trpc/routes/offline/crud/route.ts`
- **API**:
  - `trpc.offline.getAll` - Get all pending operations
  - `trpc.offline.create` - Create pending operation
  - `trpc.offline.updateStatus` - Update operation status
  - `trpc.offline.incrementRetry` - Increment retry count
  - `trpc.offline.delete` - Delete operation
  - `trpc.offline.clearAll` - Clear operations
- **Note**: Offline mode toggle and data cache remain in AsyncStorage for offline functionality

### ⚠️ Kept in AsyncStorage (Session Only)

#### 1. **Current User Session** (`AuthContext.tsx`)
- **Key**: `@golf_current_user`
- **Reason**: Session persistence only, not shared data

#### 2. **Offline Mode State** (`OfflineModeContext.tsx`)
- **Keys**:
  - `@golf_offline_mode` - Offline toggle state
  - `@golf_offline_data_cache` - Cached data for offline use
- **Reason**: Device-specific offline functionality

### 🗑️ Files to Remove/Deprecate

#### `utils/storage.ts`
- All functions are deprecated
- Members, events, financials, registrations now use backend
- Groupings use backend sync system
- **Action**: Can be removed once all references are migrated

#### `utils/scorePeristence.ts`
- Score persistence should use backend `scores` table via sync system
- **Action**: Migrate scoring pages to use backend scores

## Database Migrations Created

### Migration 011: Personal Games
```sql
CREATE TABLE personal_games (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  course_name TEXT,
  course_par INTEGER,
  hole_pars INTEGER[],
  players JSONB,
  status TEXT CHECK (status IN ('in-progress', 'completed')),
  created_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);
```

### Migration 012: Notifications
```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  event_id UUID REFERENCES events(id),
  type TEXT CHECK (type IN ('registration', 'cancellation', 'update', 'payment', 'general')),
  title TEXT,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMPTZ
);
```

### Migration 013: User Preferences
```sql
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  event_id UUID REFERENCES events(id),
  preference_key TEXT,
  preference_value JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  UNIQUE(member_id, event_id, preference_key)
);
```

### Migration 014: Offline Operations
```sql
CREATE TABLE offline_operations (
  id UUID PRIMARY KEY,
  member_id UUID REFERENCES members(id),
  operation_type TEXT,
  operation_data JSONB,
  event_id UUID REFERENCES events(id),
  retry_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  created_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ
);
```

## Running Migrations

Execute migrations in Supabase SQL Editor:

```bash
# Run migrations in order
1. backend/migrations/011_add_games_table.sql
2. backend/migrations/012_add_notifications_table.sql
3. backend/migrations/013_add_user_preferences_table.sql
4. backend/migrations/014_add_offline_operations_table.sql
```

## Updated Router

The `backend/trpc/app-router.ts` now includes:

```typescript
export const appRouter = createTRPCRouter({
  // ... existing routes
  games: gamesCrudRoute,
  notifications: notificationsCrudRoute,
  preferences: preferencesCrudRoute,
  offline: offlineCrudRoute,
});
```

## What's Left to Migrate

### Page-Level AsyncStorage Usage

Several pages still directly use AsyncStorage for UI state:

1. **`app/(event)/[eventId]/registration.tsx`** (Line 166)
   - Loads event data
   - Should use `trpc.events.getAll`

2. **`app/(event)/[eventId]/groupings.tsx`** (Lines 55, 157, 207, 415, 619-621)
   - Double mode toggle
   - Score persistence
   - Should use `trpc.preferences` for toggle
   - Should use `trpc.sync.scores` for scores

3. **`app/(event)/[eventId]/scoring.tsx`** (Line 96)
   - Should use backend scores

4. **`app/(event)/[eventId]/rolex.tsx`** (Line 61)
   - Should use backend data

5. **`app/login.tsx`** (Line 50)
   - Organization info loading
   - Already migrated in SettingsContext, just needs to use context

6. **`components/EventFooter.tsx`** (Lines 28, 46)
   - Event day selection
   - Should use `trpc.preferences`

7. **`utils/scorePeristence.ts`** (All functions)
   - Entire file should be deprecated
   - Use `trpc.sync.scores` instead

## Next Steps

### Immediate Actions Required

1. **Run all SQL migrations** in Supabase
2. **Test new endpoints** to ensure they work
3. **Migrate page-level AsyncStorage** to use new APIs
4. **Remove `utils/storage.ts`** once all references are removed
5. **Deprecate `utils/scorePeristence.ts`** and migrate to backend scores

### Testing Checklist

- [ ] Games CRUD operations work
- [ ] Notifications show up correctly
- [ ] Organization settings load and save
- [ ] User preferences save per-event
- [ ] Offline operations queue properly
- [ ] All data syncs across devices
- [ ] No more AsyncStorage errors

## Benefits

✅ **Multi-device sync** - All data syncs in real-time  
✅ **No data loss** - Centralized backend storage  
✅ **Better performance** - Database queries vs local JSON  
✅ **Easier debugging** - Can inspect data in Supabase  
✅ **Scalability** - Backend can handle complex queries  
✅ **Collaboration** - Multiple users see same data  

## Breaking Changes

⚠️ **Local data will not migrate automatically**

Users will lose:
- Personal games stored locally
- Notifications stored locally
- Custom preferences stored locally

To migrate existing data:
1. Export from AsyncStorage before update
2. Import via backend API after update
3. Or accept data loss (since this is new functionality)
