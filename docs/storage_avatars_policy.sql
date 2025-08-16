-- Run this in Supabase SQL Editor to create avatars storage bucket and policies

-- Create the avatars storage bucket (public)
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Policy: Allow public read access to all avatar files
CREATE POLICY "Avatar images are publicly accessible" ON storage.objects
FOR SELECT USING (bucket_id = 'avatars');

-- Policy: Allow authenticated users to upload avatars to their own folder
CREATE POLICY "Users can upload avatar to own folder" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND storage.foldername(name) = auth.uid()::text
);

-- Policy: Allow authenticated users to update avatars in their own folder
CREATE POLICY "Users can update avatar in own folder" ON storage.objects
FOR UPDATE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND storage.foldername(name) = auth.uid()::text
);

-- Policy: Allow authenticated users to delete avatars from their own folder
CREATE POLICY "Users can delete avatar from own folder" ON storage.objects
FOR DELETE USING (
  bucket_id = 'avatars' 
  AND auth.role() = 'authenticated'
  AND storage.foldername(name) = auth.uid()::text
);

-- Example upload path convention:
-- avatars/{auth.uid()}/avatar.png
-- avatars/{auth.uid()}/profile.jpg
-- avatars/550e8400-e29b-41d4-a716-446655440000/avatar.png