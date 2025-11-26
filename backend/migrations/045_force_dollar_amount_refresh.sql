-- Force schema refresh for dollar_amount column
-- This ensures the column is properly recognized in the schema cache

-- First, ensure the column exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name='personal_games' 
        AND column_name='dollar_amount'
    ) THEN
        ALTER TABLE personal_games
        ADD COLUMN dollar_amount DECIMAL(10, 2);
    END IF;
END $$;

-- Add comment to force schema reload
COMMENT ON COLUMN personal_games.dollar_amount IS 'Dollar amount per point/hole for betting games like Wolf';

-- Refresh the schema cache by touching the table
ALTER TABLE personal_games ALTER COLUMN dollar_amount SET DEFAULT NULL;

-- Notify PostgREST to reload schema (this helps with Supabase)
NOTIFY pgrst, 'reload schema';
