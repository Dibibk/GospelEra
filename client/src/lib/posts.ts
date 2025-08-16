import { supabase } from './supabaseClient'

interface CreatePostData {
  title: string
  content: string
  tags?: string[]
}

interface ListPostsOptions {
  limit?: number
  fromId?: number
}

/**
 * Creates a new post with the current user as author
 * @param {Object} postData - The post data
 * @param {string} postData.title - Post title
 * @param {string} postData.content - Post content
 * @param {string[]} postData.tags - Array of tags (optional, defaults to empty array)
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createPost({ title, content, tags = [] }: CreatePostData) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to create posts')
    }

    // Insert the post
    const { data, error } = await supabase
      .from('posts')
      .insert({
        title,
        content,
        tags,
        author: user.id
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
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function listPosts({ limit = 20, fromId }: ListPostsOptions = {}) {
  try {
    let query = supabase
      .from('posts')
      .select(`
        id,
        title,
        content,
        tags,
        created_at,
        author,
        profiles:profiles!author (
          display_name
        )
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Add keyset pagination if fromId is provided
    if (fromId) {
      // Get the created_at timestamp of the fromId post for keyset pagination
      const { data: fromPost, error: fromError } = await supabase
        .from('posts')
        .select('created_at')
        .eq('id', fromId)
        .single()

      if (fromError) {
        throw new Error(`Failed to get pagination reference: ${fromError.message}`)
      }

      if (fromPost) {
        query = query.lt('created_at', fromPost.created_at)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`)
    }

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
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to delete posts')
    }

    // Use secure RPC function that only allows deleting your own posts
    const { data, error } = await supabase
      .rpc('soft_delete_post', { post_id: id })

    if (error) {
      // If it's an RLS error, provide a more user-friendly message
      if (error.message.includes('row-level security') || error.message.includes('new row violates')) {
        throw new Error('You can only delete your own posts')
      }
      throw new Error(`Failed to delete post: ${error.message}`)
    }

    if (!data) {
      throw new Error('Post not found, already deleted, or you do not have permission to delete it')
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}