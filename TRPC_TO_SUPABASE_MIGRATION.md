# tRPC to Supabase Direct Access Migration

## Summary

This document describes the migration from tRPC backend to direct Supabase access. The app has been successfully migrated from using a tRPC backend layer to accessing Supabase directly from the client.

## What Has Been Completed ✅

### 1. Core Contexts Migrated
All major context providers have been updated to use direct Supabase queries:

- **AuthContext** (`contexts/AuthContext.tsx`)
  - Members fetching, creation, updating, deletion now use Supabase directly
  - Fallback to local storage preserved
  
- **EventsContext** (`contexts/EventsContext.tsx`)
  - Events CRUD operations now use Supabase directly
  - Proper field mapping between camelCase and snake_case
  
- **GamesContext** (`contexts/GamesContext.tsx`)
  - Personal games CRUD operations migrated
  - All game types (wolf, niners, team match play) supported
  
- **SettingsContext** (`contexts/SettingsContext.tsx`)
  - Organization settings now read/write directly to Supabase
  - Handles both local storage and Supabase modes
  
- **NotificationsContext** (`contexts/NotificationsContext.tsx`)
  - Notifications CRUD migrated to Supabase
  - Mark as read, delete, and bulk operations working

### 2. Utility Functions Updated

- **offlineSync.ts** (`utils/offlineSync.ts`)
  - All sync operations now use direct Supabase calls
  - Supports scores, registrations, groupings, members, and events
  
- **supabaseService.ts** (`utils/supabaseService.ts`) - NEW FILE
  - Created helper service with common Supabase query patterns
  - Provides event, registration, grouping, score, and financial operations
  - Can be used to replace tRPC hooks in screens

### 3. Root Layout Updated

- **app/_layout.tsx**
  - Removed tRPC provider wrapper
  - Removed backend health checks
  - App now runs without tRPC dependency

## What Needs to Be Completed 🚧

### Screens and Components Using tRPC Hooks

The following files still import and use tRPC hooks and need to be updated:

1. **Event Screens:**
   - `app/(event)/[eventId]/registration.tsx` - Uses trpc.events, trpc.registrations
   - `app/(event)/[eventId]/groupings.tsx` - Uses trpc.groupings, trpc.scores
   - `app/(event)/[eventId]/scoring.tsx` - Uses trpc.scores
   - `app/(event)/[eventId]/finance.tsx` - Uses trpc.financials
   - `app/(event)/[eventId]/rolex.tsx` - Uses trpc queries

2. **Admin Screens:**
   - `app/(admin)/admin-events.tsx` - Uses trpc.events
   - `app/(admin)/admin-financial.tsx` - Uses trpc.financials
   - `app/(admin)/bulk-update.tsx` - Uses trpc.members
   - `app/(admin)/import-members.tsx` - Uses trpc.members

3. **Tab Screens:**
   - `app/(tabs)/rolex-points.tsx` - Uses trpc queries

4. **Game Screens:**
   - `app/(game)/[gameId]/scoring.tsx` - Uses trpc.games

5. **Components:**
   - `components/AddEventModal.tsx`
   - `components/EventFooter.tsx`
   - `components/ScoringModal.tsx`
   - `components/CreateGameModal.tsx`
   - `components/SyncButton.tsx`
   - `components/PayPalInvoiceModal.tsx`
   - `components/CoursesManagementModal.tsx`

### How to Complete the Migration

For each file that uses tRPC hooks, you have two options:

#### Option 1: Use the supabaseService helper
```typescript
// OLD (tRPC)
import { trpc } from '@/lib/trpc';
const eventsQuery = trpc.events.getAll.useQuery();
const registerMutation = trpc.events.register.useMutation();

// NEW (Supabase Service with React Query)
import { useQuery, useMutation } from '@tanstack/react-query';
import { supabaseService } from '@/utils/supabaseService';

const eventsQuery = useQuery({
  queryKey: ['events'],
  queryFn: () => supabaseService.events.getAll()
});

const registerMutation = useMutation({
  mutationFn: ({ eventId, memberId }: { eventId: string; memberId: string }) => 
    supabaseService.events.register(eventId, memberId),
  onSuccess: () => {
    // Refetch queries as needed
    eventsQuery.refetch();
  }
});
```

#### Option 2: Use Supabase directly (for complex queries)
```typescript
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

const { data: events } = useQuery({
  queryKey: ['events'],
  queryFn: async () => {
    const { data, error } = await supabase.from('events').select('*');
    if (error) throw error;
    return data;
  }
});
```

### Pattern for Mutations
```typescript
const updateMutation = useMutation({
  mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
    const { error } = await supabase
      .from('table_name')
      .update(updates)
      .eq('id', id);
    if (error) throw error;
  },
  onSuccess: () => {
    // Invalidate and refetch queries
    queryClient.invalidateQueries({ queryKey: ['key'] });
  }
});
```

## Database Schema Notes

Remember to convert between camelCase (app) and snake_case (database):

**Common Field Mappings:**
- `eventId` ↔ `event_id`
- `memberId` ↔ `member_id`
- `isAdmin` ↔ `is_admin`
- `rolexPoints` ↔ `rolex_points`
- `membershipType` ↔ `membership_type`
- `startDate` ↔ `start_date`
- `endDate` ↔ `end_date`
- `paymentStatus` ↔ `payment_status`

See `backend/DATABASE_SCHEMA.md` for complete schema reference.

## Files to Remove (Once Migration Complete)

Once all screens are migrated, you can safely remove:
- `lib/trpc.ts` - tRPC client setup
- `backend/` folder - All backend tRPC routes and configuration
- All `backend/*.md` documentation files related to tRPC

## Testing Checklist

After completing screen migrations, test:
- [ ] Login/logout functionality
- [ ] Member management (add, edit, delete)
- [ ] Event creation and management
- [ ] Event registration flow
- [ ] Groupings and scoring
- [ ] Financial records
- [ ] Personal games
- [ ] Notifications
- [ ] Settings management
- [ ] Offline mode and sync

## Benefits of This Migration

1. **Simpler Architecture** - Direct database access, no backend layer
2. **Faster Development** - No need to create tRPC routes for new features
3. **Better Performance** - Fewer network hops
4. **Easier Debugging** - Direct queries visible in Supabase dashboard
5. **Type Safety** - Still maintained through TypeScript interfaces
6. **Offline Support** - Local storage fallbacks preserved

## Support

If you encounter issues during migration:
1. Check the console logs for Supabase error messages
2. Verify field name mappings (camelCase vs snake_case)
3. Ensure proper error handling with try/catch blocks
4. Use the supabaseService helper for common operations
5. Reference existing migrated contexts for patterns
