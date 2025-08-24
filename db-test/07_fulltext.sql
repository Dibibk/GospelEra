-- Migration 008: Full-text search on posts (partition-aware)
-- This migration adds full-text search capabilities to posts

-- Add tsvector column to parent posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS tsv tsvector 
    GENERATED ALWAYS AS (
        to_tsvector('english', coalesce(title,'') || ' ' || coalesce(content,''))
    ) STORED;

-- Create partitioned GIN index for full-text search
-- This will automatically create indexes on all existing and future partitions
-- Note: Cannot use CONCURRENTLY in transaction blocks
CREATE INDEX IF NOT EXISTS idx_posts_tsv_gin 
ON posts USING GIN (tsv);

-- Create helper function for safe full-text search with pagination
CREATE OR REPLACE FUNCTION search_posts(
    search_query text,
    cursor_created_at timestamptz DEFAULT NULL,
    cursor_id bigint DEFAULT NULL,
    page_size int DEFAULT 20
)
RETURNS TABLE(
    id bigint,
    title text,
    content text,
    author_id uuid,
    created_at timestamptz,
    tags text[],
    media_urls text[],
    comments_count bigint,
    rank real
) AS $$
DECLARE
    ts_query tsquery;
BEGIN
    -- Convert search text to tsquery
    ts_query := plainto_tsquery('english', search_query);
    
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.content,
        p.author_id,
        p.created_at,
        p.tags,
        p.media_urls,
        COALESCE(p.comments_count, 0) as comments_count,
        ts_rank(p.tsv, ts_query) as rank
    FROM posts p
    WHERE p.tsv @@ ts_query
        AND p.hidden = false 
        AND COALESCE(p.is_deleted, false) = false
        AND (
            cursor_created_at IS NULL 
            OR p.created_at < cursor_created_at
            OR (p.created_at = cursor_created_at AND p.id < cursor_id)
        )
    ORDER BY 
        ts_rank(p.tsv, ts_query) DESC,
        p.created_at DESC,
        p.id DESC
    LIMIT page_size;
END;
$$ LANGUAGE plpgsql;

-- Create helper view for search results with metadata
CREATE OR REPLACE VIEW search_posts_v AS
SELECT 
    p.id,
    p.title,
    p.content,
    p.author_id,
    p.created_at,
    p.tags,
    p.media_urls,
    COALESCE(p.comments_count, 0) as comments_count,
    p.tsv
FROM posts p
WHERE p.hidden = false 
    AND COALESCE(p.is_deleted, false) = false;

-- Example search queries (commented for reference):
/*
-- Basic search with pagination:
SELECT * FROM search_posts('jesus christ salvation', NULL, NULL, 10);

-- Search with cursor pagination (using last result's created_at and id):
SELECT * FROM search_posts(
    'prayer request healing', 
    '2024-01-15 10:30:00'::timestamptz, 
    123, 
    10
);

-- Direct search using the view:
SELECT 
    id, title, content, created_at,
    ts_rank(tsv, plainto_tsquery('english', 'faith community')) as rank
FROM search_posts_v 
WHERE tsv @@ plainto_tsquery('english', 'faith community')
ORDER BY rank DESC, created_at DESC
LIMIT 20;
*/

-- Create index for search ordering (created_at DESC for pagination)
-- Note: Cannot use CONCURRENTLY in transaction blocks
CREATE INDEX IF NOT EXISTS idx_posts_search_pagination
ON posts (created_at DESC, id DESC) 
WHERE hidden = false AND COALESCE(is_deleted, false) = false;