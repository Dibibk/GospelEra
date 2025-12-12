-- =============================================================================
-- COMPLETE SUPABASE TABLES MIGRATION
-- =============================================================================
-- This file creates ALL tables in Supabase from scratch
-- Run this in Supabase SQL Editor to set up the complete database
-- Tables are created in dependency order (base tables first)
-- =============================================================================

-- =============================================================================
-- STEP 1: BASE TABLES (no foreign key dependencies)
-- =============================================================================

-- =============================================================================
-- TABLE: profiles (BASE - no dependencies)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY,
    email TEXT,
    first_name TEXT,
    last_name TEXT,
    display_name TEXT,
    bio TEXT,
    avatar_url TEXT,
    role TEXT DEFAULT 'user' NOT NULL,
    accepted_guidelines BOOLEAN DEFAULT FALSE NOT NULL,
    affirmed_faith BOOLEAN DEFAULT FALSE NOT NULL,
    show_name_on_prayers BOOLEAN DEFAULT TRUE NOT NULL,
    private_profile BOOLEAN DEFAULT FALSE NOT NULL,
    media_enabled BOOLEAN DEFAULT FALSE NOT NULL,
    settings JSONB DEFAULT '{}' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Everyone can view profiles
CREATE POLICY IF NOT EXISTS "profiles_select_all" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- Users can insert their own profile
CREATE POLICY IF NOT EXISTS "profiles_insert_own" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK (id = auth.uid());

-- Users can update their own profile
CREATE POLICY IF NOT EXISTS "profiles_update_own" ON public.profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid());

-- Admins can update any profile
CREATE POLICY IF NOT EXISTS "profiles_update_admin" ON public.profiles
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- =============================================================================
-- TABLE: posts (BASE - no dependencies except profiles)
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.posts (
    id BIGSERIAL PRIMARY KEY,
    title TEXT DEFAULT '' NOT NULL,
    content TEXT NOT NULL,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    tags TEXT[] DEFAULT '{}' NOT NULL,
    media_urls TEXT[] DEFAULT '{}' NOT NULL,
    embed_url TEXT,
    moderation_status TEXT DEFAULT 'approved' NOT NULL,
    moderation_reason TEXT,
    hidden BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for posts
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Everyone can view non-hidden posts
CREATE POLICY IF NOT EXISTS "posts_select_public" ON public.posts
    FOR SELECT TO authenticated
    USING (hidden = false);

-- Admins can view all posts
CREATE POLICY IF NOT EXISTS "posts_select_admin" ON public.posts
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own posts
CREATE POLICY IF NOT EXISTS "posts_insert_own" ON public.posts
    FOR INSERT TO authenticated
    WITH CHECK (author_id = auth.uid());

-- Users can update their own posts, admins can update any
CREATE POLICY IF NOT EXISTS "posts_update_own" ON public.posts
    FOR UPDATE TO authenticated
    USING (
        author_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Indexes for posts
CREATE INDEX IF NOT EXISTS idx_posts_feed ON public.posts(hidden, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_posts_author ON public.posts(author_id);

-- =============================================================================
-- STEP 2: DEPENDENT TABLES (reference profiles and/or posts)
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
CREATE POLICY IF NOT EXISTS "comments_select_public" ON public.comments
    FOR SELECT TO authenticated
    USING (deleted = false AND hidden = false);

-- Admins can read all comments
CREATE POLICY IF NOT EXISTS "comments_select_admin" ON public.comments
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

-- Users can insert their own comments
CREATE POLICY IF NOT EXISTS "comments_insert_own" ON public.comments
    FOR INSERT TO authenticated
    WITH CHECK (author_id = auth.uid());

-- Users can update their own comments, admins can update any
CREATE POLICY IF NOT EXISTS "comments_update_own" ON public.comments
    FOR UPDATE TO authenticated
    USING (
        author_id = auth.uid() OR
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
    );

-- Users can soft-delete their own comments, admins can delete any
CREATE POLICY IF NOT EXISTS "comments_delete_own" ON public.comments
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
-- TABLE: bookmarks
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.bookmarks (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, post_id)
);

-- RLS for bookmarks
ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "bookmarks_select_own" ON public.bookmarks
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "bookmarks_insert_own" ON public.bookmarks
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "bookmarks_delete_own" ON public.bookmarks
    FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON public.bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON public.bookmarks(post_id);

-- =============================================================================
-- TABLE: reactions
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reactions (
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    post_id BIGINT NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
    kind TEXT DEFAULT 'amen' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    PRIMARY KEY (user_id, post_id, kind),
    CONSTRAINT valid_reaction_kind CHECK (kind IN ('amen'))
);

-- RLS for reactions
ALTER TABLE public.reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "reactions_select_all" ON public.reactions
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "reactions_insert_own" ON public.reactions
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "reactions_delete_own" ON public.reactions
    FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON public.reactions(post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON public.reactions(user_id);

-- =============================================================================
-- TABLE: reports
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    reporter_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'open' NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "reports_insert_own" ON public.reports
    FOR INSERT TO authenticated WITH CHECK (reporter_id = auth.uid());

CREATE POLICY IF NOT EXISTS "reports_select_admin" ON public.reports
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY IF NOT EXISTS "reports_update_admin" ON public.reports
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE INDEX IF NOT EXISTS idx_reports_status ON public.reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_target ON public.reports(target_type, target_id);

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

CREATE POLICY IF NOT EXISTS "donations_select_own" ON public.donations
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "donations_select_admin" ON public.donations
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY IF NOT EXISTS "donations_insert_own" ON public.donations
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "donations_update_admin" ON public.donations
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

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

CREATE POLICY IF NOT EXISTS "media_requests_select_own" ON public.media_requests
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "media_requests_select_admin" ON public.media_requests
    FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY IF NOT EXISTS "media_requests_insert_own" ON public.media_requests
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "media_requests_update_admin" ON public.media_requests
    FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'));

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

CREATE POLICY IF NOT EXISTS "notifications_select_own" ON public.notifications
    FOR SELECT TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY IF NOT EXISTS "notifications_insert" ON public.notifications
    FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY IF NOT EXISTS "notifications_update_own" ON public.notifications
    FOR UPDATE TO authenticated USING (recipient_id = auth.uid());

CREATE POLICY IF NOT EXISTS "notifications_delete_own" ON public.notifications
    FOR DELETE TO authenticated USING (recipient_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread 
    ON public.notifications(recipient_id, is_read, created_at DESC);

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

CREATE POLICY IF NOT EXISTS "push_tokens_select_own" ON public.push_tokens
    FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "push_tokens_insert_own" ON public.push_tokens
    FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "push_tokens_update_own" ON public.push_tokens
    FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE POLICY IF NOT EXISTS "push_tokens_delete_own" ON public.push_tokens
    FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_push_tokens_user_id ON public.push_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_push_tokens_token ON public.push_tokens(token);

-- =============================================================================
-- STEP 3: PRAYER SYSTEM TABLES
-- =============================================================================

-- =============================================================================
-- TABLE: prayer_requests
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prayer_requests (
    id BIGSERIAL PRIMARY KEY,
    requester UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    details TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}' NOT NULL,
    embed_url TEXT,
    moderation_status TEXT DEFAULT 'approved' NOT NULL,
    moderation_reason TEXT,
    is_anonymous BOOLEAN DEFAULT FALSE NOT NULL,
    status TEXT DEFAULT 'open' NOT NULL CHECK (status IN ('open', 'closed', 'answered')),
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for prayer_requests
ALTER TABLE public.prayer_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "prayer_requests_select" ON public.prayer_requests
    FOR SELECT TO authenticated USING (status IN ('open', 'answered', 'closed'));

CREATE POLICY IF NOT EXISTS "prayer_requests_insert" ON public.prayer_requests
    FOR INSERT TO authenticated WITH CHECK (requester = auth.uid());

CREATE POLICY IF NOT EXISTS "prayer_requests_update" ON public.prayer_requests
    FOR UPDATE TO authenticated
    USING (
        (requester = auth.uid() AND status != 'answered') OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

CREATE INDEX IF NOT EXISTS idx_prayer_requests_tags ON public.prayer_requests USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_prayer_requests_status_created ON public.prayer_requests (status, created_at DESC);

-- =============================================================================
-- TABLE: prayer_commitments
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prayer_commitments (
    request_id BIGINT NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
    warrior UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    committed_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    status TEXT DEFAULT 'committed' NOT NULL CHECK (status IN ('committed', 'prayed')),
    prayed_at TIMESTAMPTZ,
    note TEXT,
    PRIMARY KEY (request_id, warrior)
);

-- RLS for prayer_commitments
ALTER TABLE public.prayer_commitments ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "prayer_commitments_select" ON public.prayer_commitments
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "prayer_commitments_insert" ON public.prayer_commitments
    FOR INSERT TO authenticated WITH CHECK (warrior = auth.uid());

CREATE POLICY IF NOT EXISTS "prayer_commitments_update" ON public.prayer_commitments
    FOR UPDATE TO authenticated
    USING (
        warrior = auth.uid() OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

CREATE POLICY IF NOT EXISTS "prayer_commitments_delete" ON public.prayer_commitments
    FOR DELETE TO authenticated
    USING (
        warrior = auth.uid() OR
        (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin'))
    );

CREATE INDEX IF NOT EXISTS idx_prayer_commitments_prayed_status 
    ON public.prayer_commitments (status, prayed_at) WHERE status = 'prayed';
CREATE INDEX IF NOT EXISTS idx_prayer_commitments_warrior_prayed 
    ON public.prayer_commitments (warrior, prayed_at) WHERE status = 'prayed';

-- =============================================================================
-- TABLE: prayer_activity
-- =============================================================================
CREATE TABLE IF NOT EXISTS public.prayer_activity (
    id BIGSERIAL PRIMARY KEY,
    request_id BIGINT NOT NULL REFERENCES public.prayer_requests(id) ON DELETE CASCADE,
    actor UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    kind TEXT NOT NULL CHECK (kind IN ('create', 'commit', 'uncommit', 'confirm', 'close', 'answer')),
    message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS for prayer_activity
ALTER TABLE public.prayer_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY IF NOT EXISTS "prayer_activity_select" ON public.prayer_activity
    FOR SELECT TO authenticated USING (true);

CREATE POLICY IF NOT EXISTS "prayer_activity_insert" ON public.prayer_activity
    FOR INSERT TO authenticated WITH CHECK (true);

-- =============================================================================
-- STEP 4: VIEWS FOR LEADERBOARDS
-- =============================================================================

-- Base view for confirmed prayers
CREATE OR REPLACE VIEW public.vw_prayer_confirmed AS
SELECT 
    warrior,
    prayed_at::date as day,
    committed_at,
    request_id,
    prayed_at
FROM public.prayer_commitments 
WHERE status = 'prayed';

-- Weekly leaderboard
CREATE OR REPLACE VIEW public.vw_prayer_leaderboard_week AS
SELECT 
    warrior,
    COUNT(*) as count_prayed,
    MIN(prayed_at) as first_prayed_at,
    MAX(prayed_at) as last_prayed_at
FROM public.prayer_commitments 
WHERE status = 'prayed'
    AND DATE_TRUNC('week', prayed_at::date) = DATE_TRUNC('week', CURRENT_DATE)
GROUP BY warrior
ORDER BY count_prayed DESC, first_prayed_at ASC;

-- Monthly leaderboard
CREATE OR REPLACE VIEW public.vw_prayer_leaderboard_month AS
SELECT 
    warrior,
    COUNT(*) as count_prayed,
    MIN(prayed_at) as first_prayed_at,
    MAX(prayed_at) as last_prayed_at
FROM public.prayer_commitments 
WHERE status = 'prayed'
    AND DATE_TRUNC('month', prayed_at::date) = DATE_TRUNC('month', CURRENT_DATE)
GROUP BY warrior
ORDER BY count_prayed DESC, first_prayed_at ASC;

-- All-time leaderboard
CREATE OR REPLACE VIEW public.vw_prayer_leaderboard_alltime AS
SELECT 
    warrior,
    COUNT(*) as count_prayed,
    MIN(prayed_at) as first_prayed_at,
    MAX(prayed_at) as last_prayed_at
FROM public.prayer_commitments 
WHERE status = 'prayed'
GROUP BY warrior
ORDER BY count_prayed DESC, first_prayed_at ASC;

-- Prayer streaks
CREATE OR REPLACE VIEW public.vw_prayer_streaks AS
WITH daily_prayers AS (
    SELECT DISTINCT warrior, prayed_at::date as prayer_date
    FROM public.prayer_commitments WHERE status = 'prayed'
),
warrior_latest AS (
    SELECT warrior, MAX(prayer_date) as last_prayer_date
    FROM daily_prayers GROUP BY warrior
),
streak_calc AS (
    SELECT 
        dp.warrior, dp.prayer_date, wl.last_prayer_date,
        ROW_NUMBER() OVER (PARTITION BY dp.warrior ORDER BY dp.prayer_date DESC) as days_from_end,
        CASE 
            WHEN dp.prayer_date = wl.last_prayer_date - (ROW_NUMBER() OVER (
                PARTITION BY dp.warrior ORDER BY dp.prayer_date DESC) - 1) * INTERVAL '1 day'
            THEN 1 ELSE 0 
        END as is_consecutive
    FROM daily_prayers dp JOIN warrior_latest wl ON dp.warrior = wl.warrior
),
current_streaks AS (
    SELECT warrior, last_prayer_date, COUNT(*) as current_streak, MIN(prayer_date) as streak_start_date
    FROM streak_calc WHERE is_consecutive = 1
    GROUP BY warrior, last_prayer_date
)
SELECT 
    COALESCE(dp.warrior, cs.warrior) as warrior,
    COALESCE(cs.current_streak, 0) as current_streak,
    cs.streak_start_date,
    cs.last_prayer_date as streak_end_date,
    CASE WHEN cs.last_prayer_date >= CURRENT_DATE - INTERVAL '1 day' THEN true ELSE false END as is_active_streak
FROM (SELECT DISTINCT warrior FROM daily_prayers) dp
LEFT JOIN current_streaks cs ON dp.warrior = cs.warrior
ORDER BY current_streak DESC, streak_end_date DESC;

-- Prayer request stats view
CREATE OR REPLACE VIEW public.prayer_request_stats AS
SELECT 
    pr.id as request_id,
    COALESCE(stats.commit_count, 0) as commit_count,
    COALESCE(stats.prayed_count, 0) as prayed_count,
    COALESCE(stats.open_commit_count, 0) as open_commit_count
FROM public.prayer_requests pr
LEFT JOIN (
    SELECT 
        request_id,
        COUNT(*) as commit_count,
        COUNT(*) FILTER (WHERE status = 'prayed') as prayed_count,
        COUNT(*) FILTER (WHERE status = 'committed') as open_commit_count
    FROM public.prayer_commitments
    GROUP BY request_id
) stats ON pr.id = stats.request_id;

-- =============================================================================
-- STEP 5: GRANTS
-- =============================================================================
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.posts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.comments TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.bookmarks TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.reactions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.donations TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.media_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.prayer_commitments TO authenticated;
GRANT SELECT, INSERT ON public.prayer_activity TO authenticated;

GRANT SELECT ON public.vw_prayer_confirmed TO authenticated;
GRANT SELECT ON public.vw_prayer_leaderboard_week TO authenticated;
GRANT SELECT ON public.vw_prayer_leaderboard_month TO authenticated;
GRANT SELECT ON public.vw_prayer_leaderboard_alltime TO authenticated;
GRANT SELECT ON public.vw_prayer_streaks TO authenticated;
GRANT SELECT ON public.prayer_request_stats TO authenticated;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- =============================================================================
-- COMPLETION
-- =============================================================================
DO $$
BEGIN
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'ALL TABLES CREATED SUCCESSFULLY';
    RAISE NOTICE '==============================================';
    RAISE NOTICE 'Tables: profiles, posts, comments, bookmarks, reactions,';
    RAISE NOTICE '        reports, donations, media_requests, notifications,';
    RAISE NOTICE '        push_tokens, prayer_requests, prayer_commitments,';
    RAISE NOTICE '        prayer_activity';
    RAISE NOTICE 'Views: vw_prayer_*, prayer_request_stats';
    RAISE NOTICE 'All tables have Row Level Security enabled';
    RAISE NOTICE '==============================================';
END $$;
