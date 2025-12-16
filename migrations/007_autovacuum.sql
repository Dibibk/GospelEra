-- Migration 007: Hot-table hygiene across partitions
-- This migration optimizes autovacuum settings for high-write tables

-- Helper function to apply storage parameters to all partitions
CREATE OR REPLACE FUNCTION apply_storage_params_to_partitions(parent_table regclass)
RETURNS void AS $$
DECLARE
    partition_name text;
    table_name text;
    hot_tables text[] := ARRAY['comments', 'prayer_commitments'];
BEGIN
    -- Extract just the table name (without schema) for comparison
    SELECT c.relname INTO table_name 
    FROM pg_class c 
    WHERE c.oid = parent_table;
    
    -- Apply settings to parent table first
    IF table_name = ANY(hot_tables) THEN
        -- Hot-write tables: more aggressive autovacuum
        EXECUTE format('ALTER TABLE %s SET (
            autovacuum_vacuum_scale_factor = 0.05,
            autovacuum_analyze_scale_factor = 0.05,
            fillfactor = 90
        )', parent_table);
        RAISE NOTICE 'Applied hot-table settings to parent %', parent_table;
    ELSE
        -- Less write-heavy tables
        EXECUTE format('ALTER TABLE %s SET (
            autovacuum_vacuum_scale_factor = 0.1,
            autovacuum_analyze_scale_factor = 0.1,
            fillfactor = 95
        )', parent_table);
        RAISE NOTICE 'Applied standard settings to parent %', parent_table;
    END IF;
    
    -- Apply same settings to all existing partitions
    FOR partition_name IN
        SELECT schemaname||'.'||tablename
        FROM pg_tables pt
        WHERE pt.tablename IN (
            SELECT c.relname
            FROM pg_inherits i
            JOIN pg_class c ON i.inhrelid = c.oid
            WHERE i.inhparent = parent_table
        )
    LOOP
        IF table_name = ANY(hot_tables) THEN
            EXECUTE format('ALTER TABLE %s SET (
                autovacuum_vacuum_scale_factor = 0.05,
                autovacuum_analyze_scale_factor = 0.05,
                fillfactor = 90
            )', partition_name);
        ELSE
            EXECUTE format('ALTER TABLE %s SET (
                autovacuum_vacuum_scale_factor = 0.1,
                autovacuum_analyze_scale_factor = 0.1,
                fillfactor = 95
            )', partition_name);
        END IF;
        RAISE NOTICE 'Applied settings to partition %', partition_name;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Apply storage parameters to all current partitioned tables
SELECT apply_storage_params_to_partitions('posts'::regclass);
SELECT apply_storage_params_to_partitions('comments'::regclass);
SELECT apply_storage_params_to_partitions('prayer_requests'::regclass);

-- Update the existing partition creation function to include storage params
-- This assumes the function exists from previous migrations
CREATE OR REPLACE FUNCTION create_next_month_partitions()
RETURNS void AS $$
DECLARE
    next_month_start date;
    next_month_end date;
    partition_name text;
BEGIN
    -- Calculate next month boundaries
    next_month_start := date_trunc('month', CURRENT_DATE + interval '1 month');
    next_month_end := next_month_start + interval '1 month';
    
    -- Create posts partition
    partition_name := 'posts_' || to_char(next_month_start, 'YYYY_MM');
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF posts 
                   FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, next_month_start, next_month_end);
    
    -- Create comments partition  
    partition_name := 'comments_' || to_char(next_month_start, 'YYYY_MM');
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF comments 
                   FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, next_month_start, next_month_end);
    
    -- Create prayer_requests partition
    partition_name := 'prayer_requests_' || to_char(next_month_start, 'YYYY_MM');
    EXECUTE format('CREATE TABLE IF NOT EXISTS %I PARTITION OF prayer_requests 
                   FOR VALUES FROM (%L) TO (%L)', 
                   partition_name, next_month_start, next_month_end);
    
    -- Apply storage parameters to new partitions
    PERFORM apply_storage_params_to_partitions('posts'::regclass);
    PERFORM apply_storage_params_to_partitions('comments'::regclass);
    PERFORM apply_storage_params_to_partitions('prayer_requests'::regclass);
    
    RAISE NOTICE 'Created partitions for % with optimized storage settings', next_month_start;
END;
$$ LANGUAGE plpgsql;