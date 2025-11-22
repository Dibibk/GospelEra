/*
  FIX CRITICAL SECURITY VULNERABILITY: Profiles Role Privilege Escalation
  
  This script fixes the privilege escalation vulnerability where users could
  modify their own role field via direct Supabase calls to gain admin access.
  
  SOLUTION: Server-Side API + RLS Blocking (same pattern as comments moderation)
  1. Server endpoint PATCH /api/profile validates that protected fields cannot be modified
  2. Client uses API instead of direct Supabase calls
  3. RLS policy blocks ALL direct client updates (anon AND authenticated)
  4. Server inserts via DATABASE_URL (no JWT claims) are allowed
  
  Run this in Supabase SQL Editor BEFORE production deployment.
*/

-- =====================================================
-- STEP 1: Drop Old Permissive Policies
-- =====================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile (restricted)" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update any profile" ON public.profiles;

-- =====================================================
-- STEP 2: Create Policy - Block All Client Updates
-- =====================================================

-- Create policy that ONLY allows service role updates (blocks all client updates)
-- This is the same pattern as comments moderation
CREATE POLICY "Only service role can update profiles" ON public.profiles
  FOR UPDATE TO PUBLIC
  WITH CHECK (
    -- Allow ONLY if no JWT claims exist (server connection via DATABASE_URL)
    -- Block ALL Supabase client calls (anon AND authenticated tokens)
    -- This forces 100% of user updates through the PATCH /api/profile endpoint
    current_setting('request.jwt.claims', true) IS NULL
    OR 
    (current_setting('request.jwt.claims', true)::json->>'role') IS NULL
  );

-- =====================================================
-- STEP 3: Verify RLS is Enabled
-- =====================================================

-- Ensure RLS is active on profiles table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 4: Display Current Policies
-- =====================================================

SELECT 
  schemaname,
  tablename,
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;

-- ================================================
-- VERIFICATION & TESTING
-- ================================================

-- TEST 1: Verify authenticated users CANNOT update profile directly
-- This should FAIL with RLS violation
-- (Test from browser console after logging in)

/*
// Get Supabase client
const { createClient } = require('@supabase/supabase-js')
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Try to update profile directly (including role escalation attempt)
const { data, error } = await supabase
  .from('profiles')
  .update({ 
    display_name: 'Hacked',
    role: 'admin'  // Privilege escalation attempt
  })
  .eq('id', userId)

// Expected: RLS error - update blocked
console.log(error) // Should show policy violation
*/

-- TEST 2: Verify users CAN update profile via API
-- This should SUCCEED for allowed fields
-- (Test from browser console or API client)

/*
// Get auth token
const { data: { session } } = await supabase.auth.getSession()

// Update via API endpoint
const response = await fetch('/api/profile', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    display_name: 'Test User',
    bio: 'Testing profile security'
  })
})

// Expected: Success
console.log(await response.json())
*/

-- TEST 3: Verify users CANNOT modify protected fields via API
-- This should FAIL with 403 Forbidden
-- (Test from browser console or API client)

/*
const response = await fetch('/api/profile', {
  method: 'PATCH',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${session.access_token}`
  },
  body: JSON.stringify({
    role: 'admin'  // Attempt to escalate
  })
})

// Expected: 403 Forbidden with error message
console.log(await response.json()) 
// { error: "Cannot modify protected fields..." }
*/

-- TEST 4: Verify admin endpoint can update role via DATABASE_URL
-- (Test via Express API endpoint)
-- PATCH /api/admin/users/:userId/role
-- Headers: Authorization: Bearer <admin_token>
-- Body: { "role": "banned" }
-- Expected: Success - admin endpoint uses DATABASE_URL (no JWT claims)

-- ================================================
-- IMPORTANT NOTES
-- ================================================

-- SOLUTION ARCHITECTURE:
-- 1. Server endpoint PATCH /api/profile enforces field validation
--    - Located in server/routes.ts lines 325-381
--    - Rejects requests containing 'role' or 'media_enabled' with 403
--    - Validates display_name length (2-40 characters)
--    - Updates profile via Drizzle using DATABASE_URL connection
--
-- 2. Client functions use API instead of direct Supabase
--    - upsertMyProfile() in client/src/lib/profiles.ts
--    - updateUserSettings() in client/src/lib/profiles.ts
--    - Both send Authorization header with JWT token
--
-- 3. RLS policy blocks ALL direct Supabase client updates
--    - Only allows updates when JWT claims are NULL (server connection)
--    - Blocks anon key AND authenticated user tokens
--    - Forces 100% of updates through validated API endpoint
--
-- 4. Admin role updates work via separate endpoint
--    - PATCH /api/admin/users/:userId/role
--    - Requires admin role check via requireAdmin middleware
--    - Uses DATABASE_URL connection (bypasses RLS)

-- ================================================
-- DEPLOYMENT CHECKLIST
-- ================================================

/*
1. ✅ Run this script in Supabase SQL Editor (Development)
2. ✅ Verify TEST 1: Direct Supabase update should FAIL
3. ✅ Verify TEST 2: API update with valid fields should SUCCEED
4. ✅ Verify TEST 3: API update with protected fields should FAIL (403)
5. ✅ Verify TEST 4: Admin endpoint can update roles
6. ✅ Run same script in Production Supabase
7. ✅ Re-run all tests in Production
8. ✅ Update docs/SECURITY_AUDIT.md to mark as FIXED
*/
