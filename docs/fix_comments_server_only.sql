-- ================================================
-- FIX: Block Direct Supabase Comment Inserts
-- ================================================
-- This script ensures comments can ONLY be created through the 
-- Express API endpoint (POST /api/comments) which enforces:
-- - JWT authentication
-- - Banned user checks
-- - Content moderation (hard-blocked terms)
-- - AI validation (GPT-4o-mini)
--
-- CRITICAL: This prevents users from bypassing moderation by
-- calling Supabase directly with the anon key.
-- ================================================

-- Drop the existing permissive INSERT policy that allows direct inserts
DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;
DROP POLICY IF EXISTS "non_banned_users_can_insert_comments" ON public.comments;

-- OPTION 1: Block anon key inserts while allowing server inserts
-- The Express server uses DATABASE_URL which connects with postgres/service_role
-- Client-side Supabase uses the anon key

-- Create policy that ONLY allows service role inserts (blocks all client inserts)
CREATE POLICY "Only service role can insert comments" ON public.comments
  FOR INSERT TO PUBLIC  -- Applies to all roles, including backend connection
  WITH CHECK (
    -- Allow ONLY if no JWT claims exist (server connection via DATABASE_URL)
    -- Block ALL Supabase client calls (anon AND authenticated tokens)
    -- This forces 100% of inserts through the moderated Express API
    current_setting('request.jwt.claims', true) IS NULL
    OR 
    (current_setting('request.jwt.claims', true)::json->>'role') IS NULL
  );

-- OPTION 2: If the above doesn't work, use Postgres RPC function (more complex)
-- Create function for inserting comments (bypasses RLS with SECURITY DEFINER)
-- Then have Express call this function instead of direct INSERT
-- See commented section below for implementation

/*
-- Create secure RPC function for comment insertion
CREATE OR REPLACE FUNCTION insert_comment_moderated(
  p_content TEXT,
  p_post_id INTEGER,
  p_author_id TEXT
) RETURNS public.comments AS $$
DECLARE
  new_comment public.comments;
BEGIN
  INSERT INTO public.comments (content, post_id, author_id)
  VALUES (p_content, p_post_id, p_author_id)
  RETURNING * INTO new_comment;
  
  RETURN new_comment;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (Express will call this)
GRANT EXECUTE ON FUNCTION insert_comment_moderated(TEXT, INTEGER, TEXT) TO authenticated;
*/

-- Keep SELECT policy unchanged (users can read comments)
-- (existing policy should remain)

-- Keep UPDATE policy unchanged (authors can update their own comments for soft-delete)
-- (existing policy should remain)

-- Keep DELETE policy unchanged (authors can delete their own comments)
-- (existing policy should remain)

-- ================================================
-- IMPORTANT NOTES
-- ================================================
-- The Express server connects to the database using DATABASE_URL,
-- which is a direct Postgres connection (not through Supabase SDK).
-- 
-- OPTION 1 Logic:
-- - Policy applies TO PUBLIC (covers all database roles)
-- - Allows inserts ONLY when JWT claims are NULL (server connections via DATABASE_URL)
-- - Blocks ALL Supabase client calls:
--   * Anon key (JWT role='anon') → BLOCKED
--   * Authenticated users (JWT role='authenticated') → BLOCKED
-- - This forces 100% of user inserts through the moderated Express API
-- - Server-side Express API inserts via DATABASE_URL have no JWT → ALLOWED
--
-- To verify your database connection role, run in Supabase SQL Editor:
-- SELECT current_user;
-- (Should return: postgres, service_role, or similar elevated role)
--
-- If OPTION 1 doesn't work after testing:
--   - Use OPTION 2 (RPC function) instead
--   - Update Express endpoint to call RPC function
-- ================================================

-- ================================================
-- VERIFICATION & TESTING
-- ================================================
-- After running OPTION 1, test thoroughly:

-- TEST 1: Try direct Supabase insert from client (should FAIL)
-- Run this in browser console with Supabase anon key:
-- await supabase.from('comments').insert({
--   content: 'spam content',
--   post_id: 1,
--   author_id: user.id
-- })
-- Expected: RLS violation error or permission denied

-- TEST 2: Comment creation via Express API (should SUCCEED)
-- POST /api/comments
-- Headers: { "Authorization": "Bearer <user_jwt_token>" }
-- Body: { "content": "Praise Jesus!", "post_id": 1 }
-- Expected: Success (201) with comment data

-- TEST 3: Moderation enforcement via API (should FAIL)
-- POST /api/comments
-- Body: { "content": "praise allah", "post_id": 1 }
-- Expected: 400 error with moderation reason

-- If TEST 1 doesn't fail (direct inserts still work), then:
-- 1. Check what role DATABASE_URL uses: SELECT current_user;
-- 2. If it's 'postgres' or bypasses RLS, that's fine - clients still blocked
-- 3. If it's 'authenticated' and TEST 1 passes, switch to OPTION 2 (RPC)
-- ================================================
