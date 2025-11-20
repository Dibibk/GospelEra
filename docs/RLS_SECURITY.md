# Row-Level Security (RLS) Documentation

## Overview

Gospel Era uses Supabase Row-Level Security (RLS) policies to enforce data access controls at the database level. This document provides a comprehensive overview of all RLS policies across all tables.

**Security Status: CRITICAL REVIEW REQUIRED**

## Critical Security Concerns

### 🚨 PRIVILEGE ESCALATION RISK - Profiles Table

**Issue**: The `profiles.role` field can potentially be modified by users through direct Supabase calls.

**Current Status**: 
- ✅ Client-side code (`upsertMyProfile`) prevents role modifications
- ❌ Database-level RLS policy does NOT prevent users from updating their own `role` field
- ⚠️ Admin endpoints trust the `role` field for authorization decisions

**Impact**: A user could potentially:
1. Make direct Supabase API calls bypassing client-side validation
2. Modify their `profiles.role` from 'user' to 'admin'
3. Gain unauthorized admin access to protected endpoints

**Fix Required**: Add RLS policy to prevent users from modifying their `role` field OR move role to Supabase `auth.users.app_metadata`

---

## Table-by-Table RLS Policies

### 1. Profiles Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Public read access - all users can view all profiles
- **INSERT**: Users can only create their own profile (`auth.uid() = id`)
- **UPDATE**: Users can update their own profile (`auth.uid() = id`)

**Security Gaps**:
- ❌ No restriction on updating `role` field
- ❌ No admin-only fields protection
- ❌ Users can modify `media_enabled` field (should be admin-controlled)

**Recommended Fix**:
```sql
-- Drop existing update policy
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create restricted update policy that excludes role and admin fields
CREATE POLICY "Users can update their own profile (restricted)" ON public.profiles
  FOR UPDATE USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id AND
    -- Prevent users from changing their role
    role = (SELECT role FROM public.profiles WHERE id = auth.uid()) AND
    -- Prevent users from enabling media without admin approval
    media_enabled = (SELECT media_enabled FROM public.profiles WHERE id = auth.uid())
  );

-- Create admin-only policy for role and media_enabled updates
CREATE POLICY "Admins can update any profile" ON public.profiles
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );
```

---

### 2. Posts Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Authenticated users can read non-deleted posts
- **INSERT**: Users can create posts as themselves (`auth.uid() = author`)
- **UPDATE**: Authors can update their own posts
- **DELETE**: Authors can delete their own posts

**Security Status**: ✅ SECURE (assuming `is_deleted` or `hidden` field exists)

**Documentation**: See `docs/complete_posts_fix.sql`

---

### 3. Comments Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Authenticated users can read non-deleted comments (`deleted = false` or `is_deleted = false`)
- **INSERT**: Users can create comments as themselves (`auth.uid() = author_id`)
- **UPDATE**: Authors can update their own comments (for soft-delete)
- **DELETE**: Authors can delete their own comments

**Security Status**: ✅ SECURE

**Documentation**: See `docs/complete_comments_fix.sql`

---

### 4. Prayer Requests Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Authenticated users can read open/answered/closed requests
- **INSERT**: Users can only insert their own requests (`requester = auth.uid()`)
- **UPDATE**: Requesters can update their own unanswered requests OR admins can update any

**Security Status**: ✅ SECURE

**Documentation**: See `docs/db_prayer.sql`

---

### 5. Prayer Commitments Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Authenticated users can read all commitments
- **INSERT**: Users can only commit as themselves (`warrior = auth.uid()`)
- **UPDATE**: Warriors can update their own commitments OR admins can update any
- **DELETE**: Warriors can delete their own commitments OR admins can delete any

**Security Status**: ✅ SECURE

**Documentation**: See `docs/db_prayer.sql`

---

### 6. Prayer Activity Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Authenticated users can read all activity
- **INSERT**: Authenticated users can insert activity logs

**Security Status**: ✅ SECURE (append-only log)

**Documentation**: See `docs/db_prayer.sql`

---

### 7. Bookmarks Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Users can only view their own bookmarks (`auth.uid() = user_id`)
- **INSERT**: Users can only insert their own bookmarks
- **DELETE**: Users can only delete their own bookmarks

**Security Status**: ✅ SECURE

**Documentation**: See `docs/db_bookmarks_reactions.sql`

---

### 8. Reactions Table

**RLS Status**: ✅ ENABLED

**Current Policies**:
- **SELECT**: Public read access (for reaction counts)
- **INSERT**: Users can only insert their own reactions (`auth.uid() = user_id`)
- **DELETE**: Users can only delete their own reactions

**Security Status**: ✅ SECURE

**Documentation**: See `docs/db_bookmarks_reactions.sql`

---

### 9. Reports Table

**RLS Status**: ⚠️ NOT DOCUMENTED

**Expected Policies** (needs verification):
- **SELECT**: Admins only OR users can see their own reports
- **INSERT**: Authenticated users can create reports
- **UPDATE**: Admins only (for changing status)

**Security Status**: ⚠️ NEEDS VERIFICATION

**Action Required**: Document and verify RLS policies in Supabase

---

### 10. Donations Table

**RLS Status**: ⚠️ NOT DOCUMENTED

**Expected Policies** (needs verification):
- **SELECT**: Users can see their own donations OR admins can see all
- **INSERT**: System-generated (payment webhooks)
- **UPDATE**: System/admin only (for status changes)

**Security Status**: ⚠️ NEEDS VERIFICATION

**Action Required**: Document and verify RLS policies in Supabase

---

### 11. Media Requests Table

**RLS Status**: ⚠️ NOT DOCUMENTED

**Expected Policies** (needs verification):
- **SELECT**: Users can see their own requests OR admins can see all
- **INSERT**: Authenticated users can create requests
- **UPDATE**: Admins only (for approval/denial)

**Security Status**: ⚠️ NEEDS VERIFICATION

**Action Required**: Document and verify RLS policies in Supabase

---

## Testing RLS Policies

A comprehensive test suite is available in `docs/test_rls_policies.sql` to verify all RLS policies are working correctly.

### How to Test

1. Open Supabase SQL Editor
2. Run the test script: `docs/test_rls_policies.sql`
3. Review the test results for any failures
4. Fix any failing policies immediately

### Test Coverage

- ✅ Profiles: User cannot modify their own role
- ✅ Posts: Users can only modify their own posts
- ✅ Comments: Users can only modify their own comments
- ✅ Prayer Requests: Users can only modify their own requests
- ✅ Bookmarks: Users can only manage their own bookmarks
- ✅ Reactions: Users can only manage their own reactions

---

## Production Deployment Checklist

Before deploying to production, verify:

- [ ] Run `docs/test_rls_policies.sql` and confirm all tests pass
- [ ] Fix profiles table role update vulnerability
- [ ] Document RLS policies for: reports, donations, media_requests
- [ ] Verify admin endpoints use both JWT and RLS for authorization
- [ ] Test banned user restrictions at RLS level (not just app level)
- [ ] Audit all Supabase direct access points in client code
- [ ] Consider moving `role` to `auth.users.app_metadata` for maximum security

---

## References

- [Supabase RLS Documentation](https://supabase.com/docs/guides/auth/row-level-security)
- Prayer System RLS: `docs/db_prayer.sql`
- Posts RLS: `docs/complete_posts_fix.sql`
- Comments RLS: `docs/complete_comments_fix.sql`
- Bookmarks & Reactions RLS: `docs/db_bookmarks_reactions.sql`
- Profiles RLS: `docs/create_profiles_table.sql`

---

## Security Contact

For security vulnerabilities, please contact the development team immediately.

**Last Updated**: November 20, 2025
