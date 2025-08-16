-- Run this in Supabase SQL Editor to create search indexes for better performance

create extension if not exists pg_trgm;

create index if not exists posts_title_trgm on posts using gin (lower(title) gin_trgm_ops);

create index if not exists posts_content_trgm on posts using gin (lower(content) gin_trgm_ops);

create index if not exists posts_tags_gin on posts using gin (tags);