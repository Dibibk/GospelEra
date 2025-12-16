/*
  COMPLETE FIX FOR POSTS RLS ISSUES
  
  Run this entire script in your Supabase SQL Editor to fix post deletion issues.
  This will completely reset and fix all RLS policies for posts.
*/

-- First, disable RLS temporarily to clean up
ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone authenticated can view non-deleted posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete all posts" ON public.posts;

-- Re-enable RLS
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies

-- 1. SELECT policy - anyone can read non-deleted posts
CREATE POLICY "posts_select_policy" ON public.posts
    FOR SELECT TO authenticated
    USING (is_deleted = false);

-- 2. INSERT policy - users can create posts as themselves
CREATE POLICY "posts_insert_policy" ON public.posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author);

-- 3. UPDATE policy - authors can update their own posts (including soft delete)
CREATE POLICY "posts_update_policy" ON public.posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = author)
    WITH CHECK (auth.uid() = author);

-- 4. DELETE policy - authors can delete their own posts
CREATE POLICY "posts_delete_policy" ON public.posts
    FOR DELETE TO authenticated
    USING (auth.uid() = author);

-- Ensure proper table permissions
GRANT ALL ON public.posts TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE posts_id_seq TO authenticated;

-- Also make sure the posts table has proper structure
ALTER TABLE public.posts ALTER COLUMN is_deleted SET DEFAULT false;
ALTER TABLE public.posts ALTER COLUMN is_deleted SET NOT NULL;