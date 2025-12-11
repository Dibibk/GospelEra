import { supabase } from './supabaseClient'
import { Capacitor } from '@capacitor/core'

// Get API base URL - use full URL for native apps, relative for web
function getApiBaseUrl(): string {
  if (Capacitor.isNativePlatform()) {
    const apiUrl = import.meta.env.VITE_API_URL || 'https://gospel-era.replit.app';
    return apiUrl;
  }
  return '';
}

interface CreateCommentData {
  postId: number
  content: string
}

interface ListCommentsOptions {
  postId: number
  limit?: number
  fromId?: number
}

/**
 * Creates a new comment on a post with the current user as author
 * Uses server-side API endpoint with content moderation validation
 * @param {Object} commentData - The comment data
 * @param {number} commentData.postId - ID of the post to comment on
 * @param {string} commentData.content - Comment content
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createComment({ postId, content }: CreateCommentData) {
  try {
    // Get auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      throw new Error('Authentication required to create comments')
    }

    // Call server-side API endpoint (enforces moderation)
    const apiUrl = `${getApiBaseUrl()}/api/comments`;
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        post_id: postId,
        content
      })
    })

    const result = await response.json()

    if (!response.ok) {
      throw new Error(result.error || result.reason || 'Failed to create comment')
    }

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Lists comments for a post with pagination support (newest first)
 * Uses API endpoint to query Neon database via Drizzle (fixes dual-database issue)
 * @param {Object} options - Query options
 * @param {number} options.postId - Post ID to get comments for
 * @param {number} options.limit - Number of comments to return (default: 20)
 * @param {number} options.fromId - ID to start pagination from (optional)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function listComments({ postId, limit = 20, fromId }: ListCommentsOptions) {
  try {
    const baseUrl = getApiBaseUrl();
    
    // Build query params
    const params = new URLSearchParams({
      post_id: postId.toString(),
      limit: limit.toString()
    });
    
    if (fromId) {
      params.set('from_id', fromId.toString());
    }
    
    const response = await fetch(`${baseUrl}/api/comments?${params}`);
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to fetch comments');
    }
    
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}

/**
 * Soft deletes a comment by setting deleted=true
 * Uses API endpoint to delete from Neon database via Drizzle
 * Only the author can delete their own comments
 * @param {number} id - Comment ID to delete
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function softDeleteComment(id: number) {
  try {
    // Get auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      throw new Error('Authentication required to delete comments')
    }
    
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/comments/${id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${session.access_token}`
      }
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(result.error || 'Failed to delete comment');
    }
    
    return { data: result.data, error: null };
  } catch (err) {
    return { data: null, error: err };
  }
}