import { supabase } from './supabaseClient'
import { getApiBaseUrl } from './posts'

/**
 * Comprehensive Prayer Request API Library
 * All functions return { data, error } format and handle RLS errors gracefully
 */

/**
 * Helper to create a notification via the backend API
 */
async function createNotification(params: {
  recipientId: string;
  eventType: string;
  prayerRequestId?: number;
  commitmentId?: number;
  message?: string;
}): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) return;
    
    const baseUrl = getApiBaseUrl();
    await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(params)
    });
  } catch (error) {
    console.error('Failed to create notification:', error);
  }
}

export interface PrayerRequestCreateParams {
  title: string
  details: string
  tags?: string[]
  is_anonymous?: boolean
}

export interface PrayerRequestListParams {
  status?: string
  q?: string
  tags?: string[]
  limit?: number
  cursor?: number
}

export interface PrayerCommitmentParams {
  status?: string
  limit?: number
  cursor?: number
}

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

/**
 * Create a new prayer request
 */
export async function createPrayerRequest({ title, details, tags = [], is_anonymous = false }: PrayerRequestCreateParams): Promise<ApiResponse<any>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    const { data, error } = await supabase
      .from('prayer_requests')
      .insert({
        requester: user.user.id,
        title: title.trim(),
        details: details.trim(),
        tags: Array.isArray(tags) ? tags : [],
        is_anonymous: Boolean(is_anonymous),
        status: 'open'
      })
      .select(`
        *,
        profiles!prayer_requests_requester_fkey (
          display_name,
          avatar_url
        )
      `)
      .single()

    if (error) {
      console.error('Failed to create prayer request:', error)
      return { data: null, error: 'Failed to create prayer request' }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Create prayer request error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * List prayer requests with filtering and pagination
 */
export async function listPrayerRequests({ 
  status = 'open', 
  q = '', 
  tags = [], 
  limit = 20, 
  cursor = null as number | null
}: PrayerRequestListParams): Promise<ApiResponse<any[]>> {
  try {
    console.log('🙏 [listPrayerRequests] Starting prayer requests fetch...', { status, limit });
    let query = supabase
      .from('prayer_requests')
      .select(`
        *,
        profiles!prayer_requests_requester_fkey (
          display_name,
          avatar_url
        ),
        prayer_commitments (
          status,
          prayed_at,
          warrior
        )
      `)

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Text search in title and details
    if (q && q.trim()) {
      query = query.or(`title.ilike.%${q.trim()}%,details.ilike.%${q.trim()}%`)
    }

    // Filter by tags
    if (tags && tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    // Pagination cursor
    if (cursor) {
      query = query.lt('id', cursor)
    }

    // Order and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50)) // Cap at 50 for performance

    const { data, error } = await query

    console.log('🙏 [listPrayerRequests] Query result:', { dataCount: data?.length, error: error?.message });

    if (error) {
      console.error('Failed to list prayer requests:', error)
      return { data: null, error: 'Failed to load prayer requests' }
    }

    // Calculate prayer statistics for each request
    const enhancedData = data.map((request: any) => ({
      ...request,
      prayer_stats: {
        committed_count: request.prayer_commitments?.filter((c: any) => c.status === 'committed').length || 0,
        prayed_count: request.prayer_commitments?.filter((c: any) => c.status === 'prayed').length || 0,
        total_warriors: request.prayer_commitments?.length || 0
      }
    }))

    return { data: enhancedData, error: null }
  } catch (err) {
    console.error('List prayer requests error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Get a single prayer request with full details
 */
export async function getPrayerRequest(id: number): Promise<ApiResponse<any>> {
  try {
    const { data, error } = await supabase
      .from('prayer_requests')
      .select(`
        *,
        profiles!prayer_requests_requester_fkey (
          display_name,
          avatar_url,
          role
        ),
        prayer_commitments (
          status,
          prayed_at,
          committed_at,
          note,
          warrior,
          profiles!prayer_commitments_warrior_fkey (
            display_name,
            avatar_url
          )
        ),
        prayer_activity (
          kind,
          message,
          created_at,
          actor,
          profiles!prayer_activity_actor_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) {
      console.error('Failed to get prayer request:', error)
      return { data: null, error: 'Prayer request not found' }
    }

    // Compute comprehensive statistics
    const commitments = data.prayer_commitments || []
    const stats = {
      committed_count: commitments.filter(c => c.status === 'committed').length,
      prayed_count: commitments.filter(c => c.status === 'prayed').length,
      total_warriors: commitments.length,
      recent_activity: (data.prayer_activity || [])
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .slice(0, 10)
    }

    return { 
      data: { 
        ...data, 
        prayer_stats: stats 
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Get prayer request error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Commit to pray for a request (with spam detection)
 */
export async function commitToPray(requestId: number): Promise<ApiResponse<any>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    // Check for spam before allowing commitment
    const { checkPrayerCommitmentSpam } = await import('./prayerSpamDetection')
    const spamCheck = await checkPrayerCommitmentSpam(user.user.id)
    
    if (!spamCheck.allowed) {
      return { data: null, error: spamCheck.reason || 'Unable to commit at this time' }
    }

    const { data, error } = await supabase
      .from('prayer_commitments')
      .upsert({
        request_id: requestId,
        warrior: user.user.id,
        status: 'committed'
      }, {
        onConflict: 'request_id,warrior'
      })
      .select()
      .single()

    if (error) {
      console.error('Failed to commit to pray:', error)
      return { data: null, error: 'Failed to commit to prayer' }
    }

    // Log activity
    await supabase
      .from('prayer_activity')
      .insert({
        request_id: requestId,
        actor: user.user.id,
        kind: 'commitment',
        message: 'committed to pray'
      })

    // Notify prayer request owner (if not self)
    const { data: prayerRequest } = await supabase
      .from('prayer_requests')
      .select('requester')
      .eq('id', requestId)
      .single();
    
    if (prayerRequest?.requester && prayerRequest.requester !== user.user.id) {
      createNotification({
        recipientId: prayerRequest.requester,
        eventType: 'prayer_commitment',
        prayerRequestId: requestId,
        commitmentId: data.id,
        message: 'committed to pray for your prayer request'
      });
    }

    // Return data with spam warning if applicable
    return { 
      data: {
        ...data,
        spamWarning: spamCheck.warningLevel !== 'none' ? spamCheck.reason : null
      }, 
      error: null 
    }
  } catch (err) {
    console.error('Commit to pray error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Remove prayer commitment
 */
export async function uncommitToPray(requestId: number): Promise<ApiResponse<any>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    const { data, error } = await supabase
      .from('prayer_commitments')
      .delete()
      .eq('request_id', requestId)
      .eq('warrior', user.user.id)
      .select()

    if (error) {
      console.error('Failed to uncommit from prayer:', error)
      return { data: null, error: 'Failed to remove prayer commitment' }
    }

    // Log activity
    await supabase
      .from('prayer_activity')
      .insert({
        request_id: requestId,
        actor: user.user.id,
        kind: 'uncommitment',
        message: 'removed prayer commitment'
      })

    return { data, error: null }
  } catch (err) {
    console.error('Uncommit from pray error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Confirm that you have prayed for a request
 */
export async function confirmPrayed(requestId: number, { note = null }: { note?: string | null } = {}): Promise<ApiResponse<any>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    const { data, error } = await supabase
      .from('prayer_commitments')
      .update({
        status: 'prayed',
        prayed_at: new Date().toISOString(),
        note: note?.trim() || null
      })
      .eq('request_id', requestId)
      .eq('warrior', user.user.id)
      .select()
      .single()

    if (error) {
      console.error('Failed to confirm prayed:', error)
      return { data: null, error: 'Failed to confirm prayer' }
    }

    // Log activity
    await supabase
      .from('prayer_activity')
      .insert({
        request_id: requestId,
        actor: user.user.id,
        kind: 'prayer_completed',
        message: note ? `prayed with note: ${note}` : 'completed prayer'
      })

    // Notify prayer request owner (if not self)
    const { data: prayerRequest } = await supabase
      .from('prayer_requests')
      .select('requester')
      .eq('id', requestId)
      .single();
    
    if (prayerRequest?.requester && prayerRequest.requester !== user.user.id) {
      createNotification({
        recipientId: prayerRequest.requester,
        eventType: 'prayer_completed',
        prayerRequestId: requestId,
        commitmentId: data.id,
        message: 'prayed for your prayer request'
      });
    }

    return { data, error: null }
  } catch (err) {
    console.error('Confirm prayed error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Get current user's prayer commitments
 */
export async function getMyCommitments({ status = null, limit = 20, cursor = null }: PrayerCommitmentParams = {}): Promise<ApiResponse<any[]>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    let query = supabase
      .from('prayer_commitments')
      .select(`
        *,
        prayer_requests!inner (
          id,
          title,
          details,
          status,
          created_at,
          is_anonymous,
          profiles!prayer_requests_requester_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('warrior', user.user.id)

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    if (cursor) {
      query = query.lt('committed_at', cursor)
    }

    // Order and limit
    query = query
      .order('committed_at', { ascending: false })
      .limit(Math.min(limit, 50))

    const { data, error } = await query

    if (error) {
      console.error('Failed to get my commitments:', error)
      return { data: null, error: 'Failed to load your commitments' }
    }

    return { data, error: null }
  } catch (err) {
    console.error('Get my commitments error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Get current user's prayer requests
 */
export async function getMyRequests({ status = null, limit = 20, cursor = null }: PrayerCommitmentParams = {}): Promise<ApiResponse<any[]>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    let query = supabase
      .from('prayer_requests')
      .select(`
        *,
        profiles!prayer_requests_requester_fkey (
          display_name,
          avatar_url
        ),
        prayer_commitments (
          status,
          prayed_at,
          warrior,
          profiles!prayer_commitments_warrior_fkey (
            display_name,
            avatar_url
          )
        )
      `)
      .eq('requester', user.user.id)

    // Filter by status
    if (status) {
      query = query.eq('status', status)
    }

    // Pagination
    if (cursor) {
      query = query.lt('created_at', cursor)
    }

    // Order and limit
    query = query
      .order('created_at', { ascending: false })
      .limit(Math.min(limit, 50))

    const { data, error } = await query

    if (error) {
      console.error('Failed to get my requests:', error)
      return { data: null, error: 'Failed to load your requests' }
    }

    // Enhance with statistics
    const enhancedData = data.map(request => ({
      ...request,
      prayer_stats: {
        committed_count: request.prayer_commitments?.filter(c => c.status === 'committed').length || 0,
        prayed_count: request.prayer_commitments?.filter(c => c.status === 'prayed').length || 0,
        total_warriors: request.prayer_commitments?.length || 0
      }
    }))

    return { data: enhancedData, error: null }
  } catch (err) {
    console.error('Get my requests error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Helper function to handle common RLS and authentication errors
 * @param {Object} error - Supabase error object
 * @returns {string} User-friendly error message
 */
function handleSupabaseError(error) {
  if (!error) return null
  
  if (error.code === 'PGRST116' || error.message?.includes('RLS')) {
    return 'Permission denied. Please check your authentication.'
  }
  
  if (error.code === 'PGRST204') {
    return 'Resource not found.'
  }
  
  if (error.message?.includes('duplicate key')) {
    return 'This action has already been performed.'
  }
  
  return 'An unexpected error occurred. Please try again.'
}