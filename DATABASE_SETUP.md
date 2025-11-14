# Backend Database Setup Complete

## ✅ Database Already Set Up

Your Supabase database is already configured with all necessary tables from previous migrations:

### Tables Created
- ✅ `members` - All member/player data
- ✅ `events` - Tournament and social events
- ✅ `event_registrations` - Player registrations
- ✅ `groupings` - Player pairings
- ✅ `scores` - Player scores
- ✅ `financial_records` - Financial transactions
- ✅ `sync_status` - Sync tracking

### Applied Migrations
- ✅ `001_initial_schema.sql`
- ✅ `002_drop_and_recreate.sql`

## 🔧 No Additional Setup Required

The existing database schema supports all the new CRUD operations:

### Members CRUD ✅
```sql
-- Already supports:
SELECT * FROM members;                    -- getAll
SELECT * FROM members WHERE id = $1;      -- get
SELECT * FROM members WHERE pin = $1;     -- getByPin
INSERT INTO members ...;                  -- create
UPDATE members SET ... WHERE id = $1;     -- update
DELETE FROM members WHERE id = $1;        -- delete
```

### Events CRUD ✅
```sql
-- Already supports:
SELECT * FROM events;                     -- getAll
SELECT * FROM events WHERE id = $1;       -- get
INSERT INTO events ...;                   -- create
UPDATE events SET ... WHERE id = $1;      -- update
DELETE FROM events WHERE id = $1;         -- delete
```

### Event Registrations ✅
```sql
-- Already supports:
SELECT * FROM event_registrations 
WHERE event_id = $1 AND member_id = $2;   -- check registration

INSERT INTO event_registrations ...;       -- register
DELETE FROM event_registrations 
WHERE event_id = $1 AND member_id = $2;   -- unregister
```

## 📊 Current Database Features

### Foreign Keys (Already Set Up)
- `event_registrations.event_id` → `events.id` (CASCADE DELETE)
- `event_registrations.member_id` → `members.id` (CASCADE DELETE)
- `groupings.event_id` → `events.id` (CASCADE DELETE)
- `scores.event_id` → `events.id` (CASCADE DELETE)
- `scores.member_id` → `members.id` (CASCADE DELETE)

**What this means**: 
- Deleting an event automatically deletes its registrations, groupings, and scores
- Deleting a member automatically removes their registrations and scores

### Indexes (Already Optimized)
- `members.pin` - Fast login lookups
- `members.email` - Fast email searches
- `events.status` - Fast status filtering
- `events.date` - Fast date sorting
- `event_registrations.event_id` - Fast registration lookups
- `event_registrations.member_id` - Fast member event lookups

### Unique Constraints (Already Enforced)
- `event_registrations(event_id, member_id)` - Prevents duplicate registrations
- `groupings(event_id, day, hole)` - Prevents duplicate groupings
- `scores(event_id, member_id, day)` - Prevents duplicate scores per day

## 🔐 Row Level Security (RLS)

### Current Policy
```sql
-- All tables have read access for authenticated users
CREATE POLICY "Allow read for all users" 
ON [table] FOR SELECT USING (true);
```

### ⚠️ Write Permissions
Currently, ALL authenticated users can:
- Create/update/delete members
- Create/update/delete events
- Register/unregister for events

### 🔒 Recommended: Admin-Only Writes

To restrict write operations to admins only, run this SQL:

```sql
-- Drop existing permissive policies
DROP POLICY IF EXISTS "Allow read for all users" ON members;
DROP POLICY IF EXISTS "Allow read for all users" ON events;
DROP POLICY IF EXISTS "Allow read for all users" ON event_registrations;

-- Allow read for everyone
CREATE POLICY "Allow read for all users" 
ON members FOR SELECT USING (true);

CREATE POLICY "Allow read for all users" 
ON events FOR SELECT USING (true);

CREATE POLICY "Allow read for all users" 
ON event_registrations FOR SELECT USING (true);

-- Allow admins to write to members
CREATE POLICY "Allow admin write to members" 
ON members FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE id = auth.uid()::text 
    AND is_admin = true
  )
);

-- Allow admins to write to events
CREATE POLICY "Allow admin write to events" 
ON events FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE id = auth.uid()::text 
    AND is_admin = true
  )
);

-- Allow users to register themselves
CREATE POLICY "Allow self registration" 
ON event_registrations FOR INSERT WITH CHECK (
  member_id = auth.uid()::text
);

-- Allow users to unregister themselves
CREATE POLICY "Allow self unregistration" 
ON event_registrations FOR DELETE USING (
  member_id = auth.uid()::text
);

-- Allow admins to manage all registrations
CREATE POLICY "Allow admin manage registrations" 
ON event_registrations FOR ALL USING (
  EXISTS (
    SELECT 1 FROM members 
    WHERE id = auth.uid()::text 
    AND is_admin = true
  )
);
```

### 📝 Note on Authentication

The RLS policies above assume you're using Supabase Auth where `auth.uid()` returns the current user's ID.

If you're using the PIN-based login system (custom auth), you might need to:

1. **Option A**: Implement Supabase Auth integration
2. **Option B**: Use service role key (bypasses RLS)
3. **Option C**: Pass admin check in API layer (current approach)

**Current approach** works because tRPC runs with service role credentials, so RLS is currently bypassed. The admin check happens in your app logic.

## 🧪 Verify Database Setup

Run these queries in Supabase SQL Editor:

```sql
-- Check all tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- Should return:
-- event_registrations
-- events
-- financial_records
-- groupings
-- members
-- scores
-- sync_status

-- Check foreign keys
SELECT
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY';

-- Check indexes
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public'
ORDER BY tablename, indexname;
```

## 🚀 You're Ready!

Your database is fully set up and ready to use with the new backend system. No additional setup required!

### Next Steps
1. ✅ Database schema is ready
2. ✅ tRPC routes are created
3. ✅ Contexts updated to use backend
4. ⏭️ Test the app!

### Testing
1. Open the app
2. Login with PIN
3. Create a new event → Check Supabase dashboard
4. Register for event → Check event_registrations table
5. Create a new member → Check members table

All data should appear in Supabase immediately! 🎉
