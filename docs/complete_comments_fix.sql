/*
  COMPLETE FIX FOR COMMENTS RLS ISSUES
  
  Run this entire script in your Supabase SQL Editor to fix comment deletion issues.
  This will completely reset and fix all RLS policies for comments.
*/

-- First, disable RLS temporarily to clean up
ALTER TABLE public.comments DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Anyone authenticated can view non-deleted comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;

-- Re-enable RLS
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Create comprehensive policies

-- 1. SELECT policy - anyone can read non-deleted comments
CREATE POLICY "comments_select_policy" ON public.comments
    FOR SELECT TO authenticated
    USING (is_deleted = false);

-- 2. INSERT policy - users can create comments as themselves
CREATE POLICY "comments_insert_policy" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = author);

-- 3. UPDATE policy - authors can update their own comments (including soft delete)
CREATE POLICY "comments_update_policy" ON public.comments
    FOR UPDATE TO authenticated
    USING (auth.uid() = author)
    WITH CHECK (auth.uid() = author);

-- 4. DELETE policy - authors can delete their own comments (just in case)
CREATE POLICY "comments_delete_policy" ON public.comments
    FOR DELETE TO authenticated
    USING (auth.uid() = author);

-- Ensure proper table permissions
GRANT ALL ON public.comments TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE comments_id_seq TO authenticated;

-- Also make sure the comments table has proper structure
ALTER TABLE public.comments ALTER COLUMN is_deleted SET DEFAULT false;
ALTER TABLE public.comments ALTER COLUMN is_deleted SET NOT NULL;