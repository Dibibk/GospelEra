-- Create Missing Tables Migration (PRODUCTION VERSION)
-- Created: August 2025
-- Description: Create bookmarks and reactions tables that the engagement.js code expects

-- Create bookmarks table for bookmark functionality
CREATE TABLE IF NOT EXISTS bookmarks (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    post_id INTEGER NOT NULL,
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, post_id)
);

-- Create reactions table for "amen" reactions  
CREATE TABLE IF NOT EXISTS reactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR NOT NULL,
    post_id INTEGER NOT NULL,
    kind TEXT NOT NULL DEFAULT 'amen',
    created_at TIMESTAMP DEFAULT NOW() NOT NULL,
    UNIQUE(user_id, post_id, kind)
);

-- Add foreign key constraints (only if they don't exist)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_bookmarks_post') THEN
        ALTER TABLE bookmarks 
        ADD CONSTRAINT fk_bookmarks_post 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_reactions_post') THEN
        ALTER TABLE reactions 
        ADD CONSTRAINT fk_reactions_post 
        FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create essential indexes with CONCURRENTLY for production
-- NOTE: Run these individually outside of transaction blocks

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_post_id ON bookmarks (post_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bookmarks_created_at_desc ON bookmarks (created_at DESC);

-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_user_id ON reactions (user_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_post_id ON reactions (post_id);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_kind ON reactions (kind);
-- CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_reactions_created_at_desc ON reactions (created_at DESC);

-- For development/small datasets, use regular CREATE INDEX:
CREATE INDEX IF NOT EXISTS idx_bookmarks_user_id ON bookmarks (user_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_post_id ON bookmarks (post_id);
CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at_desc ON bookmarks (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reactions_user_id ON reactions (user_id);
CREATE INDEX IF NOT EXISTS idx_reactions_post_id ON reactions (post_id);
CREATE INDEX IF NOT EXISTS idx_reactions_kind ON reactions (kind);
CREATE INDEX IF NOT EXISTS idx_reactions_created_at_desc ON reactions (created_at DESC);