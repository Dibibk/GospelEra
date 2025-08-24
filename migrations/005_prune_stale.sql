-- Migration 005: Prune stale posts with zero engagement after 24 months
-- This migration creates infrastructure for safely pruning old posts with no engagement

-- Create helper view to compute per-post engagement across all partitions
CREATE OR REPLACE VIEW post_engagement_v AS
SELECT 
    p.id AS post_id,
    COUNT(c.id) AS comments_count
FROM posts p
LEFT JOIN comments c ON c.post_id = p.id 
    AND c.is_deleted IS NOT TRUE
GROUP BY p.id;

-- Create audit table for tracking content prunes
CREATE TABLE IF NOT EXISTS audit_content_prunes (
    id BIGSERIAL PRIMARY KEY,
    table_name TEXT NOT NULL,
    row_id BIGINT NOT NULL,
    deleted_at TIMESTAMPTZ DEFAULT now()
);

-- Create index for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_content_prunes_table_deleted 
ON audit_content_prunes(table_name, deleted_at);

-- Create safe pruning function
CREATE OR REPLACE FUNCTION prune_stale_posts()
RETURNS TABLE(pruned_count BIGINT) AS $$
DECLARE
    post_record RECORD;
    total_pruned BIGINT := 0;
BEGIN
    -- Find posts eligible for pruning
    FOR post_record IN
        SELECT p.id
        FROM posts p
        LEFT JOIN post_engagement_v pe ON pe.post_id = p.id
        WHERE p.created_at < now() - interval '24 months'
            AND NOT p.hidden
            AND NOT COALESCE(p.is_deleted, false)
            AND (pe.comments_count IS NULL OR pe.comments_count = 0)
    LOOP
        -- Insert audit record before deletion
        INSERT INTO audit_content_prunes (table_name, row_id)
        VALUES ('posts', post_record.id);
        
        -- Delete the post (soft delete by setting is_deleted = true)
        UPDATE posts 
        SET is_deleted = true, updated_at = now()
        WHERE id = post_record.id;
        
        total_pruned := total_pruned + 1;
    END LOOP;
    
    RETURN QUERY SELECT total_pruned;
END;
$$ LANGUAGE plpgsql;

-- Example pg_cron job (commented for reference):
-- SELECT cron.schedule('prune-stale-posts', '0 2 * * *', 'SELECT prune_stale_posts();');
-- This would run daily at 2 AM to prune stale posts