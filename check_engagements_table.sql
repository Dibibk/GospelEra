-- Check the exact structure of the engagements/bookmarks table
-- Run this to see what the table is actually called and what columns it has

-- First, find tables that might be for bookmarks/engagements
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name LIKE '%engagement%' 
   OR table_name LIKE '%bookmark%'
   OR table_name LIKE '%amen%';

-- Check if there's an engagements table and its columns
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'engagements'
ORDER BY ordinal_position;

-- Check if there's a bookmarks table instead
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'bookmarks'
ORDER BY ordinal_position;

-- Show all tables to see what's available
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;