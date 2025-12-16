# Database Maintenance Guide

## Scheduled Jobs (pg_cron)

### 1. Stale Post Pruning
```sql
-- Schedule daily pruning of old posts with zero engagement (runs at 2 AM)
SELECT cron.schedule('prune-stale-posts', '0 2 * * *', 'SELECT prune_stale_posts();');
```

### 2. Prayer Leaderboard Refresh
```sql
-- Schedule nightly refresh of 30-day prayer leaderboard (runs at 3 AM)
SELECT cron.schedule('refresh-prayer-leaderboard', '0 3 * * *', 'SELECT refresh_prayer_leaderboard();');
```

## Partition Management

### Counter Triggers
- Triggers are attached to **parent tables** (posts, comments, prayer_requests, prayer_commitments)
- They automatically fire for all partition operations
- No additional setup needed for new partitions

### Storage Parameters
- New partitions automatically inherit optimized autovacuum settings
- If partitions are created manually, re-run the storage helper:
```sql
-- Apply storage settings to all partitions of a table
SELECT apply_storage_params_to_partitions('comments'::regclass);
SELECT apply_storage_params_to_partitions('prayer_commitments'::regclass);
```

### Hot Table Settings Applied
- **High-write tables** (comments, prayer_commitments):
  - `autovacuum_vacuum_scale_factor = 0.05`
  - `autovacuum_analyze_scale_factor = 0.05` 
  - `fillfactor = 90`
- **Standard tables** (posts, prayer_requests):
  - `autovacuum_vacuum_scale_factor = 0.1`
  - `autovacuum_analyze_scale_factor = 0.1`
  - `fillfactor = 95`

## Full-Text Search

### Usage Examples
```sql
-- Basic search with pagination
SELECT * FROM search_posts('jesus christ salvation', NULL, NULL, 10);

-- Cursor-based pagination (no OFFSET)
SELECT * FROM search_posts('prayer healing', last_created_at, last_id, 10);
```

### Index Maintenance
- GIN indexes on `posts(tsv)` are automatically maintained
- Partition-aware: each partition gets its own index
- `tsvector` column is auto-updated via generated column

## Monitoring

### Check Pruning Activity
```sql
SELECT table_name, COUNT(*), MAX(deleted_at) as last_prune
FROM audit_content_prunes 
GROUP BY table_name;
```

### Verify Counter Accuracy
```sql
-- Check posts comment counts
SELECT p.id, p.comments_count, COUNT(c.id) as actual_count
FROM posts p 
LEFT JOIN comments c ON c.post_id = p.id AND c.is_deleted IS NOT TRUE
GROUP BY p.id, p.comments_count
HAVING p.comments_count != COUNT(c.id)
LIMIT 10;
```

### Monitor Partition Sizes
```sql
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
FROM pg_tables 
WHERE tablename LIKE 'posts_%' OR tablename LIKE 'comments_%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```