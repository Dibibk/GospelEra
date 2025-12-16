-- =============================================================================
-- SUPABASE NEW TABLES MIGRATION
-- =============================================================================
-- This file creates NEW tables in Supabase to receive data from Replit/Neon DB
-- DOES NOT modify any existing tables (profiles, posts, prayer_*, bookmarks, reactions)
-- Run this in Supabase SQL Editor BEFORE running the migration script
-- =============================================================================

-- =============================================================================
-- TABLE: comments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.comments (
    id BIGSERIAL PRIMARY KEY,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    deleted BOOLEAN DEFAULT FALSE NOT NULL,
    hidden BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Everyone can read non-deleted, non-hidden comments
CREATE POLICY "comments_select_public" ON public.comments
    FOR SELECT TO authenticated
    USING (deleted = false AND hidden = false);

-- Admins can read all comments
CREATE POLICY "comments_select_admin" ON public.comments
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own comments
CREATE POLICY "comments_insert_own" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (author_id = auth.uid());

-- Users can update their own comments, admins can update any
CREATE POLICY "comments_update_own" ON public.comments
    FOR UPDATE TO authenticated
    USING (
        author_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can soft-delete their own comments, admins can delete any
CREATE POLICY "comments_delete_own" ON public.comments
    FOR DELETE TO authenticated
    USING (
        author_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Indexes for comments
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_author_id ON public.comments(author_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);

-- =============================================================================
-- TABLE: donations
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.donations (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    amount_cents INTEGER NOT NULL,
    currency TEXT DEFAULT 'USD' NOT NULL,
    message TEXT,
    provider TEXT DEFAULT 'pending' NOT NULL,
    provider_ref TEXT,
    stripe_session_id TEXT,
    status TEXT DEFAULT 'initiated' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for donations
ALTER TABLE public.donations ENABLE ROW LEVEL SECURITY;

-- Users can view their own donations
CREATE POLICY "donations_select_own" ON public.donations
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all donations
CREATE POLICY "donations_select_admin" ON public.donations
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own donations
CREATE POLICY "donations_insert_own" ON public.donations
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Only admins can update donations (status changes via webhooks)
CREATE POLICY "donations_update_admin" ON public.donations
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Index for donations
CREATE INDEX IF NOT EXISTS idx_donations_user_id ON public.donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON public.donations(status);

-- =============================================================================
-- TABLE: media_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.media_requests (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'pending' NOT NULL,
    reason TEXT NOT NULL,
    admin_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    CONSTRAINT media_requests_status_check CHECK (status IN ('pending', 'approved', 'denied'))
);

-- RLS for media_requests
ALTER TABLE public.media_requests ENABLE ROW LEVEL SECURITY;

-- Users can view their own requests
CREATE POLICY "media_requests_select_own" ON public.media_requests
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Admins can view all requests
CREATE POLICY "media_requests_select_admin" ON public.media_requests
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own requests
CREATE POLICY "media_requests_insert_own" ON public.media_requests
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Only admins can update requests
CREATE POLICY "media_requests_update_admin" ON public.media_requests
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Index for media_requests
CREATE INDEX IF NOT EXISTS idx_media_requests_user_id ON public.media_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_media_requests_status ON public.media_requests(status);

-- =============================================================================
-- TABLE: notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id BIGSERIAL PRIMARY KEY,
    recipient_id UUID NOT NULL,
    actor_id UUID,
    event_type TEXT NOT NULL,
    post_id BIGINT,
    comment_id BIGINT,
    prayer_request_id BIGINT,
    commitment_id BIGINT,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    read_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only view their own notifications
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT TO authenticated
    USING (recipient_id = auth.uid());

-- System can insert notifications for any user
CREATE POLICY "notifications_insert" ON public.notifications
    FOR INSERT TO authenticated
    WITH CHECK (true);

-- Users can update their own notifications (mark as read)
CREATE POLICY "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated
    USING (recipient_id = auth.uid());

-- Users can delete their own notifications
CREATE POLICY "notifications_delete_own" ON public.notifications
    FOR DELETE TO authenticated
    USING (recipient_id = auth.uid());

-- Indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
    ON public.notifications(recipient_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);

-- =============================================================================
-- TABLE: push_tokens
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.push_tokens (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID NOT NULL,
    token TEXT NOT NULL,
    platform TEXT DEFAULT 'web' NOT NULL,
    daily_verse_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for push_tokens
ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

-- Users can view their own tokens
CREATE POLICY "push_tokens_select_own" ON public.push_tokens
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

-- Users can insert their own tokens
CREATE POLICY "push_tokens_insert_own" ON public.push_tokens
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

-- Users can update their own tokens
CREATE POLICY "push_tokens_update_own" ON public.push_tokens
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid());

-- Users can delete their own tokens
CREATE POLICY "push_tokens_delete_own" ON public.push_tokens
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Indexes for push_tokens
CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.push_tokens(token);

-- =============================================================================
-- ALTER EXISTING TABLES (ADD MISSING COLUMNS ONLY - NO DESTRUCTIVE CHANGES)
-- =============================================================================

-- Add missing columns to profiles if they don't exist
DO $$
BEGIN
    -- Add first_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'first_name') THEN
        ALTER TABLE public.profiles ADD COLUMN first_name TEXT;
    END IF;
    
    -- Add last_name if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'last_name') THEN
        ALTER TABLE public.profiles ADD COLUMN last_name TEXT;
    END IF;
    
    -- Add email if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'email') THEN
        ALTER TABLE public.profiles ADD COLUMN email TEXT;
    END IF;
    
    -- Add settings if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'settings') THEN
        ALTER TABLE public.profiles ADD COLUMN settings JSONB DEFAULT '{}' NOT NULL;
    END IF;
    
    -- Add media_enabled if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'media_enabled') THEN
        ALTER TABLE public.profiles ADD COLUMN media_enabled BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    -- Add updated_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'profiles' AND column_name = 'updated_at') THEN
        ALTER TABLE public.profiles ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Add missing columns to posts if they don't exist
DO $$
BEGIN
    -- Add title if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'title') THEN
        ALTER TABLE public.posts ADD COLUMN title TEXT DEFAULT '' NOT NULL;
    END IF;
    
    -- Add media_urls if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'media_urls') THEN
        ALTER TABLE public.posts ADD COLUMN media_urls TEXT[] DEFAULT '{}' NOT NULL;
    END IF;
    
    -- Add embed_url if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'embed_url') THEN
        ALTER TABLE public.posts ADD COLUMN embed_url TEXT;
    END IF;
    
    -- Add moderation_status if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'moderation_status') THEN
        ALTER TABLE public.posts ADD COLUMN moderation_status TEXT DEFAULT 'approved' NOT NULL;
    END IF;
    
    -- Add moderation_reason if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'moderation_reason') THEN
        ALTER TABLE public.posts ADD COLUMN moderation_reason TEXT;
    END IF;
    
    -- Add hidden if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'hidden') THEN
        ALTER TABLE public.posts ADD COLUMN hidden BOOLEAN DEFAULT FALSE NOT NULL;
    END IF;
    
    -- Add updated_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'posts' AND column_name = 'updated_at') THEN
        ALTER TABLE public.posts ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- Add missing columns to prayer_requests if they don't exist
DO $$
BEGIN
    -- Add embed_url if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prayer_requests' AND column_name = 'embed_url') THEN
        ALTER TABLE public.prayer_requests ADD COLUMN embed_url TEXT;
    END IF;
    
    -- Add moderation_status if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prayer_requests' AND column_name = 'moderation_status') THEN
        ALTER TABLE public.prayer_requests ADD COLUMN moderation_status TEXT DEFAULT 'approved' NOT NULL;
    END IF;
    
    -- Add moderation_reason if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prayer_requests' AND column_name = 'moderation_reason') THEN
        ALTER TABLE public.prayer_requests ADD COLUMN moderation_reason TEXT;
    END IF;
    
    -- Add updated_at if not exists
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'prayer_requests' AND column_name = 'updated_at') THEN
        ALTER TABLE public.prayer_requests ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL;
    END IF;
END $$;

-- =============================================================================
-- GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.media_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- COMPLETION MESSAGE
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'MIGRATION TABLES CREATED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'New tables: comments, donations, media_requests, notifications, push_tokens';
    RAISE NOTICE 'Added missing columns to: profiles, posts, prayer_requests';
    RAISE NOTICE 'All tables have Row Level Security enabled';
    RAISE NOTICE '==============================================';
END $$;
