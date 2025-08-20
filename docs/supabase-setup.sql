-- Essential SQL commands to run in Supabase SQL Editor
-- Run these commands one by one in your Supabase dashboard

-- 1. Set your user as admin (replace with your actual user ID)
UPDATE profiles SET role = 'admin' WHERE id = 'db368b3a-7353-42b6-8267-df529a4acba1';

-- 2. Create media_requests table if it doesn't exist
CREATE TABLE IF NOT EXISTS media_requests (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR REFERENCES profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status VARCHAR DEFAULT 'pending' NOT NULL,
  admin_id VARCHAR REFERENCES profiles(id) ON DELETE SET NULL,
  admin_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- 3. Enable RLS on media_requests table
ALTER TABLE media_requests ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS policies for media_requests
CREATE POLICY "Users can view their own media requests" ON media_requests
  FOR SELECT USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own media requests" ON media_requests
  FOR INSERT WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all media requests" ON media_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update media requests" ON media_requests
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid()::text 
      AND profiles.role = 'admin'
    )
  );

-- 5. Fix prayer_commitments foreign key if it exists (this might resolve the prayer_commitments_1.id error)
-- First check if the foreign key constraint exists
-- If you get an error about prayer_commitments_warrior_fkey, run:
-- ALTER TABLE prayer_commitments DROP CONSTRAINT IF EXISTS prayer_commitments_warrior_fkey;
-- ALTER TABLE prayer_commitments ADD CONSTRAINT prayer_commitments_warrior_fkey 
--   FOREIGN KEY (warrior) REFERENCES profiles(id) ON DELETE CASCADE;

-- 6. Ensure media_enabled column exists on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS media_enabled BOOLEAN DEFAULT FALSE NOT NULL;

-- 7. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_media_requests_user_id ON media_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_media_requests_status ON media_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);

-- 8. Grant necessary permissions (if needed)
-- These are usually automatic in Supabase but run if you have permission issues
-- GRANT SELECT, INSERT ON media_requests TO authenticated;
-- GRANT SELECT, UPDATE ON profiles TO authenticated;

-- Verify your admin status
SELECT id, display_name, email, role FROM profiles WHERE id = 'db368b3a-7353-42b6-8267-df529a4acba1';