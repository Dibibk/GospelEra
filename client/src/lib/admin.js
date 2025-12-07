import { supabase } from './supabaseClient'

/**
 * Admin utilities for Gospel Era Web platform
 * All functions require admin role and will throw if user is not admin
 */

/**
 * Check if current user is admin, throw error if not
 * @throws {Error} If user is not authenticated or not admin
 */
async function requireAdmin() {
  const { data: { user }, error: userError } = await supabase.auth.getUser()
  
  if (userError) {
    throw new Error(`Authentication error: ${userError.message}`)
  }
  
  if (!user) {
    throw new Error('User must be authenticated to perform admin actions')
  }

  // Check if user has admin role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError) {
    throw new Error(`Failed to check user role: ${profileError.message}`)
  }

  if (profile?.role !== 'admin') {
    throw new Error('Admin privileges required for this action')
  }
}

/**
 * List reports with optional filtering and pagination
 * @param {Object} options - Query options
 * @param {string} options.status - Filter by status: 'open', 'resolved', 'dismissed' (default: 'open')
 * @param {number} options.limit - Maximum number of reports to return (default: 50)
 * @param {string} options.cursor - Pagination cursor for next page
 * @returns {Promise<{items: Array, nextCursor: string|null}>}
 */
export async function listReports({ status = 'open', limit = 50, cursor } = {}) {
  await requireAdmin()

  try {
    // First, get the reports without joins
    let query = supabase
      .from('reports')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply cursor-based pagination if provided
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    const { data: reports, error } = await query

    if (error) {
      throw new Error(`Failed to fetch reports: ${error.message}`)
    }

    // Determine next cursor (created_at of last item)
    const nextCursor = reports.length === limit ? reports[reports.length - 1].created_at : null

    // Get unique reporter IDs to fetch profiles
    const reporterIds = [...new Set(reports.map(r => r.reporter).filter(Boolean))]
    
    // Fetch reporter profiles
    const { data: reporterProfiles } = await supabase
      .from('profiles')
      .select('id, display_name, email')
      .in('id', reporterIds)

    const reporterProfileMap = new Map()
    if (reporterProfiles) {
      reporterProfiles.forEach(profile => {
        reporterProfileMap.set(profile.id, profile)
      })
    }

    // Get unique target IDs by type
    const postIds = reports.filter(r => r.target_type === 'post').map(r => r.target_id)
    const commentIds = reports.filter(r => r.target_type === 'comment').map(r => r.target_id)

    // Fetch posts and comments separately
    const postsPromise = postIds.length > 0 
      ? supabase.from('posts').select('id, content, author, created_at').in('id', postIds)
      : Promise.resolve({ data: [] })
      
    const commentsPromise = commentIds.length > 0
      ? supabase.from('comments').select('id, content, author, created_at').in('id', commentIds)
      : Promise.resolve({ data: [] })

    const [postsResult, commentsResult] = await Promise.all([postsPromise, commentsPromise])

    // Create maps for quick lookup
    const postsMap = new Map()
    const commentsMap = new Map()
    
    if (postsResult.data) {
      postsResult.data.forEach(post => postsMap.set(post.id, post))
    }
    
    if (commentsResult.data) {
      commentsResult.data.forEach(comment => commentsMap.set(comment.id, comment))
    }

    // Get author IDs from posts and comments to fetch author profiles
    const authorIds = [
      ...new Set([
        ...(postsResult.data || []).map(p => p.author),
        ...(commentsResult.data || []).map(c => c.author)
      ].filter(Boolean))
    ]

    // Fetch author profiles
    const { data: authorProfiles } = await supabase
      .from('profiles')
      .select('id, display_name')
      .in('id', authorIds)

    const authorProfileMap = new Map()
    if (authorProfiles) {
      authorProfiles.forEach(profile => {
        authorProfileMap.set(profile.id, profile)
      })
    }

    // Process reports to include target information
    const items = reports.map(report => {
      const baseReport = {
        id: report.id,
        status: report.status,
        reason: report.reason,
        target_type: report.target_type,
        target_id: report.target_id,
        created_at: report.created_at,
        reporter: reporterProfileMap.get(report.reporter) || {
          id: report.reporter,
          display_name: 'Unknown User',
          email: 'unknown@example.com'
        }
      }

      // Add target information based on type
      if (report.target_type === 'post') {
        const post = postsMap.get(report.target_id)
        if (post) {
          const authorProfile = authorProfileMap.get(post.author)
          baseReport.target = {
            type: 'post',
            id: post.id,
            content: post.content,
            created_at: post.created_at,
            author: {
              id: post.author,
              display_name: authorProfile?.display_name || 'Unknown User'
            }
          }
        } else {
          baseReport.target = {
            type: 'post',
            id: report.target_id,
            deleted: true
          }
        }
      } else if (report.target_type === 'comment') {
        const comment = commentsMap.get(report.target_id)
        if (comment) {
          const authorProfile = authorProfileMap.get(comment.author)
          baseReport.target = {
            type: 'comment',
            id: comment.id,
            content: comment.content,
            created_at: comment.created_at,
            author: {
              id: comment.author,
              display_name: authorProfile?.display_name || 'Unknown User'
            }
          }
        } else {
          baseReport.target = {
            type: 'comment',
            id: report.target_id,
            deleted: true
          }
        }
      } else {
        // Unknown target type
        baseReport.target = {
          type: report.target_type,
          id: report.target_id,
          deleted: true
        }
      }

      return baseReport
    })

    return { items, nextCursor }
  } catch (err) {
    throw new Error(`Admin operation failed: ${err.message}`)
  }
}

/**
 * Update report status
 * @param {string} id - Report ID
 * @param {string} status - New status: 'open', 'resolved', 'dismissed'
 * @returns {Promise<Object>} Updated report data
 */
export async function updateReportStatus(id, status) {
  await requireAdmin()

  const validStatuses = ['open', 'resolved', 'dismissed']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  try {
    const { data, error } = await supabase
      .from('reports')
      .update({ status })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update report status: ${error.message}`)
    }

    return data
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