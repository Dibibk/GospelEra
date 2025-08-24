-- Database Performance Indexes Migration
-- Created: August 2025
-- Description: Add essential indexes for posts, comments, and prayer system performance

-- Note: For production with large datasets, run these with CONCURRENTLY:
-- CREATE INDEX CONCURRENTLY idx_posts_created_at_desc ON posts (created_at DESC);
-- But CONCURRENTLY cannot run in transaction blocks, so using regular CREATE INDEX here

-- Posts table indexes
CREATE INDEX IF NOT EXISTS idx_posts_created_at_desc 
  ON posts (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_author_created_at_desc 
  ON posts (author_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_posts_moderation_created_at_desc 
  ON posts (moderation_status, created_at DESC);

-- Comments table indexes  
CREATE INDEX IF NOT EXISTS idx_comments_post_created_at_desc
  ON comments (post_id, created_at DESC);

-- Prayer requests table indexes
CREATE INDEX IF NOT EXISTS idx_prayer_requests_created_at_desc
  ON prayer_requests (created_at DESC);

-- Prayer commitments table indexes
CREATE INDEX IF NOT EXISTS idx_prayer_commitments_request_committed_at_desc
  ON prayer_commitments (request_id, committed_at DESC);

-- Ensure foreign key columns are indexed (if not already)
CREATE INDEX IF NOT EXISTS idx_posts_author_id 
  ON posts (author_id);

CREATE INDEX IF NOT EXISTS idx_comments_post_id 
  ON comments (post_id);

CREATE INDEX IF NOT EXISTS idx_comments_author_id 
  ON comments (author_id);

CREATE INDEX IF NOT EXISTS idx_prayer_commitments_request_id 
  ON prayer_commitments (request_id);

CREATE INDEX IF NOT EXISTS idx_prayer_commitments_user_id 
  ON prayer_commitments (user_id);

CREATE INDEX IF NOT EXISTS idx_engagements_user_id 
  ON engagements (user_id);

CREATE INDEX IF NOT EXISTS idx_engagements_post_id 
  ON engagements (post_id);

CREATE INDEX IF NOT EXISTS idx_engagements_type_created_at_desc
  ON engagements (type, created_at DESC);

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_posts_visible_recent
  ON posts (hidden, created_at DESC) WHERE hidden = false;

CREATE INDEX IF NOT EXISTS idx_prayer_requests_status_recent
  ON prayer_requests (status, created_at DESC);