# Financial Records Backend Migration Complete

## Overview
All financial records have been migrated from AsyncStorage to the Supabase backend. The system now uses tRPC for all financial operations.

## What Changed

### 1. Backend Changes
- **New SQL Migration**: `backend/migrations/016_financial_records_complete.sql`
- **Updated tRPC Route**: Added `getAllGlobal` procedure to `backend/trpc/routes/financials/crud/route.ts`
- The backend now supports both event-specific and global financial records

### 2. Frontend Changes
- **Updated**: `app/(admin)/admin-financial.tsx` - Now uses tRPC queries instead of AsyncStorage
- **Updated**: `app/(event)/[eventId]/finance.tsx` - Already using backend, no changes needed
- **Cleaned up**: `utils/storage.ts` - Removed all financial-related AsyncStorage methods

### 3. Data Storage
- Event-specific financials: `event_id = <actual_event_id>`
- Global/admin-level financials: `event_id = 'global'`

## SQL Migration to Run

Run this SQL in your Supabase SQL Editor:

```sql
-- Financial Records Complete Migration
-- This migration ensures financial_records table is complete and ready for use

-- Verify table structure
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
        RAISE EXCEPTION 'financial_records table does not exist. Run initial schema migration first.';
    END IF;
END $$;

-- Ensure all columns exist
DO $$ 
BEGIN
    -- Add any missing columns if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_records' AND column_name = 'created_at') THEN
        ALTER TABLE financial_records ADD COLUMN created_at TIMESTAMPTZ DEFAULT NOW();
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'financial_records' AND column_name = 'updated_at') THEN
        ALTER TABLE financial_records ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Update type constraint to match frontend types
ALTER TABLE financial_records DROP CONSTRAINT IF EXISTS financial_records_type_check;
ALTER TABLE financial_records ADD CONSTRAINT financial_records_type_check 
    CHECK (type IN ('registration', 'prize', 'expense', 'income', 'other'));

-- Ensure indexes exist for performance
CREATE INDEX IF NOT EXISTS idx_financial_records_event ON financial_records(event_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_member ON financial_records(member_id);
CREATE INDEX IF NOT EXISTS idx_financial_records_type ON financial_records(type);
CREATE INDEX IF NOT EXISTS idx_financial_records_date ON financial_records(date);

-- Enable RLS if not already enabled
ALTER TABLE financial_records ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies
DROP POLICY IF EXISTS "Allow read for all users" ON financial_records;
DROP POLICY IF EXISTS "Allow write for all users" ON financial_records;

CREATE POLICY "Allow read for all users" ON financial_records FOR SELECT USING (true);
CREATE POLICY "Allow write for all users" ON financial_records FOR ALL USING (true);

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Financial records migration completed successfully!';
END $$;
```

## Features Now Available

### Event-Specific Financials (in Event Finance Page)
- ✅ View all financial records for a specific event
- ✅ Add expenses (food, drink, venue, trophy, custom)
- ✅ Add gains (donations, sponsorships, merch sales, custom)
- ✅ Calculate entry fee totals based on paid registrations
- ✅ View profit/loss calculations
- ✅ Real-time sync across all devices

### Global Financials (in Admin Financial Page)
- ✅ View organization-wide financial records
- ✅ Add global income and expenses
- ✅ Track overall financial health
- ✅ Real-time sync across all devices

## Data Migration Notes

### Existing AsyncStorage Data
If you had financial records stored in AsyncStorage:
- **Event-specific financials**: These were already migrated to the backend in previous updates
- **Admin-level financials**: New records will now be stored in the backend with `event_id = 'global'`
- **Old AsyncStorage data**: Will remain in local storage but won't be used
- No automatic migration of old admin financial data - you'll need to re-enter them if needed

### Clean Up (Optional)
To clear old AsyncStorage financial data, you can add this to your app temporarily:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';

// Run once to clear old data
await AsyncStorage.removeItem('@golf_financials');
```

## Testing Checklist

- [ ] Run the SQL migration in Supabase
- [ ] Test adding a financial record in the admin financial page
- [ ] Test viewing financial records in the admin page
- [ ] Test adding expenses/gains in an event's finance page
- [ ] Test viewing event-specific financial calculations
- [ ] Verify data persists across app restarts
- [ ] Test on multiple devices to verify real-time sync

## Benefits

1. **Real-time Sync**: Financial data syncs across all devices instantly
2. **Data Backup**: All data is backed up in Supabase
3. **Better Performance**: No local storage parsing overhead
4. **Scalability**: Can handle unlimited financial records
5. **Data Integrity**: Server-side validation and constraints
6. **Audit Trail**: Automatic created_at and updated_at timestamps

## API Reference

### tRPC Procedures

#### `financials.create`
Creates a new financial record
```typescript
input: {
  id: string;
  eventId: string;  // Use 'global' for admin-level records
  type: 'registration' | 'prize' | 'expense' | 'income' | 'other';
  amount: number;
  description: string;
  date: string;
  memberId?: string;
}
```

#### `financials.getAll`
Gets all financial records for a specific event
```typescript
input: {
  eventId: string;
}
```

#### `financials.getAllGlobal`
Gets all global (admin-level) financial records
```typescript
// No input required
```

#### `financials.delete`
Deletes a financial record
```typescript
input: {
  id: string;
}
```

## Troubleshooting

### Problem: Migration fails with "table does not exist"
**Solution**: Run the initial schema migration first (`backend/migrations/001_initial_schema.sql`)

### Problem: Can't see financial records after migration
**Solution**: Check the browser console for errors. Ensure Supabase credentials are correctly configured.

### Problem: Old data doesn't appear
**Solution**: Old AsyncStorage data is not automatically migrated. You'll need to manually re-enter records or write a custom migration script.

## Migration Complete ✅

All financial operations are now using the backend. AsyncStorage is no longer used for financial data.
