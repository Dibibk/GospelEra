import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('CRITICAL: Missing Supabase environment variables');
}

// Create server-side Supabase client
const supabase = supabaseUrl && supabaseAnonKey 
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// Extend Express Request type to include user info
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    role?: string;
  };
}

/**
 * Authentication middleware - verifies Supabase JWT token
 * Attaches user info to request object if valid
 */
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Check if Supabase is configured
    if (!supabase) {
      return res.status(500).json({ 
        error: 'Authentication service not configured' 
      });
    }

    // Extract token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Missing or invalid authorization header' 
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ 
        error: 'Invalid or expired token' 
      });
    }

    // Fetch user profile to get role
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    // Attach user info to request
    req.user = {
      id: user.id,
      email: user.email,
      role: profile?.role || 'user'
    };

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      error: 'Authentication failed' 
    });
  }
}

/**
 * Optional authentication middleware - doesn't block if no token
 * Useful for endpoints that work differently for authenticated users
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    if (!supabase) {
      return next();
    }

    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next();
    }

    const token = authHeader.substring(7);
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (!error && user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

      req.user = {
        id: user.id,
        email: user.email,
        role: profile?.role || 'user'
      };
    }

    next();
  } catch (error) {
    // Don't block on errors for optional auth
    next();
  }
}

/**
 * Admin-only middleware - requires user to have admin role
 */
export function requireAdmin(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({ 
      error: 'Admin access required' 
    });
  }

  next();
}

/**
 * Check if user is banned
 */
export function checkNotBanned(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  if (req.user.role === 'banned') {
    return res.status(403).json({ 
      error: 'Account is restricted. You can read content but cannot post or comment.' 
    });
  }

  next();
}

export { supabase as serverSupabase };
