-- Database Reports Admin SQL
-- This file contains SQL commands for setting up RLS policies and role management
-- for the Gospel Era Web platform

-- =============================================================================
-- PROFILES TABLE: Role Management
-- =============================================================================

-- Ensure the profiles table supports role field with proper constraints
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' 
CHECK (role IN ('admin', 'user', 'banned'));

-- Create index on role for performance
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- =============================================================================
-- REPORTS TABLE: Row Level Security (RLS) Policies
-- =============================================================================

-- Enable RLS on reports table
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can insert reports
CREATE POLICY "authenticated_can_insert_reports" ON reports
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Policy 2: Reporters can select their own reports
CREATE POLICY "reporters_can_select_own_reports" ON reports
  FOR SELECT 
  TO authenticated 
  USING (reporter_id = auth.uid());

-- Policy 3: Admins can select all reports
CREATE POLICY "admins_can_select_all_reports" ON reports
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- Policy 4: Admins can update all reports (including status changes)
CREATE POLICY "admins_can_update_all_reports" ON reports
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'admin'
    )
  );

-- =============================================================================
-- POSTS TABLE: Ban Prevention Policies
-- =============================================================================

-- Enable RLS on posts table if not already enabled
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- Policy: Only non-banned users can insert posts
CREATE POLICY "non_banned_users_can_insert_posts" ON posts
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'banned'
    )
  );

-- Policy: Users can select posts (existing policy, modify if needed)
DROP POLICY IF EXISTS "users_can_select_posts" ON posts;
CREATE POLICY "users_can_select_posts" ON posts
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Users can update their own posts (non-banned only)
DROP POLICY IF EXISTS "users_can_update_own_posts" ON posts;
CREATE POLICY "users_can_update_own_posts" ON posts
  FOR UPDATE 
  TO authenticated 
  USING (
    author_id = auth.uid() 
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'banned'
    )
  );

-- =============================================================================
-- COMMENTS TABLE: Ban Prevention Policies
-- =============================================================================

-- Enable RLS on comments table if not already enabled
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Policy: Only non-banned users can insert comments
CREATE POLICY "non_banned_users_can_insert_comments" ON comments
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'banned'
    )
  );

-- Policy: Users can select comments (existing policy, modify if needed)
DROP POLICY IF EXISTS "users_can_select_comments" ON comments;
CREATE POLICY "users_can_select_comments" ON comments
  FOR SELECT 
  TO authenticated 
  USING (true);

-- Policy: Users can update their own comments (non-banned only)
DROP POLICY IF EXISTS "users_can_update_own_comments" ON comments;
CREATE POLICY "users_can_update_own_comments" ON comments
  FOR UPDATE 
  TO authenticated 
  USING (
    author_id = auth.uid() 
    AND NOT EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND role = 'banned'
    )
  );

-- =============================================================================
-- ADMIN MANAGEMENT
-- =============================================================================

-- How to make a user an admin:
-- 
-- Step 1: Find your user ID by running this query in Supabase SQL Editor:
-- SELECT id, email, display_name FROM profiles WHERE email = 'your-email@example.com';
--
-- Step 2: Copy your user ID and run:
-- UPDATE profiles SET role = 'admin' WHERE id = 'your-actual-user-id-here';
--
-- Quick way to make yourself admin (replace with your email):
-- UPDATE profiles SET role = 'admin' WHERE email = 'your-email@example.com';

-- How to ban a user (replace with their email or user ID):
-- UPDATE profiles SET role = 'banned' WHERE email = 'user-to-ban@example.com';
-- -- OR --
-- UPDATE profiles SET role = 'banned' WHERE id = 'user-uuid-to-ban';

-- How to restore a banned user to regular user:
-- UPDATE profiles SET role = 'user' WHERE email = 'banned-user@example.com';
-- -- OR --
-- UPDATE profiles SET role = 'user' WHERE id = 'banned-user-uuid';

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Query to check all admins:
-- SELECT id, display_name, email, role, created_at 
-- FROM profiles 
-- WHERE role = 'admin';

-- Query to check all banned users:
-- SELECT id, display_name, email, role, created_at 
-- FROM profiles 
-- WHERE role = 'banned';

-- Query to check reports that need admin attention:
-- SELECT r.*, p.display_name as reporter_name 
-- FROM reports r 
-- JOIN profiles p ON r.reporter_id = p.id 
-- WHERE r.status = 'pending' 
-- ORDER BY r.created_at DESC;

-- =============================================================================
-- NOTES
-- =============================================================================

-- 1. All RLS policies are designed to work with Supabase auth
-- 2. The auth.uid() function returns the currently authenticated user's ID
-- 3. Banned users are prevented from creating new content but can still read
-- 4. Admins have full access to reports management
-- 5. Regular users can only see their own reports
-- 6. These policies ensure data security and proper access control