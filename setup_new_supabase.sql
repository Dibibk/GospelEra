-- Complete Schema Setup for New Supabase Database
-- Run this in your NEW Supabase SQL Editor

-- 1. Create profiles table (linked to Supabase auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  email TEXT,
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'user' NOT NULL, -- 'user', 'admin', 'banned'
  accepted_guidelines BOOLEAN DEFAULT false NOT NULL,
  affirmed_faith BOOLEAN DEFAULT false NOT NULL,
  show_name_on_prayers BOOLEAN DEFAULT true NOT NULL,
  private_profile BOOLEAN DEFAULT false NOT NULL,
  media_enabled BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 2. Create posts table
CREATE TABLE posts (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  tags TEXT[] DEFAULT '{}' NOT NULL,
  media_urls TEXT[] DEFAULT '{}' NOT NULL,
  embed_url TEXT,
  moderation_status TEXT DEFAULT 'approved' NOT NULL,
  moderation_reason TEXT,
  hidden BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Create comments table
CREATE TABLE comments (
  id SERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  author_id UUID REFERENCES profiles(id) NOT NULL,
  post_id INTEGER REFERENCES posts(id) NOT NULL,
  deleted BOOLEAN DEFAULT false NOT NULL,
  hidden BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 4. Create reports table
CREATE TABLE reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  target_type TEXT NOT NULL, -- 'post' or 'comment'
  target_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  reporter_id UUID REFERENCES profiles(id) NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL, -- 'open', 'resolved', 'dismissed'
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 5. Create prayer_requests table
CREATE TABLE prayer_requests (
  id BIGSERIAL PRIMARY KEY,
  requester UUID REFERENCES profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  details TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}' NOT NULL,
  embed_url TEXT,
  moderation_status TEXT DEFAULT 'approved' NOT NULL,
  moderation_reason TEXT,
  is_anonymous BOOLEAN DEFAULT false NOT NULL,
  status TEXT DEFAULT 'open' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 6. Create prayer_commitments table
CREATE TABLE prayer_commitments (
  request_id BIGINT REFERENCES prayer_requests(id) ON DELETE CASCADE,
  warrior UUID REFERENCES profiles(id) ON DELETE CASCADE,
  committed_at TIMESTAMP DEFAULT NOW() NOT NULL,
  status TEXT DEFAULT 'committed' NOT NULL,
  prayed_at TIMESTAMP,
  note TEXT,
  PRIMARY KEY (request_id, warrior)
);

-- 7. Create prayer_activity table
CREATE TABLE prayer_activity (
  id BIGSERIAL PRIMARY KEY,
  request_id BIGINT REFERENCES prayer_requests(id) ON DELETE CASCADE,
  actor UUID REFERENCES profiles(id) ON DELETE SET NULL,
  kind TEXT NOT NULL,
  message TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 8. Create donations table
CREATE TABLE donations (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  amount_cents INTEGER NOT NULL,
  currency TEXT DEFAULT 'USD' NOT NULL,
  message TEXT,
  provider TEXT DEFAULT 'pending' NOT NULL,
  provider_ref TEXT,
  stripe_session_id TEXT,
  status TEXT DEFAULT 'initiated' NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 9. Create media_requests table
CREATE TABLE media_requests (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status TEXT DEFAULT 'pending' NOT NULL,
  reason TEXT NOT NULL,
  admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 10. Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE prayer_activity ENABLE ROW LEVEL SECURITY;
ALTER TABLE donations ENABLE ROW LEVEL SECURITY;
ALTER TABLE media_requests ENABLE ROW LEVEL SECURITY;