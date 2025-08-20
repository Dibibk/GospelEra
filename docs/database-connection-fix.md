# Database Connection Fix

## Current Status: ✅ CONNECTED but Authentication Error

The DATABASE_URL is now connecting successfully, but we're getting:
```
PostgresError: Tenant or user not found
```

## Fix Steps:

### 1. Fix DATABASE_URL Format (CRITICAL)
Based on your screenshot, change your DATABASE_URL from:
```
postgresql://postgres.zvmvyixghcqxpnalmrbj:StartupDb1@013aws-0-us-...
```

To this format (notice the difference):
```
postgresql://postgres:[YOUR-PASSWORD]@db.zvmvyixghcqxpnalmrbj.supabase.co:5432/postgres
```

The issue: Your URL has `postgres.zvmvyixghcqxpnalmrbj` but it should be just `postgres` as the username.

### 2. If Still Getting "Tenant or user not found":

**Option A: Try Session Pooler (recommended)**
Get the connection string from Supabase → Settings → Database → "Session" tab instead of "Transaction"

**Option B: Direct Connection**  
Try this format instead:
```
postgresql://postgres:[YOUR-ACTUAL-PASSWORD]@db.zvmvyixghcqxpnalmrbj.supabase.co:5432/postgres
```

### 3. Verify Password
- Go to Supabase Dashboard → Settings → Database
- If unsure about password, click "Reset database password"
- Use the NEW password in your connection string

### 4. Test Connection
After updating, the media access requests should work immediately.

## Current Error Log:
```
Error checking media permission: PostgresError: Tenant or user not found
severity_local: 'FATAL'
severity: 'FATAL' 
code: 'XX000'
```

This indicates the connection string format or credentials need adjustment.