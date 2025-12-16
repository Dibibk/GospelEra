/*
  FIX COMMENTS RLS POLICIES
  
  This fixes the Row Level Security issues for comment deletion.
  Run this in your Supabase SQL Editor.
*/

-- Drop existing comment policies to recreate them properly
DROP POLICY IF EXISTS "Anyone authenticated can view non-deleted comments" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can update own comments" ON public.comments;
DROP POLICY IF EXISTS "Authors can delete own comments" ON public.comments;

-- Recreate comment policies with proper permissions

-- Anyone authenticated can view non-deleted comments
CREATE POLICY "Anyone authenticated can view non-deleted comments"
  ON public.comments FOR SELECT
  TO authenticated
  USING (is_deleted = false);

-- Users can insert comments (they become the author)
CREATE POLICY "Users can create comments"
  ON public.comments FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author);

-- Authors can update their own comments (including soft delete)
CREATE POLICY "Authors can update own comments"
  ON public.comments FOR UPDATE
  TO authenticated
  USING (auth.uid() = author)
  WITH CHECK (auth.uid() = author);

-- Authors can hard delete their own comments (if needed)
CREATE POLICY "Authors can delete own comments"
  ON public.comments FOR DELETE
  TO authenticated
  USING (auth.uid() = author);

-- Grant necessary permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;