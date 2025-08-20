import { supabase } from './supabaseClient'

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
  const { error } = await supabase
    .from('reports')
    .update({ status })
    .eq('id', reportId)

  if (error) throw error
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