import { supabase } from './supabaseClient'

/**
 * Toggles a bookmark for a post - if bookmarked, removes it; else adds it
 * @param {number} postId - The ID of the post to toggle bookmark
 * @returns {Promise<{success: boolean, isBookmarked: boolean, error: Error|null}>}
 */
export async function toggleBookmark(postId) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to bookmark posts')
    }

    // Check if already bookmarked
    const { data: existing, error: checkError } = await supabase
      .from('bookmarks')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check bookmark status: ${checkError.message}`)
    }

    if (existing) {
      // Remove bookmark
      const { error: deleteError } = await supabase
        .from('bookmarks')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)

      if (deleteError) {
        throw new Error(`Failed to remove bookmark: ${deleteError.message}`)
      }

      return { success: true, isBookmarked: false, error: null }
    } else {
      // Add bookmark
      const { error: insertError } = await supabase
        .from('bookmarks')
        .insert({
          user_id: user.id,
          post_id: postId
        })

      if (insertError) {
        throw new Error(`Failed to add bookmark: ${insertError.message}`)
      }

      return { success: true, isBookmarked: true, error: null }
    }
  } catch (err) {
    return { success: false, isBookmarked: false, error: err }
  }
}

/**
 * Checks if a post is bookmarked by the current user
 * @param {number} postId - The ID of the post to check
 * @returns {Promise<{isBookmarked: boolean, error: Error|null}>}
 */
export async function isBookmarked(postId) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      return { isBookmarked: false, error: null }
    }

    const { data, error } = await supabase
      .from('bookmarks')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check bookmark status: ${error.message}`)
    }

    return { isBookmarked: !!data, error: null }
  } catch (err) {
    return { isBookmarked: false, error: err }
  }
}

/**
 * Lists the current user's bookmarked posts with pagination
 * @param {Object} options - Query options
 * @param {number} options.limit - Number of posts to return (default: 20)
 * @param {Object} options.cursor - Pagination cursor with created_at and post_id
 * @returns {Promise<{data: Array|null, nextCursor: Object|null, error: Error|null}>}
 */
export async function listBookmarks({ limit = 20, cursor } = {}) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to list bookmarks')
    }

    // Step 1: Fetch bookmarks (just post_ids and created_at)
    let bookmarkQuery = supabase
      .from('bookmarks')
      .select('created_at, post_id')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply cursor pagination if provided
    if (cursor?.created_at && cursor?.post_id) {
      bookmarkQuery = bookmarkQuery.or(
        `created_at.lt.${cursor.created_at},and(created_at.eq.${cursor.created_at},post_id.lt.${cursor.post_id})`
      )
    }

    const { data: bookmarks, error: bookmarkError } = await bookmarkQuery

    if (bookmarkError) {
      throw new Error(`Failed to fetch bookmarks: ${bookmarkError.message}`)
    }

    if (!bookmarks || bookmarks.length === 0) {
      return { data: [], nextCursor: null, error: null }
    }

    // Step 2: Fetch the actual posts by their IDs
    const postIds = bookmarks.map(b => b.post_id)
    const { data: postsData, error: postsError } = await supabase
      .from('posts')
      .select('id, title, content, created_at, updated_at, tags, author_id, media_urls, embed_url, hidden')
      .in('id', postIds)
      .eq('hidden', false)

    if (postsError) {
      throw new Error(`Failed to fetch posts: ${postsError.message}`)
    }

    // Step 3: Merge bookmark info with posts, preserving bookmark order
    const postsMap = new Map(postsData?.map(p => [p.id, p]) || [])
    const posts = bookmarks
      .map(bookmark => {
        const post = postsMap.get(bookmark.post_id)
        if (!post) return null
        return {
          ...post,
          bookmarked_at: bookmark.created_at
        }
      })
      .filter(Boolean)

    // Calculate next cursor
    let nextCursor = null
    if (bookmarks.length === limit && bookmarks.length > 0) {
      const lastBookmark = bookmarks[bookmarks.length - 1]
      nextCursor = {
        created_at: lastBookmark.created_at,
        post_id: lastBookmark.post_id
      }
    }

    return { data: posts, nextCursor, error: null }
  } catch (err) {
    return { data: null, nextCursor: null, error: err }
  }
}

/**
 * Toggles an "amen" reaction for a post - if already reacted, removes it; else adds it
 * @param {number} postId - The ID of the post to toggle reaction
 * @returns {Promise<{success: boolean, hasReacted: boolean, error: Error|null}>}
 */
export async function toggleAmen(postId) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to react to posts')
    }

    // Check if already reacted with "amen"
    const { data: existing, error: checkError } = await supabase
      .from('reactions')
      .select('user_id')
      .eq('user_id', user.id)
      .eq('post_id', postId)
      .eq('kind', 'amen')
      .single()

    if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
      throw new Error(`Failed to check reaction status: ${checkError.message}`)
    }

    if (existing) {
      // Remove reaction
      const { error: deleteError } = await supabase
        .from('reactions')
        .delete()
        .eq('user_id', user.id)
        .eq('post_id', postId)
        .eq('kind', 'amen')

      if (deleteError) {
        throw new Error(`Failed to remove reaction: ${deleteError.message}`)
      }

      return { success: true, hasReacted: false, error: null }
    } else {
      // Add reaction
      const { error: insertError } = await supabase
        .from('reactions')
        .insert({
          user_id: user.id,
          post_id: postId,
          kind: 'amen'
        })

      if (insertError) {
        throw new Error(`Failed to add reaction: ${insertError.message}`)
      }

      // Create notification for post author (don't await - fire and forget)
      createReactionNotification(postId, user.id).catch(err => 
        console.error('Failed to create reaction notification:', err)
      )

      return { success: true, hasReacted: true, error: null }
    }
  } catch (err) {
    return { success: false, hasReacted: false, error: err }
  }
}

/**
 * Gets "amen" reaction information for multiple posts
 * @param {number[]} postIds - Array of post IDs to get reaction info for
 * @returns {Promise<{data: Object|null, error: Error|null}>} - Map of { postId: { count, mine } }
 */
export async function getAmenInfo(postIds) {
  try {
    if (!postIds || postIds.length === 0) {
      return { data: {}, error: null }
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }

    // Get all "amen" reactions for the specified posts
    const { data: reactions, error: reactionsError } = await supabase
      .from('reactions')
      .select('post_id, user_id')
      .in('post_id', postIds)
      .eq('kind', 'amen')

    if (reactionsError) {
      throw new Error(`Failed to fetch reactions: ${reactionsError.message}`)
    }

    // Build the result map
    const result = {}
    
    // Initialize all posts with zero counts
    postIds.forEach(postId => {
      result[postId] = { count: 0, mine: false }
    })

    // Count reactions and check if current user reacted
    reactions?.forEach(reaction => {
      const postId = reaction.post_id
      if (result[postId]) {
        result[postId].count++
        if (user && reaction.user_id === user.id) {
          result[postId].mine = true
        }
      }
    })

    return { data: result, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Helper to create a notification when someone reacts to a post
 * @param {number} postId - The post that was reacted to
 * @param {string} actorId - The user who reacted
 */
async function createReactionNotification(postId, actorId) {
  try {
    // Get the post author
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id, title')
      .eq('id', postId)
      .single()

    if (postError || !post) {
      return
    }

    // Don't notify if reacting to own post
    if (post.author_id === actorId) {
      return
    }

    // Get session for API call
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) return

    // Determine API base URL
    const isNative = typeof window !== 'undefined' && 
      (window.location?.protocol === 'capacitor:' || 
       window.location?.protocol === 'ionic:' ||
       navigator?.userAgent?.includes('Capacitor'))
    
    const baseUrl = isNative ? 'https://gospel-era.replit.app' : ''

    // Create the notification
    await fetch(`${baseUrl}/api/notifications`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        recipientId: post.author_id,
        eventType: 'amen',
        postId: postId,
        message: `Someone said Amen to your post "${post.title?.substring(0, 30) || 'Untitled'}${post.title?.length > 30 ? '...' : ''}"`
      })
    })
  } catch (error) {
    console.error('Error creating reaction notification:', error)
  }
}