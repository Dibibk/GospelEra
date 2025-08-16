import { supabase } from './supabaseClient'

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
 * @param {Object} commentData - The comment data
 * @param {number} commentData.postId - ID of the post to comment on
 * @param {string} commentData.content - Comment content
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function createComment({ postId, content }: CreateCommentData) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to create comments')
    }

    // Insert the comment
    const { data, error } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        content,
        author: user.id
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create comment: ${error.message}`)
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Lists comments for a post with pagination support (newest first)
 * @param {Object} options - Query options
 * @param {number} options.postId - Post ID to get comments for
 * @param {number} options.limit - Number of comments to return (default: 20)
 * @param {number} options.fromId - ID to start pagination from (optional)
 * @returns {Promise<{data: Array|null, error: Error|null}>}
 */
export async function listComments({ postId, limit = 20, fromId }: ListCommentsOptions) {
  try {
    let query = supabase
      .from('comments')
      .select(`
        id,
        post_id,
        content,
        created_at,
        author,
        profiles:profiles!author (
          display_name
        )
      `)
      .eq('post_id', postId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Add keyset pagination if fromId is provided
    if (fromId) {
      // Get the created_at timestamp of the fromId comment for keyset pagination
      const { data: fromComment, error: fromError } = await supabase
        .from('comments')
        .select('created_at')
        .eq('id', fromId)
        .single()

      if (fromError) {
        throw new Error(`Failed to get pagination reference: ${fromError.message}`)
      }

      if (fromComment) {
        query = query.lt('created_at', fromComment.created_at)
      }
    }

    const { data, error } = await query

    if (error) {
      throw new Error(`Failed to fetch comments: ${error.message}`)
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Soft deletes a comment by setting is_deleted=true
 * Only the author can delete their own comments
 * @param {number} id - Comment ID to delete
 * @returns {Promise<{data: Object|null, error: Error|null}>}
 */
export async function softDeleteComment(id: number) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to delete comments')
    }

    // Debug: log the deletion attempt
    console.log('Deleting comment - User ID:', user.id, 'Comment ID:', id)
    
    // First check what comment we're trying to delete
    const { data: commentCheck, error: checkError } = await supabase
      .from('comments')
      .select('id, author, is_deleted')
      .eq('id', id)
      .single()
    
    console.log('Comment check result:', commentCheck, 'Error:', checkError)
    
    if (commentCheck) {
      console.log('Comment author:', commentCheck.author, 'Current user:', user.id, 'Match:', commentCheck.author === user.id)
    }

    // Use a simpler approach that works better with current RLS setup
    const { data, error } = await supabase
      .from('comments')
      .update({ is_deleted: true })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      // If it's an RLS error, provide a more user-friendly message
      if (error.message.includes('row-level security') || error.message.includes('new row violates')) {
        throw new Error('You can only delete your own comments')
      }
      throw new Error(`Failed to delete comment: ${error.message}`)
    }

    if (!data) {
      throw new Error('Comment not found, already deleted, or you do not have permission to delete it')
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}