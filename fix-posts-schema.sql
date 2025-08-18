-- Fix missing columns in posts table
ALTER TABLE posts ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false NOT NULL;

-- Also ensure comments has the hidden column
ALTER TABLE comments ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false NOT NULL;