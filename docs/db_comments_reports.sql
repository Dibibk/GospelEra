/*
  SUPABASE COMMENTS AND REPORTS SETUP
  
  Copy and paste this entire SQL script into your Supabase SQL Editor and run it.
  This will create the comments and reports tables with proper RLS policies.
  
  Run this after the main database setup (docs/db.sql)
*/

-- Create comments table
create table public.comments (
  id bigserial primary key,
  post_id bigint references public.posts(id) on delete cascade,
  author uuid references public.profiles(id) on delete set null,
  content text not null,
  created_at timestamptz default now(),
  is_deleted boolean default false
);

-- Create reports table  
create table public.reports (
  id bigserial primary key,
  target_type text check (target_type in ('post','comment')) not null,
  target_id text not null,
  reporter uuid references public.profiles(id) on delete set null,
  reason text,
  status text default 'open' check (status in ('open','resolved','dismissed')),
  created_at timestamptz default now()
);

-- Enable RLS on both tables
alter table public.comments enable row level security;
alter table public.reports enable row level security;

-- COMMENTS RLS POLICIES

-- Anyone authenticated can select non-deleted comments
create policy "Anyone authenticated can view non-deleted comments"
  on public.comments for select
  to authenticated
  using (is_deleted = false);

-- Users can insert comments (they become the author)
create policy "Users can create comments"
  on public.comments for insert
  to authenticated
  with check (auth.uid() = author);

-- Authors can update their own comments
create policy "Authors can update own comments"
  on public.comments for update
  to authenticated
  using (auth.uid() = author);

-- Authors can delete their own comments
create policy "Authors can delete own comments"
  on public.comments for delete
  to authenticated
  using (auth.uid() = author);

-- REPORTS RLS POLICIES

-- Authenticated users can insert reports
create policy "Users can create reports"
  on public.reports for insert
  to authenticated
  with check (auth.uid() = reporter);

-- Reporters can select their own reports
create policy "Reporters can view own reports"
  on public.reports for select
  to authenticated
  using (auth.uid() = reporter);

-- CREATE INDEXES

-- Indexes for comments
create index comments_post_id_idx on public.comments (post_id);
create index comments_author_idx on public.comments (author);
create index comments_created_at_idx on public.comments (created_at desc);
create index comments_is_deleted_idx on public.comments (is_deleted);

-- Indexes for reports
create index reports_target_type_idx on public.reports (target_type);
create index reports_target_id_idx on public.reports (target_id);
create index reports_reporter_idx on public.reports (reporter);
create index reports_status_idx on public.reports (status);
create index reports_created_at_idx on public.reports (created_at desc);