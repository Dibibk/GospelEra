import { supabase } from './supabaseClient'
import { getApiBaseUrl } from './posts'

/**
 * Admin utilities for Gospel Era Web platform
 * Uses backend API endpoints to bypass RLS issues
 */

/**
 * Get auth token for API requests
 * @returns {Promise<string>} Access token
 */
async function getAuthToken() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    throw new Error(`Authentication error: ${error.message}`)
  }
  
  if (!session) {
    throw new Error('User must be authenticated to perform admin actions')
  }

  return session.access_token
}

/**
 * Verify current user is an admin
 * @throws {Error} If user is not authenticated or not an admin
 */
async function requireAdmin() {
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error || !session) {
    throw new Error('User must be authenticated to perform admin actions')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single()

  if (profileError || !profile) {
    throw new Error('Could not verify admin status')
  }

  if (profile.role !== 'admin') {
    throw new Error('Admin privileges required')
  }
}

/**
 * List reports with optional filtering and pagination
 * Uses backend API to bypass RLS
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status: 'open', 'resolved', 'dismissed' (default: 'open')
 * @param {number} options.limit - Maximum number of reports to return (default: 50)
 * @param {string} options.cursor - Pagination cursor for next page
 * @returns {Promise<{items: Array, nextCursor: string|null}>}
 */
export async function listReports({ status = 'open', limit = 50, cursor } = {}) {
  try {
    const token = await getAuthToken()
    const baseUrl = getApiBaseUrl()
    
    const params = new URLSearchParams({ status, limit: String(limit) })
    if (cursor) {
      params.append('cursor', cursor)
    }

    const response = await fetch(`${baseUrl}/api/admin/reports?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to fetch reports: ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Update report status
 * Uses backend API to bypass RLS
 * @param {string} id - Report ID
 * @param {string} status - New status: 'open', 'resolved', 'dismissed'
 * @returns {Promise<Object>} Updated report data
 */
export async function updateReportStatus(id, status) {
  const validStatuses = ['open', 'resolved', 'dismissed']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  try {
    const token = await getAuthToken()
    const baseUrl = getApiBaseUrl()

    const response = await fetch(`${baseUrl}/api/admin/reports/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `Failed to update report: ${response.status}`)
    }

    return await response.json()
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Ban a user by setting their role to 'banned'
 * @param {string} userId - User ID to ban
 * @returns {Promise<Object>} Updated profile data
 */
export async function banUser(userId) {
  await requireAdmin()

  if (!userId) {
    throw new Error('User ID is required')
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: 'banned',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to ban user: ${error.message}`)
    }

    return data
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Unban a user by setting their role to 'user'
 * @param {string} userId - User ID to unban
 * @returns {Promise<Object>} Updated profile data
 */
export async function unbanUser(userId) {
  await requireAdmin()

  if (!userId) {
    throw new Error('User ID is required')
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ 
        role: 'user',
        updated_at: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to unban user: ${error.message}`)
    }

    return data
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Get user profile with role information (admin utility)
 * @param {string} userId - User ID to lookup
 * @returns {Promise<Object>} User profile data
 */
export async function getUserProfile(userId) {
  await requireAdmin()

  if (!userId) {
    throw new Error('User ID is required')
  }

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single()

    if (error) {
      throw new Error(`Failed to get user profile: ${error.message}`)
    }

    return data
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Get all banned users
 * @returns {Promise<Array>} List of banned users
 */
export async function getBannedUsers() {
  await requireAdmin()

  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'banned')
      .order('updated_at', { ascending: false })

    if (error) {
      throw new Error(`Failed to get banned users: ${error.message}`)
    }

    return data || []
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Get reports statistics (admin dashboard utility)
 * @returns {Promise<Object>} Reports statistics
 */
export async function getReportsStats() {
  await requireAdmin()

  try {
    const { data: stats, error } = await supabase
      .from('reports')
      .select('status')

    if (error) {
      throw new Error(`Failed to get reports stats: ${error.message}`)
    }

    const counts = stats.reduce((acc, report) => {
      acc[report.status] = (acc[report.status] || 0) + 1
      return acc
    }, {})

    return {
      total: stats.length,
      open: counts.open || 0,
      resolved: counts.resolved || 0,
      dismissed: counts.dismissed || 0
    }
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}