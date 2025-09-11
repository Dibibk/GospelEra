import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'

// Import all the APIs we need from the webapp
// @ts-ignore
import { listBookmarks, toggleBookmark, isBookmarked, getAmenInfo, toggleAmen } from '../lib/engagement'
import { getProfilesByIds } from '../lib/profiles'
import { checkFlaggedStatus } from '../lib/flagged'

interface MobileSavedPostsPageProps {
  onClose: () => void
}

export default function MobileSavedPostsPage({ onClose }: MobileSavedPostsPageProps) {
  const { user } = useAuth()
  const { isBanned } = useRole()
  
  // Posts state with pagination
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<any>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Profile state for authors and current user
  const [profiles, setProfiles] = useState<{[userId: string]: any}>({})
  const [userProfile, setUserProfile] = useState<{display_name?: string, avatar_url?: string, role?: string} | null>(null)
  
  // Engagement states with optimistic updates
  const [amenInfo, setAmenInfo] = useState<{[postId: number]: {count: number, hasAmened: boolean}}>({})
  const [bookmarkStatus, setBookmarkStatus] = useState<{[postId: number]: boolean}>({})
  const [bookmarkLoading, setBookmarkLoading] = useState<{[postId: number]: boolean}>({})
  const [amenLoading, setAmenLoading] = useState<{[postId: number]: boolean}>({})
  
  // Admin flagged status
  const [flaggedPosts, setFlaggedPosts] = useState<{[postId: number]: boolean}>({})
  
  // Toast notifications
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success'|'error'}>({
    show: false, message: '', type: 'success'
  })

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({show: true, message, type})
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000)
  }

  // Format time ago helper
  const formatTimeAgo = (dateString: string) => {
    const now = new Date()
    const date = new Date(dateString)
    const diffMs = now.getTime() - date.getTime()
    const diffSeconds = Math.floor(diffMs / 1000)
    const diffMinutes = Math.floor(diffSeconds / 60)
    const diffHours = Math.floor(diffMinutes / 60)
    const diffDays = Math.floor(diffHours / 24)

    if (diffDays > 0) return `${diffDays}d ago`
    if (diffHours > 0) return `${diffHours}h ago`
    if (diffMinutes > 0) return `${diffMinutes}m ago`
    return 'just now'
  }

  // Load user profile
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.id) return
      
      try {
        const { data, error } = await getProfilesByIds([user.id])
        if (!error && data && Array.isArray(data) && data.length > 0) {
          setUserProfile(data[0])
        }
      } catch (err) {
        console.error('Failed to load user profile:', err)
      }
    }
    
    loadUserProfile()
  }, [user?.id])

  // Load saved posts on mount
  useEffect(() => {
    loadSavedPosts()
  }, [])

  // Main function to load saved posts with comprehensive enrichment
  const loadSavedPosts = async (cursor?: any) => {
    if (cursor) {
      setLoadingMore(true)
    } else {
      setIsLoading(true)
      setPosts([])
      setNextCursor(null)
    }
    
    setError('')
    
    try {
      // Load bookmarked posts with pagination
      const { data, nextCursor: newCursor, error: fetchError } = await listBookmarks({ 
        limit: 20, 
        cursor 
      })
      
      if (fetchError) {
        setError((fetchError as any).message || 'Failed to load saved posts')
      } else {
        const bookmarkedPosts = data || []
        
        if (cursor) {
          setPosts(prev => [...prev, ...bookmarkedPosts])
        } else {
          setPosts(bookmarkedPosts)
        }
        
        setNextCursor(newCursor)
        
        // Load all enrichment data
        if (Array.isArray(bookmarkedPosts) && bookmarkedPosts.length > 0) {
          await Promise.all([
            loadProfiles(bookmarkedPosts),
            loadEngagementData(bookmarkedPosts),
            loadFlaggedStatus(bookmarkedPosts)
          ])
        }
      }
    } catch (err) {
      console.error('Error loading saved posts:', err)
      setError((err as any).message || 'Failed to load saved posts')
    }
    
    if (cursor) {
      setLoadingMore(false)
    } else {
      setIsLoading(false)
    }
  }

  // Load author profiles
  const loadProfiles = async (bookmarkedPosts: any[]) => {
    try {
      const authorIds = bookmarkedPosts
        .map((post: any) => post.author_id || post.author)
        .filter(Boolean)
      
      if (authorIds.length === 0) return
      
      const { data, error } = await getProfilesByIds(authorIds)
      if (!error && data && Array.isArray(data)) {
        const profileMap = data.reduce((acc: any, profile: any) => {
          acc[profile.id] = profile
          return acc
        }, {})
        setProfiles(prev => ({...prev, ...profileMap}))
      }
    } catch (err) {
      console.error('Failed to load profiles:', err)
    }
  }

  // Load engagement data (amen info and bookmark status)
  const loadEngagementData = async (bookmarkedPosts: any[]) => {
    try {
      const postIds = bookmarkedPosts.map((post: any) => post.id)
      
      // Load amen info for each post
      const amenPromises = postIds.map(async (postId) => {
        try {
          const amenResult = await getAmenInfo(postId)
          return { postId, amenData: amenResult }
        } catch (err) {
          console.error(`Failed to load amen info for post ${postId}:`, err)
          return { postId, amenData: null }
        }
      })
      
      const amenResults = await Promise.all(amenPromises)
      const newAmenInfo = {...amenInfo}
      
      amenResults.forEach(({ postId, amenData }) => {
        if (amenData && !amenData.error) {
          newAmenInfo[postId] = {
            count: amenData.count || 0,
            hasAmened: amenData.hasAmened || false
          }
        } else {
          newAmenInfo[postId] = { count: 0, hasAmened: false }
        }
      })
      
      setAmenInfo(newAmenInfo)
      
      // Load bookmark status (should all be true since these are saved posts, but verify)
      const bookmarkPromises = postIds.map(async (postId) => {
        try {
          const bookmarkResult = await isBookmarked(postId)
          return { postId, isBookmarked: bookmarkResult?.isBookmarked || false }
        } catch (err) {
          console.error(`Failed to check bookmark status for post ${postId}:`, err)
          return { postId, isBookmarked: true } // Assume bookmarked since it's in saved posts
        }
      })
      
      const bookmarkResults = await Promise.all(bookmarkPromises)
      const newBookmarkStatus = {...bookmarkStatus}
      
      bookmarkResults.forEach(({ postId, isBookmarked: bookmarked }) => {
        newBookmarkStatus[postId] = bookmarked
      })
      
      setBookmarkStatus(newBookmarkStatus)
      
    } catch (err) {
      console.error('Failed to load engagement data:', err)
    }
  }

  // Load flagged status for admin users
  const loadFlaggedStatus = async (bookmarkedPosts: any[]) => {
    if (userProfile?.role !== 'admin') return
    
    try {
      const postIds = bookmarkedPosts.map((post: any) => post.id)
      const flaggedMap = await checkFlaggedStatus(postIds, 'post')
      
      const newFlaggedPosts = {...flaggedPosts}
      for (const [postId, isFlagged] of flaggedMap) {
        newFlaggedPosts[Number(postId)] = isFlagged
      }
      
      setFlaggedPosts(prev => ({...prev, ...newFlaggedPosts}))
    } catch (err) {
      console.error('Failed to load flagged status:', err)
    }
  }

  // Handle bookmark toggle with optimistic updates
  const handleToggleBookmark = async (postId: number) => {
    if (isBanned) {
      showToast("Account limited. You cannot bookmark posts.", 'error')
      return
    }

    setBookmarkLoading(prev => ({...prev, [postId]: true}))
    
    // Optimistic update
    const currentStatus = bookmarkStatus[postId]
    setBookmarkStatus(prev => ({...prev, [postId]: !currentStatus}))
    
    try {
      const result = await toggleBookmark(postId)
      
      if (result.error) {
        // Revert optimistic update on error
        setBookmarkStatus(prev => ({...prev, [postId]: currentStatus}))
        showToast(result.error.message || 'Failed to update bookmark', 'error')
      } else {
        setBookmarkStatus(prev => ({...prev, [postId]: result.isBookmarked}))
        
        // If unbookmarked, remove from the list after a brief delay
        if (!result.isBookmarked) {
          showToast('Removed from saved posts', 'success')
          setTimeout(() => {
            setPosts(prev => prev.filter(post => post.id !== postId))
          }, 1000)
        } else {
          showToast('Added to saved posts', 'success')
        }
      }
    } catch (err) {
      // Revert optimistic update on error
      setBookmarkStatus(prev => ({...prev, [postId]: currentStatus}))
      console.error('Error toggling bookmark:', err)
      showToast('Failed to update bookmark', 'error')
    } finally {
      setBookmarkLoading(prev => ({...prev, [postId]: false}))
    }
  }

  // Handle amen toggle with optimistic updates
  const handleToggleAmen = async (postId: number) => {
    if (isBanned) {
      showToast("Account limited. You cannot react to posts.", 'error')
      return
    }

    setAmenLoading(prev => ({...prev, [postId]: true}))
    
    // Optimistic update
    const currentAmen = amenInfo[postId] || { count: 0, hasAmened: false }
    const newCount = currentAmen.hasAmened ? currentAmen.count - 1 : currentAmen.count + 1
    const newHasAmened = !currentAmen.hasAmened
    
    setAmenInfo(prev => ({
      ...prev, 
      [postId]: { count: Math.max(0, newCount), hasAmened: newHasAmened }
    }))
    
    try {
      const result = await toggleAmen(postId)
      
      if (result.error) {
        // Revert optimistic update on error
        setAmenInfo(prev => ({...prev, [postId]: currentAmen}))
        showToast(result.error.message || 'Failed to update reaction', 'error')
      } else {
        // Update with actual server response
        const refreshedAmen = await getAmenInfo(postId)
        if (refreshedAmen && !refreshedAmen.error) {
          setAmenInfo(prev => ({
            ...prev, 
            [postId]: { 
              count: refreshedAmen.count || 0, 
              hasAmened: refreshedAmen.hasAmened || false 
            }
          }))
        }
      }
    } catch (err) {
      // Revert optimistic update on error
      setAmenInfo(prev => ({...prev, [postId]: currentAmen}))
      console.error('Error toggling amen:', err)
      showToast('Failed to update reaction', 'error')
    } finally {
      setAmenLoading(prev => ({...prev, [postId]: false}))
    }
  }

  // Handle share functionality
  const handleShare = async (post: any) => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: post.title,
          text: post.content,
          url: window.location.origin + `/posts/${post.id}`,
        })
      } else {
        // Fallback: copy to clipboard
        const shareText = `${post.title}\n\n${post.content}\n\n${window.location.origin}/posts/${post.id}`
        await navigator.clipboard.writeText(shareText)
        showToast('Link copied to clipboard!', 'success')
      }
    } catch (err) {
      console.error('Error sharing:', err)
      showToast('Failed to share post', 'error')
    }
  }

  // Handle load more
  const handleLoadMore = () => {
    if (!loadingMore && nextCursor) {
      loadSavedPosts(nextCursor)
    }
  }

  return (
    <div 
      data-testid="mobile-saved-posts-page"
      style={{ background: "#ffffff", minHeight: "100vh" }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "16px",
          paddingBottom: "16px",
          borderBottom: "1px solid #dbdbdb",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 10,
        }}
      >
        <button
          data-testid="button-back"
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "18px",
            color: "#262626",
            cursor: "pointer",
            marginRight: "16px",
          }}
        >
          ←
        </button>
        <div style={{ fontSize: "18px", fontWeight: 600, color: "#262626" }}>
          Saved Posts
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        <div 
          data-testid="loading-saved-posts"
          style={{ padding: "40px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: "20px", color: "#8e8e8e" }}>
            Loading saved posts...
          </div>
        </div>
      ) : error ? (
        <div 
          data-testid="error-saved-posts"
          style={{ padding: "40px 20px", textAlign: "center" }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>⚠️</div>
          <div style={{ fontSize: "16px", color: "#ef4444", marginBottom: "8px" }}>
            Error
          </div>
          <div style={{ fontSize: "14px", color: "#8e8e8e", marginBottom: "16px" }}>
            {error}
          </div>
          <button
            data-testid="button-retry"
            onClick={() => loadSavedPosts()}
            style={{
              padding: "8px 16px",
              background: "#0095f6",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Try Again
          </button>
        </div>
      ) : !Array.isArray(posts) || posts.length === 0 ? (
        <div
          data-testid="empty-saved-posts"
          style={{
            textAlign: "center",
            color: "#8e8e8e",
            fontSize: "14px",
            padding: "40px 20px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🔖</div>
          <div style={{ marginBottom: "8px" }}>No saved posts yet</div>
          <div>
            Save posts you want to read later by tapping the bookmark icon
          </div>
        </div>
      ) : (
        <div>
          {posts.map((post) => {
            const postAmenInfo = amenInfo[post.id] || { count: 0, hasAmened: false }
            const isBookmarked = bookmarkStatus[post.id] || false
            const isFlagged = flaggedPosts[post.id] || false
            const authorProfile = profiles[post.author_id] || profiles[post.author]
            
            return (
              <div
                key={post.id}
                data-testid={`post-card-${post.id}`}
                style={{
                  background: "#ffffff",
                  borderBottom: "1px solid #dbdbdb",
                  position: "relative",
                }}
              >
                {/* Admin flagged indicator */}
                {isFlagged && userProfile?.role === 'admin' && (
                  <div
                    data-testid={`flagged-indicator-${post.id}`}
                    style={{
                      position: "absolute",
                      top: "8px",
                      right: "8px",
                      background: "#ef4444",
                      color: "#ffffff",
                      fontSize: "10px",
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: "4px",
                      zIndex: 5,
                    }}
                  >
                    Flagged
                  </div>
                )}

                {/* Post header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    padding: "12px 16px",
                  }}
                >
                  <button
                    data-testid={`button-profile-${post.id}`}
                    onClick={() => {
                      // Navigate to profile - would need router integration
                      showToast('Profile navigation would go here')
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      flex: 1,
                    }}
                  >
                    <div
                      data-testid={`avatar-${post.id}`}
                      style={{
                        width: "32px",
                        height: "32px",
                        borderRadius: "50%",
                        background: "#dbdbdb",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "16px",
                        marginRight: "12px",
                        border: "1px solid #dbdbdb",
                        color: "#8e8e8e",
                        overflow: "hidden",
                      }}
                    >
                      {authorProfile?.avatar_url ? (
                        <img
                          src={authorProfile.avatar_url}
                          alt="Avatar"
                          style={{
                            width: "100%",
                            height: "100%",
                            borderRadius: "50%",
                            objectFit: "cover",
                          }}
                        />
                      ) : (
                        "👤"
                      )}
                    </div>
                    <div style={{ flex: 1, textAlign: "left" }}>
                      <div
                        data-testid={`author-name-${post.id}`}
                        style={{
                          fontWeight: 600,
                          fontSize: "14px",
                          color: "#262626",
                        }}
                      >
                        {authorProfile?.display_name || "Gospel User"}
                      </div>
                      <div 
                        data-testid={`saved-time-${post.id}`}
                        style={{ fontSize: "12px", color: "#8e8e8e" }}
                      >
                        Saved {formatTimeAgo(post.bookmarked_at || post.created_at)}
                      </div>
                    </div>
                  </button>
                </div>

                {/* Post content */}
                <div style={{ padding: "0 16px 12px" }}>
                  <div
                    data-testid={`post-title-${post.id}`}
                    style={{
                      fontWeight: 600,
                      marginBottom: "8px",
                      color: "#262626",
                      fontSize: "16px",
                    }}
                  >
                    {post.title}
                  </div>
                  <div
                    data-testid={`post-content-${post.id}`}
                    style={{
                      fontSize: "14px",
                      lineHeight: 1.4,
                      color: "#262626",
                      marginBottom: "12px",
                    }}
                  >
                    {post.content}
                  </div>

                  {/* Tags */}
                  {post.tags && post.tags.length > 0 && (
                    <div
                      data-testid={`post-tags-${post.id}`}
                      style={{
                        display: "flex",
                        flexWrap: "wrap",
                        gap: "6px",
                        marginBottom: "12px",
                      }}
                    >
                      {post.tags.map((tag: string, tagIndex: number) => (
                        <span
                          key={tagIndex}
                          data-testid={`tag-${post.id}-${tagIndex}`}
                          style={{
                            background: "#f0f8ff",
                            color: "#0095f6",
                            padding: "4px 8px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 500,
                          }}
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action buttons */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 16px 12px",
                    borderTop: "1px solid #f0f0f0",
                  }}
                >
                  <div style={{ display: "flex", gap: "16px" }}>
                    {/* Amen button */}
                    <button
                      data-testid={`button-amen-${post.id}`}
                      onClick={() => handleToggleAmen(post.id)}
                      disabled={isBanned || amenLoading[post.id]}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: (isBanned || amenLoading[post.id]) ? "not-allowed" : "pointer",
                        padding: "8px",
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        opacity: (isBanned || amenLoading[post.id]) ? 0.5 : 1,
                      }}
                    >
                      <span
                        style={{
                          fontSize: "20px",
                          color: postAmenInfo.hasAmened ? "#ef4444" : "#262626",
                        }}
                      >
                        {postAmenInfo.hasAmened ? "♥" : "♡"}
                      </span>
                      {postAmenInfo.count > 0 && (
                        <span
                          data-testid={`amen-count-${post.id}`}
                          style={{
                            fontSize: "12px",
                            color: "#8e8e8e",
                            fontWeight: 500,
                          }}
                        >
                          {postAmenInfo.count}
                        </span>
                      )}
                    </button>

                    {/* Share button */}
                    <button
                      data-testid={`button-share-${post.id}`}
                      onClick={() => handleShare(post)}
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "8px",
                      }}
                    >
                      <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        style={{ color: "#262626" }}
                      >
                        <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
                        <polyline points="16,6 12,2 8,6" />
                        <line x1="12" y1="2" x2="12" y2="15" />
                      </svg>
                    </button>
                  </div>

                  {/* Bookmark button */}
                  <button
                    data-testid={`button-bookmark-${post.id}`}
                    onClick={() => handleToggleBookmark(post.id)}
                    disabled={isBanned || bookmarkLoading[post.id]}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: (isBanned || bookmarkLoading[post.id]) ? "not-allowed" : "pointer",
                      padding: "8px",
                      opacity: (isBanned || bookmarkLoading[post.id]) ? 0.5 : 1,
                    }}
                  >
                    <svg
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill={isBookmarked ? "currentColor" : "none"}
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ 
                        color: isBookmarked ? "#0095f6" : "#262626" 
                      }}
                    >
                      <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
                    </svg>
                  </button>
                </div>
              </div>
            )
          })}

          {/* Load more button */}
          {nextCursor && (
            <div style={{ padding: "16px", textAlign: "center" }}>
              <button
                data-testid="button-load-more"
                onClick={handleLoadMore}
                disabled={loadingMore}
                style={{
                  width: "100%",
                  padding: "12px",
                  background: loadingMore ? "#f0f0f0" : "#0095f6",
                  color: loadingMore ? "#8e8e8e" : "#ffffff",
                  border: "none",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: loadingMore ? "not-allowed" : "pointer",
                }}
              >
                {loadingMore ? "Loading more..." : "Load More Posts"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Toast notification */}
      {toast.show && (
        <div
          data-testid="toast-notification"
          style={{
            position: "fixed",
            bottom: "20px",
            left: "50%",
            transform: "translateX(-50%)",
            background: toast.type === 'success' ? "#10b981" : "#ef4444",
            color: "#ffffff",
            padding: "12px 20px",
            borderRadius: "8px",
            fontSize: "14px",
            fontWeight: 500,
            zIndex: 1000,
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
          }}
        >
          {toast.message}
        </div>
      )}
    </div>
  )
}