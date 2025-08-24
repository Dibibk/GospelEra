Test Database Setup Instructions
=====================================

This directory contains all SQL files needed to set up your Supabase test database
that replicates your production database structure and optimizations.

SETUP ORDER:
1. Create new Supabase project for testing
2. Run these SQL files IN ORDER in your new Supabase SQL Editor:

   00_complete_schema.sql       - Creates all 11 tables with proper schema
   01_indexes.sql              - Adds performance indexes  
   02_partitions.sql           - Partition setup for scalability
   03_archive_retention.sql    - Archive and cleanup system
   04_prune_stale.sql          - Data pruning automation
   05_counters_leaderboard.sql - Prayer leaderboard + smart counters
   06_autovacuum.sql           - Database optimization settings
   07_fulltext.sql             - Full-text search indexes

3. Copy RLS policies from your production Supabase:
   - Go to Authentication → Policies → View SQL (in production)
   - Copy all policies
   - Run in new test database

4. Update environment variables:
   - Set new DATABASE_URL for testing
   - Set new VITE_SUPABASE_URL for testing
   - Set new VITE_SUPABASE_ANON_KEY for testing

RESULT:
- Clean test database with same structure as production
- All performance optimizations included
- Ready for safe development and testing