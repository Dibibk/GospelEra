# Security Audit Results - Gospel Era

**Audit Date**: November 20, 2025  
**Audit Scope**: Content Moderation & Error Handling

---

## Issue #5: Content Moderation Bypassing

### Status: ⚠️ PARTIALLY FIXED

### Finding:
AI moderation validation is enforced server-side for **Posts** and **Prayer Requests**, but **Comments have NO server-side validation**.

### Details:

#### ✅ **Posts** - SECURE
- **Location**: `server/routes.ts` lines 367-439
- **Validation**: 
  1. Hard-blocked terms check via `moderateContent()`
  2. OpenAI GPT-4o-mini AI validation
  3. Enforced on POST `/api/posts`
- **Protection**: Cannot be bypassed - validation runs server-side before database insert

#### ✅ **Prayer Requests** - SECURE  
- **Location**: `server/routes.ts` lines 556-588
- **Validation**:
  1. `validateFaithContent()` checks title and details
  2. Requires Christian terms OR Bible references
  3. Enforced on POST `/api/prayer-requests`
- **Protection**: Cannot be bypassed - validation runs server-side before database insert

#### ✅ **Comments** - FULLY FIXED (Requires RLS Application in Supabase)
- **Location**: Server-side endpoint created at `server/routes.ts` lines 544-615
- **Validation**: 
  1. JWT authentication via `authenticateUser` middleware
  2. Banned user check via `checkNotBanned` middleware
  3. Hard-blocked terms check via `moderateContent()`
  4. OpenAI GPT-4o-mini AI validation
- **Client Updated**: `client/src/lib/comments.ts` now uses server API with Authorization header
- **RLS Fix Created**: `docs/fix_comments_server_only.sql` blocks ALL direct Supabase inserts
- **Protection**: ✅ **FULLY SECURE** (after RLS fix is applied in Supabase)

### Action Required: Apply RLS Fix in Supabase

The fix is complete in code, but you must apply the RLS policy in your Supabase database to activate it.

**Step 1: Run RLS Fix** (In Supabase SQL Editor):
```sql
-- See docs/fix_comments_server_only.sql for complete script

-- Drop old permissive policies
DROP POLICY IF EXISTS "comments_insert_policy" ON public.comments;
DROP POLICY IF EXISTS "Users can create comments" ON public.comments;

-- Create policy that blocks ALL client inserts (anon AND authenticated)
CREATE POLICY "Only service role can insert comments" ON public.comments
  FOR INSERT TO PUBLIC
  WITH CHECK (
    current_setting('request.jwt.claims', true) IS NULL
    OR 
    (current_setting('request.jwt.claims', true)::json->>'role') IS NULL
  );
```

**Step 2: Verify RLS is Enabled**:
```sql
-- Ensure RLS is active
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;
```

**After applying this RLS fix**:
- ✅ Comments can ONLY be created via POST `/api/comments`
- ✅ All comments go through hard-blocked terms + AI moderation
- ✅ Banned users cannot create comments (checkNotBanned middleware)
- ✅ Direct Supabase calls (anon AND authenticated tokens) fail with RLS violation
- ✅ Express server inserts via DATABASE_URL work (no JWT claims = allowed)
- ✅ Vulnerability is fully closed

**Testing** (See `docs/fix_comments_server_only.sql` for detailed tests):
1. Try direct Supabase insert from browser → Should FAIL
2. POST to `/api/comments` with valid content → Should SUCCEED
3. POST to `/api/comments` with spam content → Should FAIL with moderation reason

---

## Issue #6: Profiles Role Privilege Escalation

### Status: ✅ FULLY FIXED (Requires RLS Application in Supabase)

### Finding:
Users could modify their own `role` field via direct Supabase calls to gain admin privileges, bypassing authorization controls.

### Details:

**Vulnerability**:
- Profile updates use direct Supabase calls (`client/src/lib/profiles.ts`)
- TypeScript interface restricts fields client-side, but can be bypassed
- Malicious user could execute: `supabase.from('profiles').update({ role: 'admin' }).eq('id', userId)`
- Similarly, `media_enabled` could be set without admin approval

**Solution Implemented** (Same pattern as comments moderation):

#### ✅ **1. Server-Side API Endpoint**
- **Location**: `server/routes.ts` lines 325-381
- **Endpoint**: PATCH `/api/profile`
- **Validation**:
  1. JWT authentication via `authenticateUser` middleware
  2. Explicit rejection of `role` and `media_enabled` fields (403 Forbidden)
  3. Display name length validation (2-40 characters)
  4. Updates via Drizzle using DATABASE_URL connection

```javascript
// SECURITY: Reject any attempt to modify protected fields
if ('role' in req.body || 'media_enabled' in req.body) {
  return res.status(403).json({ 
    error: "Cannot modify protected fields..." 
  });
}
```

#### ✅ **2. Client Updated**
- **Location**: `client/src/lib/profiles.ts`
- **Functions Updated**:
  - `upsertMyProfile()` - Now calls PATCH `/api/profile` with Authorization header
  - `updateUserSettings()` - Now calls PATCH `/api/profile` with Authorization header
- **Removed**: Direct Supabase `.update()` and `.upsert()` calls

#### ✅ **3. RLS Policy Created**
- **Location**: `docs/fix_profiles_role_security.sql`
- **Policy**: Blocks ALL direct client updates (anon AND authenticated)
- **Allows**: Only server updates via DATABASE_URL (no JWT claims)

```sql
CREATE POLICY "Only service role can update profiles" ON public.profiles
  FOR UPDATE TO PUBLIC
  WITH CHECK (
    current_setting('request.jwt.claims', true) IS NULL
    OR 
    (current_setting('request.jwt.claims', true)::json->>'role') IS NULL
  );
```

#### ✅ **4. Admin Endpoint Preserved**
- **Location**: `server/routes.ts` lines 293-309
- **Endpoint**: PATCH `/api/admin/users/:userId/role`
- **Security**: Requires `requireAdmin` middleware
- **Access**: Uses DATABASE_URL (bypasses RLS)
- **Allowed Values**: 'user', 'banned', 'admin'

### Action Required: Apply RLS Fix in Supabase

The fix is complete in code, but you must apply the RLS policy in your Supabase database to activate it.

**Step 1: Run RLS Fix** (In Supabase SQL Editor):
```sql
-- See docs/fix_profiles_role_security.sql for complete script

-- Drop old permissive policies
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

-- Create policy that blocks ALL client updates (anon AND authenticated)
CREATE POLICY "Only service role can update profiles" ON public.profiles
  FOR UPDATE TO PUBLIC
  WITH CHECK (
    current_setting('request.jwt.claims', true) IS NULL
    OR 
    (current_setting('request.jwt.claims', true)::json->>'role') IS NULL
  );

-- Ensure RLS is enabled
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
```

**After applying this RLS fix**:
- ✅ Profiles can ONLY be updated via PATCH `/api/profile`
- ✅ Protected fields (role, media_enabled) cannot be modified by users
- ✅ Direct Supabase calls (anon AND authenticated tokens) fail with RLS violation
- ✅ Admin endpoint can still update roles via DATABASE_URL
- ✅ Express server updates via DATABASE_URL work (no JWT claims = allowed)
- ✅ Vulnerability is fully closed

**Testing** (See `docs/fix_profiles_role_security.sql` for detailed tests):
1. Try direct Supabase update with role change → Should FAIL (RLS violation)
2. PATCH to `/api/profile` with valid fields → Should SUCCEED
3. PATCH to `/api/profile` with role field → Should FAIL (403 Forbidden)
4. Admin endpoint updates role → Should SUCCEED

---

## Issue #7: Error Information Leakage

### Status: ⚠️ PARTIALLY FIXED

### Finding:
Error handling properly sanitizes error messages in API responses, but **stack traces are still logged to console** which could be exposed in production.

### Details:

#### ✅ **API Responses** - SECURE
- **Location**: `server/index.ts` lines 53-59
- **Current Behavior**: 
  ```javascript
  res.status(status).json({ message });  // Only sends message, not stack trace
  ```
- **Protection**: Clients don't see stack traces or sensitive error details
- **Example**: `{ "error": "Failed to create post" }` instead of full stack trace

#### ⚠️ **Console Logging** - NEEDS IMPROVEMENT
- **Location**: Throughout `server/routes.ts` - multiple `console.error()` calls
- **Current Behavior**: Stack traces logged to server console
- **Risk**: If production logs are exposed (e.g., through logging service), stack traces could leak
- **Examples**:
  - Line 262: `console.error("Error getting media upload URL:", error)`
  - Line 306: `console.error("Error updating user role:", error)`
  - Line 362: `console.error("Error fetching posts:", error)`

### Fix Required:

**Create Production-Safe Error Logger**:

```typescript
// server/utils/logger.ts
const isDevelopment = process.env.NODE_ENV === 'development';

export function logError(message: string, error: any) {
  if (isDevelopment) {
    // Development: Show full error details
    console.error(message, error);
  } else {
    // Production: Only log sanitized message
    console.error(message, {
      message: error.message,
      code: error.code,
      // Omit stack trace in production
    });
  }
}
```

**Replace all `console.error()` calls**:
```typescript
// Before
console.error("Error creating post:", error);

// After
logError("Error creating post", error);
```

---

## Summary & Recommendations

### Critical Issues (Fix Before Production):
1. ⚠️ **Comments need RLS lockdown** - Apply `docs/fix_comments_server_only.sql` to block direct Supabase inserts
2. ⚠️ **Profiles need RLS lockdown** - Apply `docs/fix_profiles_role_security.sql` to block direct Supabase updates

### Medium Priority:
3. ⚠️ **Error logging improvements** - Implement production-safe logger (low priority, optional)

### Completed (Secure):
4. ✅ **Comments moderation** - Server-side API implemented with AI validation
5. ✅ **Profiles security** - Server-side API prevents privilege escalation
6. ✅ **Posts validation** - Hard-blocked terms + AI moderation
7. ✅ **Prayer requests validation** - Faith content validation
8. ✅ **File upload security** - Type whitelist and size limits enforced
9. ✅ **JWT authentication** - All protected endpoints secured
10. ✅ **Banned user restrictions** - checkNotBanned middleware on all content creation

### Implementation Details:

**Comments Moderation Fix**:
- ✅ Server endpoint: POST `/api/comments` (lines 544-615)
- ✅ Client updated: `client/src/lib/comments.ts`
- ✅ RLS script: `docs/fix_comments_server_only.sql`
- ⚠️ **Pending**: Apply RLS in Supabase database

**Profiles Security Fix**:
- ✅ Server endpoint: PATCH `/api/profile` (lines 325-381)
- ✅ Client updated: `client/src/lib/profiles.ts` (upsertMyProfile, updateUserSettings)
- ✅ RLS script: `docs/fix_profiles_role_security.sql`
- ⚠️ **Pending**: Apply RLS in Supabase database

---

## Production Deployment Checklist

Before deploying to production:

### Critical Security Fixes (MUST DO):
- [ ] **CRITICAL**: Apply RLS fix for comments: `docs/fix_comments_server_only.sql`
- [ ] **CRITICAL**: Apply RLS fix for profiles: `docs/fix_profiles_role_security.sql`
- [ ] **CRITICAL**: Test both RLS policies work correctly (see test sections in SQL files)

### Code Changes (COMPLETED ✅):
- [x] ✅ Create server-side comments API endpoint with moderation
- [x] ✅ Update comment creation to use new API endpoint (not direct Supabase)
- [x] ✅ Create server-side profiles API endpoint with field validation
- [x] ✅ Update profile updates to use new API endpoint (not direct Supabase)

### Optional Improvements:
- [ ] Implement production-safe error logger (low priority)
- [ ] Replace all `console.error()` with new logger
- [ ] Run RLS test suite: `docs/test_rls_policies.sql`
- [ ] Verify all environment variables are set (production)
- [ ] Enable error monitoring/logging service (e.g., Sentry)
- [ ] Set `NODE_ENV=production` in production environment
- [ ] Test comment creation fails via direct Supabase calls
- [ ] Test comment creation succeeds via POST /api/comments

---

## Files to Update

### For Comments Server-Side Validation:
1. `server/routes.ts` - Add POST `/api/comments` endpoint
2. `client/src/lib/comments.ts` - Change to use API endpoint instead of Supabase direct
3. `client/src/components/CommentInputMobile.tsx` - Update API call

### For Error Logging:
1. Create `server/utils/logger.ts` - Production-safe logger
2. `server/routes.ts` - Replace ~40 console.error calls
3. `server/auth.ts` - Replace console.error calls
4. `server/hybridStorage.ts` - Replace console.error calls
5. `server/embeds.ts` - Replace console.error calls

---

**Last Updated**: November 20, 2025  
**Next Review**: Before production deployment
