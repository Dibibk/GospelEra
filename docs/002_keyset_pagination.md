# Keyset (Cursor) Pagination Implementation Guide

## Overview
Replace OFFSET-based pagination with keyset pagination for better performance on large datasets.

## Current OFFSET Issues
- Performance degrades linearly with page number
- Inconsistent results when new data is inserted
- Can skip or duplicate records during pagination

## Keyset Pagination Benefits  
- Consistent O(log n) performance
- Stable results even with concurrent inserts
- Better user experience for large datasets

## Implementation Pattern

### Before (OFFSET-based):
```sql
SELECT * FROM posts 
ORDER BY created_at DESC 
LIMIT 20 OFFSET 100;  -- Slow for large offsets
```

### After (Keyset-based):
```sql
SELECT * FROM posts 
WHERE created_at < :cursor_created_at
ORDER BY created_at DESC 
LIMIT 20;
```

## API Changes Required

### Posts Feed
```typescript
// Frontend request
const response = await fetch(`/api/posts?limit=20&cursor=${cursor}`)

// Backend implementation  
const query = `
  SELECT * FROM posts 
  WHERE created_at < $1
  ORDER BY created_at DESC 
  LIMIT $2
`
```

### Comments
```typescript
// With post_id filter
const query = `
  SELECT * FROM comments 
  WHERE post_id = $1 AND created_at < $2
  ORDER BY created_at DESC 
  LIMIT $3
`
```

### Prayer Requests
```typescript
const query = `
  SELECT * FROM prayer_requests 
  WHERE created_at < $1
  ORDER BY created_at DESC 
  LIMIT $2
`
```

## Cursor Format
Use ISO timestamp for cursor value:
```typescript
interface PaginationCursor {
  created_at: string  // ISO 8601 timestamp
  id?: number        // Fallback for same-timestamp handling
}
```

## Files to Update
- `server/routes.ts` - All pagination endpoints
- `client/src/lib/posts.ts` - Frontend API calls
- `client/src/lib/comments.ts` - Comments pagination
- `client/src/lib/prayer.ts` - Prayer requests pagination