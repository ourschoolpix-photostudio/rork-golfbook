# Rolex Points Persistence Fix

## Issue
When editing Rolex points in the global Rolex screen (`app/(tabs)/rolex-points.tsx`), the changes were not persisting when saved.

## Investigation Results

### 1. Database Schema ✅
The `rolex_points` column **DOES exist** in the database:
- Defined in `backend/DATABASE_SCHEMA.md` (line 19)
- Defined in `backend/migrations/100_comprehensive_schema.sql` (line 22)
- Type: `INTEGER DEFAULT 0`

### 2. Frontend Mapping ✅
The `AuthContext` correctly maps `rolexPoints` to `rolex_points`:
- File: `contexts/AuthContext.tsx` (line 286)
- Maps: `updates.rolexPoints` → `supabaseUpdates.rolex_points`

### 3. Data Flow ✅
The data flow is correct:
1. User edits member in `PlayerEditModal`
2. Modal calls `onSave` with updated member (line 211)
3. `handleSaveQuickEdit` calls `updateMember` (line 83)
4. `updateMember` in AuthContext updates Supabase (line 309-312)
5. AuthContext refreshes members list (line 319)

## Root Cause
The issue was that the Rolex screen wasn't explicitly reloading the local members list after the save operation completed. While `AuthContext.updateMember` refreshes its own members list, the Rolex screen maintains its own `allMembers` state that needs to be refreshed.

## Fix Applied

### Changes to `app/(tabs)/rolex-points.tsx`
Updated the `handleSaveQuickEdit` function to explicitly reload members after save:

```typescript
const handleSaveQuickEdit = async (updatedMember: Member) => {
  try {
    console.log('[GlobalRolex] Saving member:', updatedMember.id, 'rolexPoints:', updatedMember.rolexPoints);
    await updateMember(updatedMember.id, updatedMember);
    console.log('[GlobalRolex] Save successful, reloading members...');
    await loadMembers();  // ← Added explicit reload
    console.log('[GlobalRolex] Members reloaded');
  } catch (error) {
    console.error('[GlobalRolex] Error saving member:', error);
    throw error;
  }
};
```

## Database Verification Script

A verification script has been created at `backend/migrations/verify_rolex_points.sql` to:
1. Check if the `rolex_points` column exists
2. Add it if missing (should not be needed)
3. Ensure proper default values
4. Display column configuration
5. Show sample data

To run this script:
```bash
# In your Supabase SQL Editor
\i backend/migrations/verify_rolex_points.sql
```

Or copy the contents and run directly in the Supabase dashboard SQL editor.

## Testing
1. Open the global Rolex screen
2. Tap on a member to edit
3. Change the Rolex points value
4. Save the changes
5. Verify the points are updated immediately on the screen
6. Close and reopen the screen to verify persistence

## Additional Console Logs
Added detailed console logging to track the save operation:
- `[GlobalRolex] Saving member:` - Shows member ID and points being saved
- `[GlobalRolex] Save successful, reloading members...` - Confirms save completed
- `[GlobalRolex] Members reloaded` - Confirms data refresh completed

Check the console for these logs when debugging.
