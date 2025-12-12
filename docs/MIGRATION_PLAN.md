# Migration Plan: Replit Database → Supabase

## Overview
This document outlines the migration of all data from Replit/Neon PostgreSQL to Supabase, without modifying any existing Supabase tables.

## Current Database State

### Replit/Neon PostgreSQL Tables (to migrate)
| Table | Description | Rows |
|-------|-------------|------|
| users | Basic auth (unused - Supabase Auth is used) | - |
| profiles | User profiles with settings | - |
| posts | Content posts with media | - |
| comments | Post comments | - |
| bookmarks | User bookmarks | - |
| reactions | Post reactions (amens) | - |
| reports | Content reports | - |
| prayer_requests | Prayer requests | - |
| prayer_commitments | Prayer commitments | - |
| prayer_activity | Prayer activity logs | - |
| donations | User donations | - |
| media_requests | Media upload requests | - |
| notifications | In-app notifications | - |
| push_tokens | Push notification tokens | - |

### Existing Supabase Tables (DO NOT MODIFY)
Based on existing SQL in docs/:
- `profiles` - May exist with different schema
- `posts` - May exist with different schema
- `prayer_requests`, `prayer_commitments`, `prayer_activity` - From db_prayer.sql
- `bookmarks`, `reactions` - From db_bookmarks_reactions.sql
- Views: `vw_prayer_leaderboard_*`, `vw_prayer_streaks`, etc.

## Migration Strategy

### Phase 1: Create New Tables in Supabase
Create the following tables that DON'T exist in Supabase yet:
1. `profiles` (if not exists) - with all columns from Replit schema
2. `posts` (if not exists) - with all columns from Replit schema
3. `comments` - Full comment system
4. `donations` - Donation tracking
5. `media_requests` - Media upload requests
6. `notifications` - In-app notifications
7. `push_tokens` - Push notification tokens
8. `reports` - Content reports

### Phase 2: Migrate Data
1. Export all data from Replit PostgreSQL
2. Transform data to match Supabase schema
3. Insert into Supabase tables (idempotent - skip duplicates)

### Phase 3: Update Application Code
Replace all Drizzle/Neon queries with Supabase queries:
- server/routes.ts → Use Supabase client
- client/src/lib/*.ts → Already using Supabase for some operations

## Table Mappings

### profiles (Replit → Supabase)
```
Replit Column          → Supabase Column
id (varchar)           → id (uuid)
email (text)           → email (text)
first_name (text)      → first_name (text)
last_name (text)       → last_name (text)
display_name (text)    → display_name (text)
bio (text)             → bio (text)
avatar_url (text)      → avatar_url (text)
role (text)            → role (text)
accepted_guidelines    → accepted_guidelines (boolean)
affirmed_faith         → affirmed_faith (boolean)
show_name_on_prayers   → show_name_on_prayers (boolean)
private_profile        → private_profile (boolean)
media_enabled          → media_enabled (boolean)
settings (json)        → settings (jsonb)
created_at             → created_at (timestamptz)
updated_at             → updated_at (timestamptz)
```

### posts (Replit → Supabase)
```
Replit Column          → Supabase Column
id (int serial)        → id (bigserial)
title (text)           → title (text)
content (text)         → content (text)
author_id (varchar)    → author_id (uuid)
tags (text[])          → tags (text[])
media_urls (text[])    → media_urls (text[])
embed_url (text)       → embed_url (text)
moderation_status      → moderation_status (text)
moderation_reason      → moderation_reason (text)
hidden (boolean)       → hidden (boolean)
created_at             → created_at (timestamptz)
updated_at             → updated_at (timestamptz)
```

### comments (NEW in Supabase)
```
id (bigserial primary key)
content (text not null)
author_id (uuid references profiles)
post_id (bigint references posts)
deleted (boolean default false)
hidden (boolean default false)
created_at (timestamptz)
updated_at (timestamptz)
```

### donations (NEW in Supabase)
```
id (bigserial primary key)
user_id (uuid references profiles)
amount_cents (integer not null)
currency (text default 'USD')
message (text)
provider (text default 'pending')
provider_ref (text)
stripe_session_id (text)
status (text default 'initiated')
created_at (timestamptz)
```

### media_requests (NEW in Supabase)
```
id (bigserial primary key)
user_id (uuid references profiles not null)
status (text default 'pending')
reason (text not null)
admin_id (uuid references profiles)
created_at (timestamptz)
updated_at (timestamptz)
```

### notifications (NEW in Supabase)
```
id (bigserial primary key)
recipient_id (uuid not null)
actor_id (uuid)
event_type (text not null)
post_id (bigint)
comment_id (bigint)
prayer_request_id (bigint)
commitment_id (bigint)
message (text not null)
is_read (boolean default false)
read_at (timestamptz)
created_at (timestamptz)
```

### push_tokens (NEW in Supabase)
```
id (bigserial primary key)
user_id (uuid not null)
token (text not null)
platform (text default 'web')
daily_verse_enabled (boolean default false)
created_at (timestamptz)
updated_at (timestamptz)
```

### reports (may need update in Supabase)
```
id (uuid primary key)
target_type (text not null)
target_id (text not null)
reason (text not null)
reporter_id (uuid not null)
status (text default 'open')
created_at (timestamptz)
updated_at (timestamptz)
```

## Files to Update After Migration

### Server Files
- `server/routes.ts` - Replace all `db.` calls with Supabase
- `server/storage.ts` - Remove or update to use Supabase
- `server/db.ts` - Remove Drizzle connection (keep for reference)

### Client Files (already partially using Supabase)
- `client/src/lib/profiles.ts` - Update to use Supabase directly
- `client/src/lib/posts.ts` - Update to use Supabase directly
- `client/src/lib/comments.ts` - Update to use Supabase directly
