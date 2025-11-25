# Debugging Data Fetch Issues

## Issue Summary
The app is not displaying members and events even though they exist in the Supabase database. The likely cause is Row Level Security (RLS) policies blocking read access.

## Field Name Mapping ✅
The field names are correctly mapped between the database and the app:

**Database (snake_case)** → **App (camelCase)**
- `is_admin` → `isAdmin`
- `rolex_points` → `rolexPoints`
- `created_at` → `createdAt`
- `full_name` → `fullName`
- etc.

The mapping functions in `/backend/trpc/routes/members/crud/route.ts` and `/backend/trpc/routes/events/crud/route.ts` handle this conversion correctly.

## Steps to Fix

### 1. Run the RLS Fix Migration

Go to your Supabase dashboard:
1. Open SQL Editor
2. Copy and paste the contents of `backend/migrations/042_verify_rls_policies.sql`
3. Run the migration
4. Check the output logs to see member/event counts

The migration will:
- Drop all conflicting RLS policies
- Create new permissive policies that allow all operations
- Reload the PostgREST schema cache
- Log the current member and event counts

### 2. Verify Data Exists in Supabase

Run this query in Supabase SQL Editor:

```sql
-- Check member count
SELECT COUNT(*) as member_count FROM members;

-- Check event count
SELECT COUNT(*) as event_count FROM events;

-- View first 5 members
SELECT id, name, pin, is_admin FROM members LIMIT 5;

-- View first 5 events
SELECT id, name, date, venue, status FROM events LIMIT 5;
```

### 3. Test the Backend API Directly

Open your browser and visit these URLs to test if the backend is returning data:

**Members:**
```
https://api.j382mhvmbvtqiifrytg5g.rork.app/api/trpc/members.getAll
```

**Events:**
```
https://api.j382mhvmbvtqiifrytg5g.rork.app/api/trpc/events.getAll
```

You should see JSON responses with your data.

### 4. Check App Console Logs

In the app, check the console output for:
- `✅ [AuthContext] Successfully fetched members:` - Should show member count
- `✅ [EventsContext] Successfully fetched events:` - Should show event count
- `📥 Fetching all members from database...` - Backend query log
- `📥 Fetching all events from database...` - Backend query log

Look for any error messages with `❌`

### 5. Restart the App

After running the migration:
1. Kill the app completely
2. Restart it with `bun run start`
3. Clear the app data/cache if needed
4. Try logging in again

## Common Issues

### Issue 1: RLS Policies Blocking Access
**Symptom:** Queries return empty arrays even though data exists
**Fix:** Run migration 042 to fix RLS policies

### Issue 2: Anon Key Permissions
**Symptom:** Permission denied errors in console
**Fix:** Ensure the `anon` role in Supabase has SELECT, INSERT, UPDATE, DELETE permissions

### Issue 3: PostgREST Cache
**Symptom:** Changes to database schema/policies don't take effect
**Fix:** Restart your Supabase project or run `NOTIFY pgrst, 'reload schema';`

### Issue 4: Network/CORS Issues
**Symptom:** Network errors when fetching data
**Fix:** Check Supabase URL and anon key in `env` file

## Verification Checklist

- [ ] Migration 042 ran successfully
- [ ] Members table has data (query returns count > 0)
- [ ] Events table has data (query returns count > 0)
- [ ] RLS is enabled on tables
- [ ] RLS policies are permissive (allow all operations)
- [ ] Backend API responds with data when tested directly
- [ ] App console shows successful fetch logs
- [ ] App displays members on Members tab
- [ ] App displays events on Dashboard tab

## Next Steps

If data still doesn't appear after following all steps:

1. **Check the exact error message** in the app console
2. **Test the backend API** directly in browser/Postman
3. **Verify Supabase connection** - check URL and anon key
4. **Check network tab** in browser dev tools for failed requests
5. **Look for TypeScript errors** that might be preventing renders

## Contact

If the issue persists, provide:
- Console error logs (both client and backend)
- Response from backend API when tested directly
- Result of SQL queries showing data exists
- Screenshots of the RLS policies in Supabase dashboard
