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

export interface PaginatedApiResponse<T> {
  data: T | null
  nextCursor: number | null
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
      .select('*')
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
 * Uses backend API to avoid RLS issues on native apps
 */
export async function listPrayerRequests({ 
  status = 'open', 
  q = '', 
  tags = [], 
  limit = 20, 
  cursor = null as number | null
}: PrayerRequestListParams): Promise<PaginatedApiResponse<any[]>> {
  try {
    console.log('🙏 [listPrayerRequests] Starting prayer requests fetch via API...', { status, limit });
    
    const baseUrl = getApiBaseUrl();
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (limit) params.append('limit', String(limit));
    if (cursor) params.append('cursor', String(cursor));
    if (q) params.append('q', q);
    if (tags && tags.length > 0) params.append('tags', tags.join(','));
    
    // Add cache-busting timestamp to ensure fresh data
    params.append('_t', Date.now().toString());
    const url = `${baseUrl}/api/prayer-requests?${params.toString()}`;
    console.log('🙏 [listPrayerRequests] Fetching from:', url);
    
    // Get auth token if available
    const { data: sessionData } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (sessionData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error('Failed to fetch prayer requests:', response.status, response.statusText);
      return { data: null, nextCursor: null, error: 'Failed to load prayer requests' };
    }
    
    const result = await response.json();
    console.log('🙏 [listPrayerRequests] API result:', { 
      requestsCount: result.requests?.length,
      hasProfiles: !!result.profiles,
      hasStats: !!result.stats
    });
    
    // Transform API response to match existing format
    const enhancedData = (result.requests || []).map((request: any) => ({
      ...request,
      profiles: result.profiles?.[request.requester] || null,
      prayer_stats: result.stats?.[request.id] || {
        committed_count: 0,
        prayed_count: 0,
        total_warriors: 0
      }
    }));

    return { data: enhancedData, nextCursor: result.nextCursor ?? null, error: null };
  } catch (err) {
    console.error('List prayer requests error:', err);
    return { data: null, nextCursor: null, error: 'Unexpected error occurred' };
  }
}

/**
 * Get a single prayer request with full details
 * Uses backend API to bypass RLS and get accurate data
 */
export async function getPrayerRequest(id: number): Promise<ApiResponse<any>> {
  try {
    console.log('🙏 [getPrayerRequest] Fetching prayer request via API:', id);
    
    const baseUrl = getApiBaseUrl();
    // Add cache-busting timestamp to ensure fresh data
    const url = `${baseUrl}/api/prayer-requests/${id}?_t=${Date.now()}`;
    
    // Get auth token if available
    const { data: sessionData } = await supabase.auth.getSession();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    };
    if (sessionData?.session?.access_token) {
      headers['Authorization'] = `Bearer ${sessionData.session.access_token}`;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      console.error('Failed to fetch prayer request:', response.status, response.statusText);
      return { data: null, error: 'Prayer request not found' };
    }
    
    const data = await response.json();
    console.log('🙏 [getPrayerRequest] API result:', { 
      id: data.id,
      hasStats: !!data.prayer_stats,
      committedCount: data.prayer_stats?.committed_count
    });

    return { data, error: null };
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
    const { data: sessionData } = await supabase.auth.getSession()
    
    if (!sessionData?.session?.access_token) {
      return { data: null, error: 'Authentication required' }
    }

    // Check for spam before allowing commitment
    const { checkPrayerCommitmentSpam } = await import('./prayerSpamDetection')
    const spamCheck = await checkPrayerCommitmentSpam(sessionData.session.user.id)
    
    if (!spamCheck.allowed) {
      return { data: null, error: spamCheck.reason || 'Unable to commit at this time' }
    }

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/prayer-requests/${requestId}/commit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to commit to pray:', errorData)
      return { data: null, error: errorData.error || 'Failed to commit to prayer' }
    }

    const data = await response.json()

    // Notify prayer request owner (if not self) - using backend API
    // The commit response includes the requester ID, use it directly
    try {
      if (data.requester && data.requester !== sessionData.session.user.id) {
        createNotification({
          recipientId: data.requester,
          eventType: 'prayer_commitment',
          prayerRequestId: requestId,
          commitmentId: data.id,
          message: 'committed to pray for your prayer request'
        });
      }
    } catch (notifyError) {
      console.warn('Failed to send notification (non-critical):', notifyError);
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
    const { data: sessionData } = await supabase.auth.getSession()
    
    if (!sessionData?.session?.access_token) {
      return { data: null, error: 'Authentication required' }
    }

    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/prayer-requests/${requestId}/confirm-prayed`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      },
      body: JSON.stringify({ note: note?.trim() || null })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error('Failed to confirm prayed:', errorData)
      return { data: null, error: errorData.error || 'Failed to confirm prayer' }
    }

    const data = await response.json()

    // Notify prayer request owner (if not self) - client-side notification
    // Wrap in try-catch so RLS errors don't break the main flow
    try {
      const { data: prayerRequest } = await supabase
        .from('prayer_requests')
        .select('requester')
        .eq('id', requestId)
        .single();
      
      if (prayerRequest?.requester && prayerRequest.requester !== sessionData.session.user.id) {
        createNotification({
          recipientId: prayerRequest.requester,
          eventType: 'prayer_completed',
          prayerRequestId: requestId,
          commitmentId: data.id,
          message: 'prayed for your prayer request'
        });
      }
    } catch (notifyError) {
      console.warn('Failed to send notification (non-critical):', notifyError);
    }

    return { data, error: null }
  } catch (err) {
    console.error('Confirm prayed error:', err)
    return { data: null, error: 'Unexpected error occurred' }
  }
}

/**
 * Get current user's prayer commitments
 * Uses backend API to bypass RLS issues
 */
export async function getMyCommitments({ status, limit = 20 }: PrayerCommitmentParams = {}): Promise<ApiResponse<any[]>> {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    
    if (!sessionData?.session?.access_token) {
      return { data: [], error: null }
    }

    const baseUrl = getApiBaseUrl()
    const params = new URLSearchParams()
    if (status) params.append('status', status)
    if (limit) params.append('limit', String(limit))
    
    const url = `${baseUrl}/api/my-commitments?${params.toString()}`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${sessionData.session.access_token}`
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch commitments:', response.status)
      return { data: [], error: null }
    }

    const result = await response.json()
    return { data: result.commitments || [], error: null }
  } catch (err) {
    console.error('Get my commitments error:', err)
    return { data: [], error: null }
  }
}

/**
 * Get current user's prayer requests
 */
export async function getMyRequests({ status, limit = 20, cursor }: PrayerCommitmentParams = {}): Promise<ApiResponse<any[]>> {
  try {
    const { data: user } = await supabase.auth.getUser()
    
    if (!user?.user?.id) {
      return { data: null, error: 'Authentication required' }
    }

    let query = supabase
      .from('prayer_requests')
      .select(`
        *,
        prayer_commitments (
          status,
          prayed_at,
          warrior
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
      // Handle missing Supabase tables gracefully
      if (error.code === 'PGRST200' || error.code === '42P01' || error.message?.includes('does not exist')) {
        return { data: [], error: null }
      }
      return { data: null, error: 'Failed to load your requests' }
    }

    if (!data) {
      return { data: [], error: null }
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