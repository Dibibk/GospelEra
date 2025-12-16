-- Monthly Table Partitioning Migration
-- Created: August 2025  
-- Description: Partition large tables by month for better performance

-- Enable partition-wise joins
SET enable_partitionwise_join = on;
SET enable_partitionwise_aggregate = on;

-- 1. POSTS TABLE PARTITIONING

-- Create partitioned posts table (without primary key initially)
CREATE TABLE posts_partitioned (
    LIKE posts INCLUDING DEFAULTS INCLUDING CONSTRAINTS
) PARTITION BY RANGE (created_at);

-- Drop the old primary key and create a new composite one including created_at
ALTER TABLE posts_partitioned DROP CONSTRAINT IF EXISTS posts_pkey;
ALTER TABLE posts_partitioned ADD PRIMARY KEY (id, created_at);

-- Create current and future month partitions  
CREATE TABLE posts_2025_08 PARTITION OF posts_partitioned
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE posts_2025_09 PARTITION OF posts_partitioned  
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE posts_2025_10 PARTITION OF posts_partitioned
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE posts_2025_11 PARTITION OF posts_partitioned
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- 2. COMMENTS TABLE PARTITIONING

CREATE TABLE comments_partitioned (
    LIKE comments INCLUDING ALL  
) PARTITION BY RANGE (created_at);

CREATE TABLE comments_2025_08 PARTITION OF comments_partitioned
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE comments_2025_09 PARTITION OF comments_partitioned
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE comments_2025_10 PARTITION OF comments_partitioned  
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE comments_2025_11 PARTITION OF comments_partitioned
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- 3. PRAYER REQUESTS PARTITIONING  

CREATE TABLE prayer_requests_partitioned (
    LIKE prayer_requests INCLUDING ALL
) PARTITION BY RANGE (created_at);

CREATE TABLE prayer_requests_2025_08 PARTITION OF prayer_requests_partitioned
    FOR VALUES FROM ('2025-08-01') TO ('2025-09-01');

CREATE TABLE prayer_requests_2025_09 PARTITION OF prayer_requests_partitioned
    FOR VALUES FROM ('2025-09-01') TO ('2025-10-01');

CREATE TABLE prayer_requests_2025_10 PARTITION OF prayer_requests_partitioned
    FOR VALUES FROM ('2025-10-01') TO ('2025-11-01');

CREATE TABLE prayer_requests_2025_11 PARTITION OF prayer_requests_partitioned  
    FOR VALUES FROM ('2025-11-01') TO ('2025-12-01');

-- 4. AUTO-PARTITION CREATION FUNCTION

CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
DECLARE
    next_month_start date;
    next_month_end date;
    partition_suffix text;
BEGIN
    -- Calculate next month
    next_month_start := date_trunc('month', CURRENT_DATE + interval '1 month');
    next_month_end := next_month_start + interval '1 month';
    partition_suffix := to_char(next_month_start, 'YYYY_MM');
    
    -- Create posts partition
    EXECUTE format('CREATE TABLE IF NOT EXISTS posts_%s PARTITION OF posts_partitioned
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_suffix, next_month_start, next_month_end);
    
    -- Create comments partition  
    EXECUTE format('CREATE TABLE IF NOT EXISTS comments_%s PARTITION OF comments_partitioned
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_suffix, next_month_start, next_month_end);
    
    -- Create prayer_requests partition
    EXECUTE format('CREATE TABLE IF NOT EXISTS prayer_requests_%s PARTITION OF prayer_requests_partitioned
                   FOR VALUES FROM (%L) TO (%L)',
                   partition_suffix, next_month_start, next_month_end);
    
    RAISE NOTICE 'Created partitions for month: %', partition_suffix;
END;
$$ LANGUAGE plpgsql;

-- 5. SCHEDULE MONTHLY PARTITION CREATION
-- Note: This requires pg_cron extension or external scheduler

-- Example cron job (run on day 1 of each month):
-- SELECT cron.schedule('create-partitions', '0 0 1 * *', 'SELECT create_next_month_partitions();');

-- 6. DATA MIGRATION (Run after creating partitions)
-- WARNING: This should be done during maintenance window

/*
-- Migrate existing data (UNCOMMENT WHEN READY)
BEGIN;

-- Insert data into partitioned tables
INSERT INTO posts_partitioned SELECT * FROM posts;
INSERT INTO comments_partitioned SELECT * FROM comments;  
INSERT INTO prayer_requests_partitioned SELECT * FROM prayer_requests;

-- Rename tables (atomic swap)
ALTER TABLE posts RENAME TO posts_old;
ALTER TABLE posts_partitioned RENAME TO posts;

ALTER TABLE comments RENAME TO comments_old;
ALTER TABLE comments_partitioned RENAME TO comments;

ALTER TABLE prayer_requests RENAME TO prayer_requests_old;
ALTER TABLE prayer_requests_partitioned RENAME TO prayer_requests;

-- Update sequences if needed
SELECT setval('posts_id_seq', (SELECT MAX(id) FROM posts));
SELECT setval('comments_id_seq', (SELECT MAX(id) FROM comments));
SELECT setval('prayer_requests_id_seq', (SELECT MAX(id) FROM prayer_requests));

COMMIT;

-- Drop old tables after verification
-- DROP TABLE posts_old;
-- DROP TABLE comments_old;  
-- DROP TABLE prayer_requests_old;
*/