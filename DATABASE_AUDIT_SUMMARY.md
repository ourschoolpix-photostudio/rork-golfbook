# Database Audit Summary

**Date:** December 11, 2025  
**Purpose:** Complete database schema audit and missing column/table detection

## Executive Summary

I've conducted a comprehensive audit of your database schema by:
1. Reviewing all migration files
2. Analyzing the DATABASE_SCHEMA.md documentation
3. Cross-referencing with TypeScript types and code usage
4. Comparing what migrations claimed to add vs what might be missing

## Key Findings

### ✅ Tables Expected to Exist (14 total)
All core tables should exist, but may be missing columns:

1. **members** - Core user/member data
2. **events** - Tournament and social events
3. **event_registrations** - Registration tracking with email status
4. **groupings** - Player groupings by day/hole
5. **scores** - Player scores per event
6. **financial_records** - Financial transaction tracking
7. **sync_status** - Synchronization tracking
8. **organization_settings** - Organization-wide settings
9. **courses** - Golf course definitions
10. **personal_games** - Personal games (Wolf, Niners, etc.)
11. **notifications** - User notifications
12. **user_preferences** - User-specific preferences
13. **offline_operations** - Offline operation queue
14. **table_assignments** - Social event seating arrangements

### 🔍 Critical Missing Columns That Were Causing Errors

#### 1. event_registrations.email_sent
- **Status:** Was missing, causing the PGRST204 error you reported
- **Purpose:** Track whether admin has sent email for registration
- **Used in:** Registration management, email indicator logic
- **Migration:** email_sent_tracking.sql (may not have been run)

#### 2. event_registrations.is_custom_guest & custom_guest_name
- **Status:** Should exist from custom guests migration
- **Purpose:** Support custom guests without full member profiles
- **Used in:** Social event registrations
- **Migration:** final_custom_guests_fix.sql

#### 3. events.archived & archived_at
- **Status:** Added in add_archived_column.sql
- **Purpose:** Archive old events from dashboard
- **Used in:** Dashboard, archived events screen

#### 4. events.day1_course_id, day2_course_id, day3_course_id
- **Status:** Should link to courses table
- **Purpose:** Reference course definitions instead of text fields
- **Migration:** 100_comprehensive_schema.sql

#### 5. members.board_member_roles
- **Status:** Should be TEXT[] array
- **Purpose:** Track board member roles
- **Migration:** 100_comprehensive_schema.sql

#### 6. members.pin_hashed
- **Status:** Tracks PIN hashing migration status
- **Purpose:** Know if PIN is hashed or plain text
- **Migration:** pin_hashing.sql

### 🎮 Personal Games Columns (20+ columns)
The personal_games table needs extensive columns for different game types:

**Wolf Game:**
- wolf_order (rotation order)
- wolf_partnerships (partnerships per hole)
- wolf_scores (point tracking)
- wolf_rules (game rules)
- dollar_amount (betting amount)

**Niners Game:**
- niners_front_9_bet
- niners_back_9_bet
- niners_overall_bet

**Individual Score Game:**
- front_9_bet
- back_9_bet
- overall_bet

**Team Match Play:**
- team1_name
- team2_name
- match_status

**Common:**
- game_type
- handicaps_enabled
- strokes_aside
- pot_bet
- pot_players

## What The Audit Script Does

The script `backend/migrations/999_complete_audit_and_fix.sql` performs:

### Phase 1: Audit
- Checks for existence of all 14 required tables
- Reports any missing tables

### Phase 2: Fix Missing Columns
For each table, adds any missing columns:
- **members:** board_member_roles, pin_hashed
- **events:** day1/2/3_course_id, archived, archived_at
- **event_registrations:** email_sent, is_custom_guest, custom_guest_name
- **courses:** All 10 course-related columns
- **organization_settings:** Rolex points columns
- **personal_games:** All 23+ game-specific columns
- **table_assignments:** Ensures table exists

### Phase 3: Fix Constraints
- Makes event_registrations.member_id nullable (for custom guests)
- Drops old unique constraint on (event_id, member_id)
- Creates partial unique index for members only
- Adds check constraint to validate custom guest data
- Adds foreign keys from events to courses table

### Phase 4: Create Indexes
Creates 40+ indexes for performance:
- Lookup indexes (pin, email, status, date)
- Foreign key indexes
- Partial indexes for filtered queries
- GIN indexes for array columns

### Phase 5: Enable RLS
Ensures Row Level Security is enabled on all tables

### Phase 6: Verification
Reports final counts:
- Number of tables
- Number of columns
- Number of indexes
- Lists key features verified

## How to Use the Script

### Option 1: Run via Supabase Dashboard
1. Go to your Supabase project
2. Navigate to SQL Editor
3. Paste the contents of `backend/migrations/999_complete_audit_and_fix.sql`
4. Click "Run"
5. Review the NOTICE messages for what was added/fixed

### Option 2: Run via Supabase CLI (if available)
```bash
supabase db reset --db-url "your-connection-string"
```

## Expected Output

When you run the script, you'll see NOTICE messages like:
```
NOTICE:  ============================================================
NOTICE:  STARTING DATABASE AUDIT
NOTICE:  ============================================================
NOTICE:  ✅ All required tables exist
NOTICE:  ✅ Added email_sent column to event_registrations table
NOTICE:  ✅ Added is_custom_guest column to event_registrations table
...
NOTICE:  ============================================================
NOTICE:  DATABASE AUDIT AND FIX COMPLETE
NOTICE:  ============================================================
NOTICE:  Tables verified/created: 14
NOTICE:  Total columns: 200+
NOTICE:  Total indexes: 40+
```

## Post-Migration Verification

After running the script, verify:

1. **Email Tracking Works**
   - Register a player
   - Check email_sent is false
   - Send email reminder
   - Verify email_sent becomes true

2. **Custom Guests Work**
   - Create social event
   - Add custom guest without member account
   - Verify is_custom_guest is true

3. **Event Archiving Works**
   - Archive an event from dashboard
   - Check archived is true
   - Verify it appears in Archived screen

4. **No Schema Cache Errors**
   - Previous error: "Could not find the 'email_sent' column"
   - Should be resolved after migration

## Additional Notes

### Why Migrations May Not Have Run

Common reasons columns might be missing:
1. Migration file created but never executed
2. Migration ran but had errors (check Supabase logs)
3. Database was reset/recreated after migration
4. Migration was created after database was already deployed

### Safe to Re-run

The audit script is **idempotent**, meaning:
- Safe to run multiple times
- Only adds what's missing
- Won't duplicate or break existing data
- Uses `IF NOT EXISTS` checks throughout

### Migration Order Doesn't Matter

This script checks for the presence of columns/tables, so it doesn't matter which order previous migrations ran. It will ensure everything is present.

## Files Created

1. **backend/migrations/999_complete_audit_and_fix.sql**
   - The main audit and fix script
   - Numbered 999 to run last
   - Self-documenting with extensive comments

2. **DATABASE_AUDIT_SUMMARY.md** (this file)
   - Human-readable explanation
   - Lists all findings
   - Provides usage instructions

## Next Steps

1. **Run the audit script** in your Supabase database
2. **Review the output** to see what was missing
3. **Test the app** to verify all features work
4. **Check error logs** - the email_sent error should be gone

If you encounter any issues after running the migration, check:
- Supabase dashboard logs
- App console errors
- RLS policies (included in script)
