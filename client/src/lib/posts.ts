import { supabase } from './supabaseClient'
import { validateContentWithAI } from './moderation'

export interface CreatePostData {
  title: string
  content: string
  tags?: string[]
  media_urls?: string[]
  embed_url?: string
}

interface ListPostsOptions {
  limit?: number
  fromId?: number
  authorId?: string
}

interface SearchPostsOptions {
  q?: string
  tags?: string[]
  limit?: number
  cursor?: { created_at: string; id: number }
}

interface TopTagsOptions {
  limit?: number
}

/**
 * Creates a new post with the current user as author
 * @param {Object} postData - The post data
 * @param {string} postData.title - Post title
 * @param {string} postData.content - Post content
 * @param {string[]} postData.tags - Array of tags (optional, defaults to empty array)
 * @param {string[]} postData.media_urls - Array of media URLs (optional, defaults to empty array)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createPost({ title, content, tags = [], media_urls = [], embed_url }: CreatePostData) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to create posts')
    }

    // Validate title and content with AI (more intelligent and flexible)
    const combinedText = `${title.trim()}\n\n${content.trim()}`
    const validation = await validateContentWithAI(combinedText)
    
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Please keep your content Christ-centered and appropriate for our faith community.')
    }

    // Insert the post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        tags,
        media_urls,
        embed_url,
        author_id: user.id
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`)
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Lists recent posts with pagination support
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of posts to return (default: 20)
 * @param {number} options.fromId - ID to start pagination from (optional)
 * @param {string} options.authorId - Filter posts by specific author ID (optional)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function listPosts({ limit = 20, fromId, authorId }: ListPostsOptions = {}) {
  try {
    // Build query parameters
    const params = new URLSearchParams()
    params.append('limit', limit.toString())
    
    if (fromId) {
      params.append('fromId', fromId.toString())
    }
    
    if (authorId) {
      params.append('authorId', authorId)
    }

    // Make request to backend API (which properly filters out hidden posts)
    const response = await fetch(`/api/posts?${params.toString()}`)
    
    if (!response.ok) {
      throw new Error(`Failed to fetch posts: ${response.statusText}`)
    }
    
    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Soft deletes a post by setting is_deleted=true
 * Only the author can delete their own posts
 * @param {number} id - Post ID to delete
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function softDeletePost(id: number) {
  try {
    // Get Supabase session for JWT authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`)
    }
    
    if (!session?.access_token) {
      throw new Error('User must be authenticated to delete posts')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };

    // Make DELETE request to server API
    const response = await fetch(`/api/posts/${id}`, {
      method: 'DELETE',
      headers
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Updates an existing post
 * Only the author can update their own posts
 * @param {number} id - Post ID to update
 * @param {CreatePostData} postData - Updated post data
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function updatePost(id: number, postData: CreatePostData) {
  try {
    // Get Supabase session for JWT authentication
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`)
    }
    
    if (!session?.access_token) {
      throw new Error('User must be authenticated to update posts')
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    };

    // Make PUT request to server API
    const response = await fetch(`/api/posts/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(postData)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `Server error: ${response.status}`);
    }

    const data = await response.json();
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}



/**
 * Search posts with text query and/or tags filter, with keyset pagination
 * @param {Object} options - Search options
 * @param {string} options.q - Text query to search in title and content (optional)
 * @param {string[]} options.tags - Array of tags to filter by (optional)
 * @param {number} options.limit - Number of posts to return (default: 20)
 * @param {Object} options.cursor - Pagination cursor with created_at and id (optional)
 * @returns {Promise<{data: {items: Array, nextCursor: Object|null}|null, error: Error|null}>}
 */
export async function searchPosts({ q = '', tags = [], limit = 20, cursor }: SearchPostsOptions = {}) {
  try {
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        tags,
        created_at,
        updated_at,
        author_id,
        media_urls,
        embed_url
      `)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit + 1) // Get one extra to determine if there's a next page

    // Add text search if query is provided
    if (q.trim()) {
      const searchQuery = `%${q.toLowerCase()}%`
      query = query.or(`title.ilike.${searchQuery},content.ilike.${searchQuery}`)
    }

    // Add tags filter if tags are provided
    if (tags.length > 0) {
      query = query.overlaps('tags', tags)
    }

    // Add keyset pagination if cursor is provided
    if (cursor) {
      query = query.or(`created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},id.lt.${cursor.id})`)
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to search posts: ${error.message}`)
    }

    // Separate items from potential next cursor
    const items = data?.slice(0, limit) || []
    const hasNext = data && data.length > limit
    const nextCursor = hasNext ? {
      created_at: items[items.length - 1]?.created_at,
      id: items[items.length - 1]?.id
    } : null

    return { data: { items, nextCursor }, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Get the most frequently used tags across all posts
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of top tags to return (default: 12)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function getTopTags({ limit = 12 }: TopTagsOptions = {}) {
  try {
    // Use Supabase RPC function to aggregate tags
    const { data, error } = await supabase
      .rpc('get_top_tags', { tag_limit: limit })

    if (error) {
      throw new Error(`Failed to get top tags: ${error.message}`)
    }

    return { data: data || [], error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}