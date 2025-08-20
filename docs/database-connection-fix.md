# Database Connection Fix

## Current Status: ✅ CONNECTED but Authentication Error

The DATABASE_URL is now connecting successfully, but we're getting:
```
PostgresError: Tenant or user not found
```

## Fix Steps:

### 1. Check Your DATABASE_URL Format
Make sure your DATABASE_URL in Replit Secrets looks exactly like this:
```
postgresql://postgres.zvmvyixghcqxpnalmrbj:[YOUR-ACTUAL-PASSWORD]@aws-0-us-west-1.pooler.supabase.com:5432/postgres
```

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