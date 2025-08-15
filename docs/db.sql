/*
  SUPABASE DATABASE SETUP
  
  Copy and paste this entire SQL script into your Supabase SQL Editor and run it.
  This will create the profiles and posts tables with proper RLS policies.
  
  Make sure to run this in your Supabase project's SQL Editor.
*/

-- Enable required extensions
create extension if not exists pg_trgm;

-- Create profiles table
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  role text default 'user',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Create posts table  
create table public.posts (
  id bigserial primary key,
  author uuid references public.profiles(id) on delete set null,
  created_at timestamptz default now(),
  title text not null,
  content text not null,
  tags text[] default '{}',
  is_deleted boolean default false
);

-- Enable RLS on both tables
alter table public.profiles enable row level security;
alter table public.posts enable row level security;

-- PROFILES RLS POLICIES

-- Anyone authenticated can select profiles
create policy "Anyone authenticated can view profiles"
  on public.profiles for select
  to authenticated
  using (true);

-- Users can update only their own profile
create policy "Users can update own profile"
  on public.profiles for update
  to authenticated
  using (auth.uid() = id);

-- Admins can update all profiles
create policy "Admins can update all profiles"
  on public.profiles for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Users can insert their own profile (for initial profile creation)
create policy "Users can insert own profile"
  on public.profiles for insert
  to authenticated
  with check (auth.uid() = id);

-- POSTS RLS POLICIES

-- Anyone authenticated can select non-deleted posts
create policy "Anyone authenticated can view non-deleted posts"
  on public.posts for select
  to authenticated
  using (is_deleted = false);

-- Users can insert posts (they become the author)
create policy "Users can create posts"
  on public.posts for insert
  to authenticated
  with check (auth.uid() = author);

-- Authors can update their own posts
create policy "Authors can update own posts"
  on public.posts for update
  to authenticated
  using (auth.uid() = author);

-- Authors can delete their own posts
create policy "Authors can delete own posts"
  on public.posts for delete
  to authenticated
  using (auth.uid() = author);

-- Admins can update any post
create policy "Admins can update all posts"
  on public.posts for update
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- Admins can delete any post
create policy "Admins can delete all posts"
  on public.posts for delete
  to authenticated
  using (
    exists (
      select 1 from public.profiles
      where id = auth.uid() and role = 'admin'
    )
  );

-- CREATE INDEXES

-- GIN index on posts content for full-text search
create index posts_content_gin_idx on public.posts using gin (content gin_trgm_ops);

-- Additional useful indexes
create index posts_author_idx on public.posts (author);
create index posts_created_at_idx on public.posts (created_at desc);
create index posts_is_deleted_idx on public.posts (is_deleted);

-- Function to automatically update updated_at timestamp
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger to automatically update updated_at on profiles
create trigger profiles_updated_at
  before update on public.profiles
  for each row
  execute function update_updated_at();