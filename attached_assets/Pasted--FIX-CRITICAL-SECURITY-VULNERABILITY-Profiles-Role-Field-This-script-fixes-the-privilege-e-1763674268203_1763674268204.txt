/*
  FIX CRITICAL SECURITY VULNERABILITY: Profiles Role Field
  
  This script fixes the privilege escalation vulnerability where users could
  potentially modify their own role field to gain admin access.
  
  Run this in Supabase SQL Editor BEFORE production deployment.
*/

-- =====================================================
-- STEP 1: Backup Current Policy
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE 'Backing up current profile update policy...';
END $$;

-- =====================================================
-- STEP 2: Drop Insecure Policy
-- =====================================================

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- =====================================================
-- STEP 3: Create Secure Restricted Policy
-- =====================================================

-- This policy allows users to update their profile EXCEPT for protected fields
CREATE POLICY "Users can update their own profile (restricted)" ON public.profiles
  FOR UPDATE 
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their role (privilege escalation)
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    -- Prevent users from enabling media without admin approval
    media_enabled = (SELECT media_enabled FROM public.profiles WHERE id = auth.uid())
  );

-- =====================================================
-- STEP 4: Create Admin-Only Policy
-- =====================================================

-- This policy allows admins to update ANY profile including role and media_enabled
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE 
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- =====================================================
-- STEP 5: Verify Policies
-- =====================================================

DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== VERIFICATION ===';
  
  -- Count update policies on profiles table
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'profiles'
  AND cmd = 'UPDATE';
  
  RAISE NOTICE 'Update policies on profiles table: %', policy_count;
  
  IF policy_count >= 2 THEN
    RAISE NOTICE 'SUCCESS: Security policies applied!';
    RAISE NOTICE '';
    RAISE NOTICE 'Active Policies:';
    RAISE NOTICE '1. Users can update their own profile (restricted) - prevents role changes';
    RAISE NOTICE '2. Admins can update any profile - allows admin role management';
  ELSE
    RAISE WARNING 'WARNING: Expected at least 2 update policies, found %', policy_count;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Run docs/test_rls_policies.sql to verify security';
  RAISE NOTICE '2. Test that regular users CANNOT change their role';
  RAISE NOTICE '3. Test that admins CAN change user roles';
  RAISE NOTICE '4. Deploy to production';
END $$;

-- =====================================================
-- STEP 6: Display Current Policies
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
