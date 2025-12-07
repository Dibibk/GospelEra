import { supabase } from './supabaseClient'
import { Capacitor } from '@capacitor/core'
import type { InsertMediaRequest, MediaRequest } from '@shared/schema'

// Get API base URL - use full URL for native apps, relative for web
function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    return import.meta.env.VITE_API_URL || 'https://gospel-era.replit.app';
  }
  return '';
}

export interface MediaRequestWithUser extends MediaRequest {
  user?: {
    id: string
    display_name: string | null
    email: string | null
  }
  admin?: {
    id: string
    display_name: string | null
    email: string | null
  }
}

/**
 * Request media upload access for the current user
 */
export async function requestMediaAccess(reason: string) {
  try {
    // Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: { message: 'You must be logged in to request media access' } }
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/media-requests`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      },
      body: JSON.stringify({ reason })
    })

    if (!response.ok) {
      const error = await response.json()
      return { data: null, error }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Get the current user's media requests
 */
export async function listMyRequests() {
  try {
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: { message: 'You must be logged in to view requests' } }
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/media-requests/my`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return { data: null, error }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Get all media requests (admin only)
 */
export async function listAllRequests(): Promise<{ data: MediaRequestWithUser[] | null, error: any }> {
  try {
    // Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: { message: 'Authentication required' } }
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/admin/media-requests`, {
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      }
    })
    
    if (!response.ok) {
      return { data: null, error: { message: 'Failed to fetch requests' } }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Approve a media request (admin only)
 */
export async function approveMediaRequest(requestId: number) {
  try {
    // Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: { message: 'Admin authentication required' } }
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/admin/media-requests/${requestId}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return { data: null, error }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Deny a media request (admin only)
 */
export async function denyMediaRequest(requestId: number) {
  try {
    // Get current user for authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return { data: null, error: { message: 'Admin authentication required' } }
    }

    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/admin/media-requests/${requestId}/deny`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-user-id': user.id,
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return { data: null, error }
    }

    const data = await response.json()
    return { data, error: null }
  } catch (error) {
    return { data: null, error }
  }
}

/**
 * Check if user has media upload permission (with timeout protection)
 */
export async function checkMediaPermission(userId?: string) {
  try {
    // Get current user for authentication if userId not provided
    if (!userId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser()
      
      if (authError || !user) {
        return { hasPermission: false, error: 'Authentication required' }
      }
      
      userId = user.id
    }
    
    const baseUrl = getApiBaseUrl();
    const url = `${baseUrl}/api/media-permission/${userId}`
    
    // Add client-side timeout for faster user experience
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout
    
    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 
        'Content-Type': 'application/json',
        'x-user-id': userId
      }
    })
    
    clearTimeout(timeoutId)

    if (!response.ok) {
      return { hasPermission: false, error: 'Failed to check permission' }
    }

    const data = await response.json()
    return { hasPermission: data.hasPermission, error: null }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.error('Media permission check timeout - database connection issue')
    } else {
      console.error('Error checking media permission:', error)
    }
    return { hasPermission: false, error: 'Connection timeout - check database' }
  }
}

/**
 * Get user's current media request status
 */
export async function getCurrentRequestStatus() {
  try {
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/media-requests/my`)

    if (!response.ok) {
      return { status: null, error: 'Failed to fetch request status' }
    }

    const data = await response.json()
    
    // Return the status of the most recent request
    if (data && data.length > 0) {
      return { status: data[0].status, error: null }
    }

    return { status: null, error: null }
  } catch (error) {
    return { status: null, error: 'Failed to fetch request status' }
  }
}