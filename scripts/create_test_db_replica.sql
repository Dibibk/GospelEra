-- Create exact replica of current database for testing
-- Run this on your NEW test database after creating it

-- First, create all tables with exact schema (run migrations 000-008)
-- Then copy all data from production

-- Copy users (if any exist)
-- Note: You'll need to run this in your test database using the Database tool

-- Example commands to copy data between databases:
-- (You'll need to modify these with actual database connection strings)

/*
Step 1: Create the new test database in Replit Database tool
Step 2: Run all migration files (000-008) on the new test database  
Step 3: Copy data selectively using commands like:

-- Copy users
INSERT INTO users (id, email, username, password_hash, role, banned, created_at, updated_at)
SELECT id, email, username, password_hash, role, banned, created_at, updated_at 
FROM production_db.users;

-- Copy posts  
INSERT INTO posts (id, author_id, created_at, title, content, tags, is_deleted, updated_at, media_urls, embed_url, moderation_status, moderation_reason, hidden, comments_count)
SELECT id, author_id, created_at, title, content, tags, is_deleted, updated_at, media_urls, embed_url, moderation_status, moderation_reason, hidden, comments_count
FROM production_db.posts;

-- Copy comments
INSERT INTO comments (id, post_id, author_id, content, created_at, is_deleted)
SELECT id, post_id, author_id, content, created_at, is_deleted
FROM production_db.comments;

-- Copy prayer requests
INSERT INTO prayer_requests (id, requester, title, details, tags, is_anonymous, status, created_at, prayed_count)
SELECT id, requester, title, details, tags, is_anonymous, status, created_at, prayed_count
FROM production_db.prayer_requests;

-- Copy prayer commitments  
INSERT INTO prayer_commitments (request_id, warrior, committed_at, status, prayed_at, note)
SELECT request_id, warrior, committed_at, status, prayed_at, note
FROM production_db.prayer_commitments;
*/