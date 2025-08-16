-- Run this in Supabase SQL Editor to create search indexes for better performance

create extension if not exists pg_trgm;

create index if not exists posts_title_trgm on posts using gin (lower(title) gin_trgm_ops);

create index if not exists posts_content_trgm on posts using gin (lower(content) gin_trgm_ops);

create index if not exists posts_tags_gin on posts using gin (tags);

-- Function to get top tags by frequency
CREATE OR REPLACE FUNCTION get_top_tags(tag_limit INT DEFAULT 12)
RETURNS TABLE(tag TEXT, count BIGINT) AS $$
BEGIN
  RETURN QUERY
  SELECT unnest_tag as tag, COUNT(*) as count
  FROM (
    SELECT unnest(tags) as unnest_tag
    FROM posts 
    WHERE is_deleted = false
  ) as tag_list
  GROUP BY unnest_tag
  ORDER BY count DESC, tag ASC
  LIMIT tag_limit;
END;
$$ LANGUAGE plpgsql;