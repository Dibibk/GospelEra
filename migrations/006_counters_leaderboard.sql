-- Migration 006: Add counters and 30-day prayer leaderboard
-- This migration adds counter columns and maintains them with triggers

-- Add counter columns to parent tables (propagates to partitions)
ALTER TABLE posts ADD COLUMN IF NOT EXISTS comments_count BIGINT DEFAULT 0;
ALTER TABLE prayer_requests ADD COLUMN IF NOT EXISTS prayed_count BIGINT DEFAULT 0;

-- One-time backfill of counter columns
DO $$
BEGIN
    -- Backfill posts.comments_count
    UPDATE posts 
    SET comments_count = (
        SELECT COUNT(*)
        FROM comments c
        WHERE c.post_id = posts.id 
            AND c.is_deleted IS NOT TRUE
    );
    
    -- Backfill prayer_requests.prayed_count
    UPDATE prayer_requests
    SET prayed_count = (
        SELECT COUNT(*)
        FROM prayer_commitments pc
        WHERE pc.request_id = prayer_requests.id
            AND pc.prayed_at IS NOT NULL
    );
    
    RAISE NOTICE 'Counter columns backfilled successfully';
END $$;

-- Function to update posts comment count
CREATE OR REPLACE FUNCTION update_posts_comment_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Only increment if new comment is not deleted
        IF NEW.is_deleted IS NOT TRUE THEN
            UPDATE posts SET comments_count = comments_count + 1 
            WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle is_deleted status changes
        IF OLD.is_deleted IS NOT TRUE AND NEW.is_deleted IS TRUE THEN
            -- Comment was soft-deleted, decrement
            UPDATE posts SET comments_count = comments_count - 1 
            WHERE id = NEW.post_id;
        ELSIF OLD.is_deleted IS TRUE AND NEW.is_deleted IS NOT TRUE THEN
            -- Comment was undeleted, increment
            UPDATE posts SET comments_count = comments_count + 1 
            WHERE id = NEW.post_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        -- Only decrement if deleted comment was not marked as deleted
        IF OLD.is_deleted IS NOT TRUE THEN
            UPDATE posts SET comments_count = comments_count - 1 
            WHERE id = OLD.post_id;
        END IF;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to update prayer requests prayed count
CREATE OR REPLACE FUNCTION update_prayer_prayed_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Only increment if prayer was confirmed (prayed_at is not null)
        IF NEW.prayed_at IS NOT NULL THEN
            UPDATE prayer_requests SET prayed_count = prayed_count + 1
            WHERE id = NEW.request_id;
        END IF;
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        -- Handle prayed_at status changes
        IF OLD.prayed_at IS NULL AND NEW.prayed_at IS NOT NULL THEN
            -- Prayer was confirmed, increment
            UPDATE prayer_requests SET prayed_count = prayed_count + 1
            WHERE id = NEW.request_id;
        ELSIF OLD.prayed_at IS NOT NULL AND NEW.prayed_at IS NULL THEN
            -- Prayer was unconfirmed, decrement
            UPDATE prayer_requests SET prayed_count = prayed_count - 1
            WHERE id = NEW.request_id;
        END IF;
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers on parent tables (will fire for partitions)
DROP TRIGGER IF EXISTS trg_update_posts_comment_count ON comments;
CREATE TRIGGER trg_update_posts_comment_count
    AFTER INSERT OR UPDATE OR DELETE ON comments
    FOR EACH ROW EXECUTE FUNCTION update_posts_comment_count();

DROP TRIGGER IF EXISTS trg_update_prayer_prayed_count ON prayer_commitments;
CREATE TRIGGER trg_update_prayer_prayed_count
    AFTER INSERT OR UPDATE ON prayer_commitments
    FOR EACH ROW EXECUTE FUNCTION update_prayer_prayed_count();

-- Create 30-day prayer leaderboard materialized view
CREATE MATERIALIZED VIEW IF NOT EXISTS prayer_leaderboard_30d AS
SELECT 
    pc.warrior,
    COUNT(*) AS prayers_confirmed,
    MAX(pc.prayed_at) AS last_prayed_at
FROM prayer_commitments pc
WHERE pc.prayed_at IS NOT NULL 
    AND pc.prayed_at >= now() - interval '30 days'
GROUP BY pc.warrior
ORDER BY prayers_confirmed DESC, last_prayed_at DESC;

-- Create index on leaderboard for fast queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prayer_leaderboard_30d_ranking 
ON prayer_leaderboard_30d (prayers_confirmed DESC, last_prayed_at DESC);

-- Function to refresh leaderboard
CREATE OR REPLACE FUNCTION refresh_prayer_leaderboard()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY prayer_leaderboard_30d;
    RAISE NOTICE 'Prayer leaderboard refreshed at %', now();
END;
$$ LANGUAGE plpgsql;

-- Example pg_cron job for nightly leaderboard refresh (commented):
-- SELECT cron.schedule('refresh-prayer-leaderboard', '0 3 * * *', 'SELECT refresh_prayer_leaderboard();');
-- This would refresh the leaderboard daily at 3 AM