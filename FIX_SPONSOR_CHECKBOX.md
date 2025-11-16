# Fix for Sponsor Checkbox Persistence Issue

## Problem
The sponsor checkbox is not persisting when you edit a registration. The checkbox appears unchecked even after you checked it when adding the name, and when you edit and save there is an error.

## Root Cause
The `is_sponsor` column may not exist in your Supabase `event_registrations` table, or the previous migration files weren't run.

## Solution

### Step 1: Run the Migration in Supabase SQL Editor

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New query"
4. Copy and paste the contents of `backend/migrations/018_ensure_all_registration_columns.sql`
5. Click "Run" to execute the migration

This migration will:
- Add the `is_sponsor` column if it doesn't exist
- Add the `adjusted_handicap`, `number_of_guests`, and `guest_names` columns if they don't exist
- Create necessary indexes
- Add column documentation

### Step 2: Verify the Migration

After running the migration, verify that the columns exist:

```sql
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'event_registrations'
ORDER BY ordinal_position;
```

You should see these columns:
- `id` (uuid)
- `event_id` (uuid)
- `member_id` (uuid)
- `registered_at` (timestamp with time zone)
- `status` (text)
- `payment_status` (text)
- `adjusted_handicap` (text)
- `number_of_guests` (integer)
- `guest_names` (text)
- `is_sponsor` (boolean)
- `updated_at` (timestamp with time zone)

### Step 3: Test the Fix

1. Go to a social event in your app
2. Add a player and check the "Sponsor" checkbox
3. Save the registration
4. Edit the same player
5. The sponsor checkbox should now be checked
6. Save the edit - there should be no error

## What Was Fixed

1. **Created migration file**: `backend/migrations/018_ensure_all_registration_columns.sql`
   - This migration ensures all necessary columns exist in the `event_registrations` table
   - Uses `IF NOT EXISTS` so it's safe to run multiple times

2. **Updated DATABASE_SCHEMA.md**
   - Added documentation for the new columns in the schema documentation
   - This helps keep the documentation in sync with the actual database

3. **Fixed registration data mapping**: `app/(event)/[eventId]/registration.tsx`
   - Added `isSponsor: reg.isSponsor || false` to the registration map (line 169)
   - This ensures the sponsor flag is properly loaded when displaying registrations
   - The checkbox will now show the correct state when editing

## Technical Details

There were two issues:
1. **Database column missing**: The `is_sponsor` column didn't exist in the database, causing save errors
2. **Data mapping incomplete**: The registration page wasn't including `isSponsor` in the local registration map, so the checkbox appeared unchecked even when the data was saved

Both issues are now fixed:
- The EventPlayerModal component properly handles the sponsor checkbox state
- The backend CRUD routes correctly read and write the `is_sponsor` field
- The registration screen now properly loads and displays the sponsor flag
- The registration screen correctly passes the sponsor flag when adding/editing registrations

## If You Still Have Issues

If the sponsor checkbox still doesn't persist after running the migration:

1. Check the browser console for any errors
2. Check the Supabase logs for any database errors
3. Try clearing the app cache and reloading
4. Verify the migration ran successfully by checking the columns as described in Step 2

## Files Changed

1. `backend/migrations/018_ensure_all_registration_columns.sql` (new file)
2. `backend/DATABASE_SCHEMA.md` (updated to reflect current schema)
