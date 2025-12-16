-- Diagnostic query to check actual database structure
-- Run this to see what columns exist in each table

-- Check if tables exist and their columns
SELECT table_name, column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name IN ('posts', 'comments', 'engagements', 'prayer_requests', 'prayer_commitments')
ORDER BY table_name, ordinal_position;

-- Check table names that actually exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- If engagements table exists, show its structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'engagements'
ORDER BY ordinal_position;