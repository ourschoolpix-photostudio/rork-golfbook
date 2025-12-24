-- ============================================================================
-- ONE-TIME MIGRATION: Set all players as male
-- This updates all members in the database to have gender = 'male'
-- Run this directly in Supabase SQL Editor
-- ============================================================================

UPDATE members 
SET gender = 'male', 
    updated_at = NOW()
WHERE gender IS NULL OR gender != 'male';

-- Verification query
SELECT 
    COUNT(*) as total_members,
    COUNT(CASE WHEN gender = 'male' THEN 1 END) as male_count,
    COUNT(CASE WHEN gender = 'female' THEN 1 END) as female_count,
    COUNT(CASE WHEN gender IS NULL THEN 1 END) as null_count
FROM members;
