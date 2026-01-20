import { createClient } from '@supabase/supabase-js';

// Server-side Supabase admin client with service role key
// This client has admin privileges and should NEVER be exposed to the frontend
// Used for operations like deleting users from Supabase Auth

// Initialize required tables if they don't exist
async function initializeBlockedUsersTable(client: any) {
  try {
    // Try to query the table - if it fails, table doesn't exist
    const { error } = await client.from('blocked_users').select('id').limit(1);
    
    if (error && error.code === '42P01') {
      // Table doesn't exist, create it via raw SQL
      console.log('Creating blocked_users table...');
      const { error: createError } = await client.rpc('exec_sql', {
        query: `
          CREATE TABLE IF NOT EXISTS blocked_users (
            id SERIAL PRIMARY KEY,
            blocker_id VARCHAR NOT NULL,
            blocked_id VARCHAR NOT NULL,
            reason TEXT,
            created_at TIMESTAMP DEFAULT NOW() NOT NULL
          );
          CREATE INDEX IF NOT EXISTS blocked_users_blocker_idx ON blocked_users(blocker_id);
          CREATE INDEX IF NOT EXISTS blocked_users_blocked_idx ON blocked_users(blocked_id);
          CREATE UNIQUE INDEX IF NOT EXISTS blocked_users_unique_idx ON blocked_users(blocker_id, blocked_id);
        `
      });
      if (createError) {
        console.log('Note: blocked_users table may need to be created manually in Supabase');
      } else {
        console.log('blocked_users table created successfully');
      }
    }
  } catch (err) {
    // Table might already exist or RPC not available - that's fine
    console.log('blocked_users table check completed');
  }
}

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl) {
  console.warn('VITE_SUPABASE_URL is not set - Supabase admin client will not work');
}

if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set - Supabase admin operations will not work');
}

// Create admin client only if both URL and service role key are available
export const supabaseAdmin = supabaseUrl && supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    })
  : null;

// Initialize tables on startup
if (supabaseAdmin) {
  initializeBlockedUsersTable(supabaseAdmin);
}

/**
 * Delete a user from Supabase Auth
 * This permanently removes the user's authentication record
 * @param userId - The user's UUID from Supabase Auth
 * @returns Success status and any error message
 */
export async function deleteSupabaseAuthUser(userId: string): Promise<{ success: boolean; error?: string }> {
  if (!supabaseAdmin) {
    return { 
      success: false, 
      error: 'Supabase admin client not configured. SUPABASE_SERVICE_ROLE_KEY may be missing.' 
    };
  }

  try {
    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (error) {
      console.error('Failed to delete Supabase Auth user:', error);
      return { success: false, error: error.message };
    }
    
    console.log(`Successfully deleted Supabase Auth user: ${userId}`);
    return { success: true };
  } catch (err) {
    console.error('Error deleting Supabase Auth user:', err);
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
}
