import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Server-side Supabase client factory
// Creates authenticated clients using user's JWT token

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Supabase URL or ANON KEY not set - Supabase queries will not work');
}

/**
 * Create a Supabase client for a specific user's request
 * Uses the user's JWT token if available for RLS-aware queries
 */
export function createServerSupabase(token?: string | null): SupabaseClient {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Supabase not configured');
  }
  
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: token ? { Authorization: `Bearer ${token}` } : {}
    },
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Create a Supabase admin client with service role key
 * Bypasses RLS - use with caution!
 */
export function createServerSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.warn('Supabase admin client not available - service role key missing');
    return null;
  }
  
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}

/**
 * Extract JWT token from Authorization header
 */
export function extractToken(authHeader?: string): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  return authHeader.substring(7);
}

// Singleton admin client
export const supabaseAdmin = createServerSupabaseAdmin();
