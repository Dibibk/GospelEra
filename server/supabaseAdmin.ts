import { createClient } from '@supabase/supabase-js';

// Server-side Supabase admin client with service role key
// This client has admin privileges and should NEVER be exposed to the frontend
// Used for operations like deleting users from Supabase Auth

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
