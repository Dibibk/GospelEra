/*
  COMPLETE DATABASE FIX FOR ALL RLS ISSUES
  
  Run this entire script in your Supabase SQL Editor to fix ALL deletion issues.
  This covers both posts and comments with proper RLS policies.
*/

-- ========================================
-- FIX POSTS TABLE RLS POLICIES
-- ========================================

ALTER TABLE public.posts DISABLE ROW LEVEL SECURITY;

-- Drop all existing post policies
DROP POLICY IF EXISTS "Anyone authenticated can view non-deleted posts" ON public.posts;
DROP POLICY IF EXISTS "Users can create posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can update own posts" ON public.posts;
DROP POLICY IF EXISTS "Authors can delete own posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can update all posts" ON public.posts;
DROP POLICY IF EXISTS "Admins can delete all posts" ON public.posts;
DROP POLICY IF EXISTS "posts_select_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_update_policy" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_policy" ON public.posts;

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Create comprehensive post policies
CREATE POLICY "posts_select_policy" ON public.posts
    FOR SELECT TO authenticated
    USING (is_deleted = false);

CREATE POLICY "posts_insert_policy" ON public.posts
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author);

CREATE POLICY "posts_update_policy" ON public.posts
    FOR UPDATE TO authenticated
    USING (auth.uid() = author)
    WITH CHECK (auth.uid() = author);

CREATE POLICY "posts_delete_policy" ON public.posts
    FOR DELETE TO authenticated
    USING (auth.uid() = author);

-- ========================================
-- FIX COMMENTS TABLE RLS POLICIES
-- ========================================

ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;

-- Drop all existing comment policies
DROP POLICY IF EXISTS "Anyone authenticated can view non-deleted comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;
DROP POLICY IF EXISTS "comments_select_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_update_policy" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON public.comments;

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create comprehensive comment policies
CREATE POLICY "comments_select_policy" ON public.comments
    FOR SELECT TO authenticated
    USING (is_deleted = false);

CREATE POLICY "comments_insert_policy" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author);

CREATE POLICY "comments_update_policy" ON public.comments
    FOR UPDATE TO authenticated
    USING (auth.uid() = author)
    WITH CHECK (auth.uid() = author);

CREATE POLICY "comments_delete_policy" ON public.comments
    FOR DELETE TO authenticated
    USING (auth.uid() = author);

-- ========================================
-- ENSURE PROPER PERMISSIONS
-- ========================================

GRANT ALL ON public.posts TO authenticated;
GRANT ALL ON public.comments TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ========================================
-- ENSURE PROPER TABLE STRUCTURE
-- ========================================

ALTER TABLE public.posts ALTER COLUMN is_deleted SET DEFAULT false;
ALTER TABLE public.posts ALTER COLUMN is_deleted SET NOT NULL;

ALTER TABLE public.comments ALTER COLUMN is_deleted SET DEFAULT false;
ALTER TABLE public.comments ALTER COLUMN is_deleted SET NOT NULL;