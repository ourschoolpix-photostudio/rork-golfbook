# Fix JSON Parse Error in Game Scoring

## Problem
You're seeing this error when trying to save game scores:
```
[QueryClient] Mutation error: TRPCClientError: JSON Parse error: Unexpected character: <
[GameScoring] Error auto-saving scores: TRPCClientError: JSON Parse error: Unexpected character: <
```

## Root Cause
The backend is trying to save/update fields in the `personal_games` table that don't exist yet in your Supabase database:
- `front_9_bet`
- `back_9_bet`
- `overall_bet`
- `pot_bet`
- `pot_players`
- `handicaps_enabled`

When Supabase can't find these columns, it returns an error, which is causing the JSON parsing issue.

## Solution

You need to run the migration on your Supabase database. I've created migration file `051_fix_betting_columns.sql`.

### Steps to Fix:

1. **Go to your Supabase Dashboard**
   - Navigate to your project at https://supabase.com
   - Go to the SQL Editor

2. **Run the migration**
   - Copy the contents of `backend/migrations/051_fix_betting_columns.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the migration

3. **Verify the columns exist**
   - Go to Table Editor → `personal_games` table
   - Check that these columns now exist:
     - front_9_bet (NUMERIC)
     - back_9_bet (NUMERIC)
     - overall_bet (NUMERIC)
     - pot_bet (NUMERIC)
     - pot_players (JSONB)
     - handicaps_enabled (BOOLEAN)

4. **Test the app**
   - Create a new game or open an existing game
   - Try scoring and saving
   - The JSON parse error should be resolved

## Alternative Quick Fix (If migration doesn't work)

If you can't run migrations right now, you can temporarily disable these fields by modifying the backend code:

In `backend/trpc/routes/games/crud/route.ts`, comment out the betting fields in the `insertData` and `updateData` objects (lines 115-120 and 229-235).

However, this is not recommended as it will break the betting functionality you just added.

## Additional Information

The migration uses a safe approach:
- It checks if columns exist before adding them
- It won't fail if columns already exist
- It refreshes the schema cache after adding columns
- It adds proper documentation comments

## Debug Logs

I've added additional logging to the backend to help debug this issue. You should now see:
- `[Games tRPC] Update data:` with the full update payload
- More detailed error messages with error codes

Check your backend logs to see what data is being sent and what errors are occurring.
