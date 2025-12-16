-- Run this in Supabase SQL Editor to create bookmarks and reactions tables
-- 
-- This creates two tables for user interactions with posts:
-- 1. bookmarks - allows users to bookmark posts for later reading
-- 2. reactions - allows users to react to posts (currently only 'amen' reactions)
--
-- Both tables have Row Level Security (RLS) enabled with appropriate policies
-- to ensure users can only manage their own bookmarks/reactions while allowing
-- public read access to reaction counts for display purposes.

-- =====================================================
-- BOOKMARKS TABLE
-- =====================================================

-- Create the bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (user_id, post_id)
);

-- Enable Row Level Security for bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only view their own bookmarks
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.bookmarks
  FOR SELECT USING (auth.uid() = user_id);

-- Policy: Users can insert their own bookmarks
DROP POLICY IF EXISTS "Users can insert their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can insert their own bookmarks" ON public.bookmarks
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own bookmarks
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.bookmarks
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- REACTIONS TABLE
-- =====================================================

-- Create the reactions table
CREATE TABLE IF NOT EXISTS public.reactions (
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id BIGINT REFERENCES public.posts(id) ON DELETE CASCADE,
  kind TEXT DEFAULT 'amen' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  PRIMARY KEY (user_id, post_id, kind),
  
  -- Constraint: Only allow specific reaction types
  CONSTRAINT valid_reaction_kind CHECK (kind IN ('amen'))
);

-- Enable Row Level Security for reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can view all reactions (for aggregate counts)
DROP POLICY IF EXISTS "Everyone can view reactions for counts" ON public.reactions;
CREATE POLICY "Everyone can view reactions for counts" ON public.reactions
  FOR SELECT USING (true);

-- Policy: Users can insert their own reactions
DROP POLICY IF EXISTS "Users can insert their own reactions" ON public.reactions;
CREATE POLICY "Users can insert their own reactions" ON public.reactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own reactions
DROP POLICY IF EXISTS "Users can delete their own reactions" ON public.reactions;
CREATE POLICY "Users can delete their own reactions" ON public.reactions
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for finding bookmarks by user
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);

-- Index for finding bookmarks by post
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);

-- Index for counting reactions by post
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);

-- Index for counting reactions by post and kind
CREATE INDEX IF NOT EXISTS idx_reactions_post_kind ON public.reactions(post_id, kind);

-- Index for finding reactions by user
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

-- =====================================================
-- HELPFUL VIEWS (OPTIONAL)
-- =====================================================

-- View for getting reaction counts per post
CREATE OR REPLACE VIEW public.post_reaction_counts AS
SELECT 
  post_id,
  kind,
  COUNT(*) as count,
  ARRAY_AGG(user_id ORDER BY created_at) as user_ids
FROM public.reactions
GROUP BY post_id, kind;

-- View for getting bookmark counts per post
CREATE OR REPLACE VIEW public.post_bookmark_counts AS
SELECT 
  post_id,
  COUNT(*) as bookmark_count
FROM public.bookmarks
GROUP BY post_id;

-- Grant access to views
GRANT SELECT ON public.post_reaction_counts TO authenticated;
GRANT SELECT ON public.post_bookmark_counts TO authenticated;

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Bookmarks and Reactions tables created successfully!';
  RAISE NOTICE 'Tables: bookmarks, reactions';
  RAISE NOTICE 'Views: post_reaction_counts, post_bookmark_counts';
  RAISE NOTICE 'All tables have Row Level Security enabled with appropriate policies.';
END $$;