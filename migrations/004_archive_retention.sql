-- Archive and Retention Policy Migration
-- Created: August 2025
-- Description: Move old data to archive schema and implement retention policies

-- 1. CREATE ARCHIVE SCHEMA
CREATE SCHEMA IF NOT EXISTS archive;

-- Grant appropriate permissions
GRANT USAGE ON SCHEMA archive TO PUBLIC;
GRANT SELECT ON ALL TABLES IN SCHEMA archive TO PUBLIC;

-- 2. ARCHIVE MANAGEMENT FUNCTIONS

CREATE OR REPLACE FUNCTION archive_old_partitions()
RETURNS void AS $$
DECLARE
    cutoff_date date;
    partition_record record;
    archive_table_name text;
    source_table_name text;
BEGIN
    -- Archive partitions older than 18 months
    cutoff_date := CURRENT_DATE - interval '18 months';
    
    -- Find partitions to archive for posts
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename ~ '^posts_\d{4}_\d{2}$'
        AND tablename <= 'posts_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        source_table_name := partition_record.tablename;
        archive_table_name := 'archive.' || source_table_name;
        
        -- Create archive table if not exists
        EXECUTE format('CREATE TABLE IF NOT EXISTS %s (LIKE public.%s INCLUDING ALL)',
                      archive_table_name, source_table_name);
        
        -- Move data to archive  
        EXECUTE format('INSERT INTO %s SELECT * FROM public.%s ON CONFLICT DO NOTHING',
                      archive_table_name, source_table_name);
        
        -- Make archive table read-only
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %s FROM PUBLIC',
                      archive_table_name);
        
        -- Drop original partition
        EXECUTE format('DROP TABLE IF EXISTS public.%s', source_table_name);
        
        RAISE NOTICE 'Archived partition: %', source_table_name;
    END LOOP;
    
    -- Repeat for comments
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename ~ '^comments_\d{4}_\d{2}$'
        AND tablename <= 'comments_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        source_table_name := partition_record.tablename;
        archive_table_name := 'archive.' || source_table_name;
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %s (LIKE public.%s INCLUDING ALL)',
                      archive_table_name, source_table_name);
        
        EXECUTE format('INSERT INTO %s SELECT * FROM public.%s ON CONFLICT DO NOTHING',
                      archive_table_name, source_table_name);
        
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %s FROM PUBLIC',
                      archive_table_name);
        
        EXECUTE format('DROP TABLE IF EXISTS public.%s', source_table_name);
        
        RAISE NOTICE 'Archived partition: %', source_table_name;
    END LOOP;
    
    -- Repeat for prayer_requests
    FOR partition_record IN 
        SELECT schemaname, tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
        AND tablename ~ '^prayer_requests_\d{4}_\d{2}$'
        AND tablename <= 'prayer_requests_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        source_table_name := partition_record.tablename;
        archive_table_name := 'archive.' || source_table_name;
        
        EXECUTE format('CREATE TABLE IF NOT EXISTS %s (LIKE public.%s INCLUDING ALL)',
                      archive_table_name, source_table_name);
        
        EXECUTE format('INSERT INTO %s SELECT * FROM public.%s ON CONFLICT DO NOTHING',
                      archive_table_name, source_table_name);
        
        EXECUTE format('REVOKE INSERT, UPDATE, DELETE ON %s FROM PUBLIC',
                      archive_table_name);
        
        EXECUTE format('DROP TABLE IF EXISTS public.%s', source_table_name);
        
        RAISE NOTICE 'Archived partition: %', source_table_name;
    END LOOP;
    
END;
$$ LANGUAGE plpgsql;

-- 3. ARCHIVED DATA ACCESS FUNCTIONS

CREATE OR REPLACE FUNCTION get_posts_with_archive(
    include_archive boolean DEFAULT false,
    limit_count integer DEFAULT 20,
    cursor_date timestamp DEFAULT NULL
)
RETURNS TABLE(
    id integer,
    title text,
    content text,
    author_id text,
    created_at timestamp,
    updated_at timestamp,
    tags text[],
    media_urls text[],
    embed_url text,
    moderation_status text,
    hidden boolean,
    is_archived boolean
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id, p.title, p.content, p.author_id, p.created_at, p.updated_at,
        p.tags, p.media_urls, p.embed_url, p.moderation_status, p.hidden,
        false as is_archived
    FROM public.posts p
    WHERE (cursor_date IS NULL OR p.created_at < cursor_date)
    AND NOT p.hidden
    ORDER BY p.created_at DESC
    LIMIT limit_count;
    
    -- Include archived data if requested
    IF include_archive THEN
        RETURN QUERY
        SELECT 
            a.id, a.title, a.content, a.author_id, a.created_at, a.updated_at,
            a.tags, a.media_urls, a.embed_url, a.moderation_status, a.hidden,
            true as is_archived
        FROM (
            SELECT * FROM archive.posts_2024_01 WHERE created_at < COALESCE(cursor_date, '9999-12-31'::timestamp)
            UNION ALL
            SELECT * FROM archive.posts_2024_02 WHERE created_at < COALESCE(cursor_date, '9999-12-31'::timestamp)
            -- Add more archived partitions as needed
        ) a
        WHERE NOT a.hidden
        ORDER BY a.created_at DESC
        LIMIT limit_count;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 4. API ENDPOINT MODIFICATIONS NEEDED

/*
-- Update server/routes.ts to include archive parameter:

app.get('/api/posts', async (req, res) => {
  const includeArchive = req.query.includeArchive === 'true';
  const cursor = req.query.cursor;
  const limit = parseInt(req.query.limit) || 20;
  
  const result = await db.select().from(
    sql`get_posts_with_archive(${includeArchive}, ${limit}, ${cursor})`
  );
  
  res.json(result);
});
*/

-- 5. RETENTION POLICY SCHEDULER
-- Schedule archive function to run monthly

/*
-- Example cron job (run on day 15 of each month):
SELECT cron.schedule(
    'archive-old-data', 
    '0 2 15 * *', 
    'SELECT archive_old_partitions();'
);
*/

-- 6. MONITORING VIEWS

CREATE VIEW archive.retention_summary AS
SELECT 
    'posts' as table_name,
    COUNT(*) as archived_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM (
    SELECT created_at FROM archive.posts_2024_01
    UNION ALL
    SELECT created_at FROM archive.posts_2024_02
    -- Add more as partitions are created
) archived_posts

UNION ALL

SELECT 
    'comments' as table_name,
    COUNT(*) as archived_records,
    MIN(created_at) as oldest_record,
    MAX(created_at) as newest_record
FROM (
    SELECT created_at FROM archive.comments_2024_01
    UNION ALL
    SELECT created_at FROM archive.comments_2024_02
    -- Add more as partitions are created
) archived_comments;

-- 7. CLEANUP OLD ARCHIVE DATA (Optional)
-- Remove archived data older than 5 years

CREATE OR REPLACE FUNCTION cleanup_ancient_archives()
RETURNS void AS $$
DECLARE
    cutoff_date date;
    table_record record;
BEGIN
    cutoff_date := CURRENT_DATE - interval '5 years';
    
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'archive'
        AND tablename ~ '_\d{4}_\d{2}$'
        AND tablename <= 'posts_' || to_char(cutoff_date, 'YYYY_MM')
    LOOP
        EXECUTE format('DROP TABLE IF EXISTS archive.%s', table_record.tablename);
        RAISE NOTICE 'Permanently deleted ancient archive: %', table_record.tablename;
    END LOOP;
END;
$$ LANGUAGE plpgsql;