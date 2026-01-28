import { supabase } from './supabaseClient'
import { getApiBaseUrl } from './posts'

export async function getUserProfile(userId: string) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) throw error
  return data
}

export async function listReports({ status = 'open', limit = 100 } = {}) {
  const query = supabase
    .from('reports')
    .select(`
      *,
      reporter:profiles!reports_reporter_id_fkey(id, display_name, email),
      post:posts!reports_post_id_fkey(id, title, content),
      comment:comments!reports_comment_id_fkey(id, content)
    `)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (status !== 'all') {
    query.eq('status', status)
  }

  const { data, error } = await query

  if (error) throw error
  return { items: data || [] }
}

export async function updateReportStatus(reportId: string, status: string) {
  const validStatuses = ['open', 'resolved', 'dismissed']
  if (!validStatuses.includes(status)) {
    throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`)
  }

  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token
  if (!token) {
    throw new Error('Not authenticated')
  }

  const baseUrl = getApiBaseUrl()
  const response = await fetch(`${baseUrl}/api/admin/reports/${reportId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ status })
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.error || 'Failed to update report status')
  }

  return { success: true }
}

export async function banUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: 'banned' })
    .eq('id', userId)

  if (error) throw error
  return { success: true }
}

export async function unbanUser(userId: string) {
  const { error } = await supabase
    .from('profiles')
    .update({ role: null })
    .eq('id', userId)

  if (error) throw error
  return { success: true }
}

export async function getBannedUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'banned')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data || []
}