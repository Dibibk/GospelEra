import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
// @ts-ignore
import { listBookmarks, toggleBookmark, isBookmarked } from '../lib/engagement'
import { getProfilesByIds } from '../lib/profiles'
import { checkFlaggedStatus } from '../lib/flagged'
import { BookmarkIcon, Trash2Icon, HeartIcon, MessageCircleIcon, ShareIcon, FlagIcon, UserIcon, ArrowLeftIcon } from 'lucide-react'
import { BottomNavigation } from '../components/BottomNavigation'

export default function SavedPosts() {
  const { user } = useAuth()
  const { isBanned } = useRole()
  
  // Posts state
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<any>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // User profiles state for author display
  const [profiles, setProfiles] = useState<{[userId: string]: any}>({})
  const [userProfile, setUserProfile] = useState<{display_name?: string, avatar_url?: string, role?: string} | null>(null)
  
  // Engagement states
  const [postBookmarks, setPostBookmarks] = useState<{[postId: number]: boolean}>({})
  const [bookmarkLoading, setBookmarkLoading] = useState<{[postId: number]: boolean}>({})
  
  // Flagged status for admin
  const [flaggedPosts, setFlaggedPosts] = useState<{[postId: number]: boolean}>({})
  
  // Toast state
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success'|'error'}>({show: false, message: '', type: 'success'})

  const showToast = (message: string, type: 'success'|'error' = 'success') => {
    setToast({show: true, message, type})
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 3000)
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

  // Load bookmarked posts
  useEffect(() => {
    loadBookmarkedPosts()
  }, [])

  const loadBookmarkedPosts = async (cursor?: any) => {
    if (cursor) {
      setLoadingMore(true)
    } else {
      setIsLoading(true)
      setPosts([])
      setNextCursor(null)
    }
    
    setError('')
    
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
      
      // Load author profiles
      if (Array.isArray(bookmarkedPosts) && bookmarkedPosts.length > 0) {
        const authorIds = bookmarkedPosts.map((post: any) => post.author_id || post.author).filter(Boolean)
        await loadProfiles(authorIds)
        
        // Load engagement data
        await loadBookmarkStatus(bookmarkedPosts.map((post: any) => post.id))
        
        // Load flagged status for admin users
        if (userProfile?.role === 'admin') {
          await loadFlaggedStatus(bookmarkedPosts.map((post: any) => post.id))
        }
      }
    }
    
    if (cursor) {
      setLoadingMore(false)
    } else {
      setIsLoading(false)
    }
  }

  const loadProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return
    
    try {
      const { data, error } = await getProfilesByIds(userIds)
      if (!error && data && Array.isArray(data)) {
        const profileMap = data.reduce((acc: any, profile: any) => {
          acc[profile.id] = profile
          return acc
        }, {})
        setProfiles(prev => ({ ...prev, ...profileMap }))
      }
    } catch (err) {
      console.error('Failed to load profiles:', err)
    }
  }

  const loadBookmarkStatus = async (postIds: number[]) => {
    if (postIds.length === 0) return
    
    const bookmarkStatuses: {[postId: number]: boolean} = {}
    
    await Promise.all(postIds.map(async (postId) => {
      const { isBookmarked: bookmarked } = await isBookmarked(postId)
      bookmarkStatuses[postId] = bookmarked
    }))
    
    setPostBookmarks(prev => ({ ...prev, ...bookmarkStatuses }))
  }

  const loadFlaggedStatus = async (postIds: number[]) => {
    if (postIds.length === 0) return
    
    try {
      const flaggedResult = await checkFlaggedStatus(postIds, 'post')
      const { data } = flaggedResult || {}
      if (Array.isArray(data)) {
        const flaggedMap = data.reduce((acc: any, postId: number) => {
          acc[postId] = true
          return acc
        }, {})
        setFlaggedPosts(flaggedMap)
      }
    } catch (err) {
      console.error('Failed to load flagged status:', err)
    }
  }

  const handleToggleBookmark = async (postId: number) => {
    setBookmarkLoading(prev => ({ ...prev, [postId]: true }))
    
    const { success, isBookmarked: newBookmarkStatus, error } = await toggleBookmark(postId)
    
    if (success) {
      setPostBookmarks(prev => ({ ...prev, [postId]: newBookmarkStatus }))
      
      // If unbookmarked, remove from the list
      if (!newBookmarkStatus) {
        setPosts(prev => prev.filter(post => post.id !== postId))
        showToast('Removed from saved posts', 'success')
      }
    } else {
      showToast(`Failed to update bookmark: ${(error as any)?.message || 'Unknown error'}`, 'error')
    }
    
    setBookmarkLoading(prev => ({ ...prev, [postId]: false }))
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / (1000 * 60))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffMins < 60) {
      return `${diffMins}m ago`
    } else if (diffHours < 24) {
      return `${diffHours}h ago`
    } else if (diffDays < 7) {
      return `${diffDays}d ago`
    } else {
      return date.toLocaleDateString()
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <Link to="/dashboard" className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
                <ArrowLeftIcon className="w-5 h-5" />
              </Link>
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Saved Posts</h1>
            </div>
            
            <div className="space-y-6">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 animate-pulse">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-full mb-2"></div>
                  <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-pink-50 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="flex items-center gap-4 mb-8">
            <Link to="/dashboard" className="p-2 hover:bg-white/50 dark:hover:bg-gray-800/50 rounded-lg transition-colors">
              <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            </Link>
            <h1 className="text-3xl font-bold text-gray-800 dark:text-white">My Saved Posts</h1>
          </div>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <button 
                onClick={() => loadBookmarkedPosts()}
                className="mt-2 text-red-600 dark:text-red-400 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Empty State */}
          {!error && posts.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <BookmarkIcon className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-400 mb-2">No saved posts yet</h3>
              <p className="text-gray-500 dark:text-gray-500 mb-6">
                Bookmark posts by clicking the bookmark icon to save them here
              </p>
              <Link 
                to="/dashboard" 
                className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                Browse Posts
              </Link>
            </div>
          )}

          {/* Posts List */}
          {posts.length > 0 && (
            <div className="space-y-6 mb-8">
              {posts.map((post) => {
                const profile = profiles[post.author_id || post.author]
                const isFlagged = flaggedPosts[post.id]
                
                return (
                  <div key={post.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-md transition-shadow">
                    <div className="p-6">
                      {/* Post Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-semibold">
                            {profile?.avatar_url ? (
                              <img src={profile.avatar_url} alt="Avatar" className="w-full h-full rounded-full object-cover" />
                            ) : (
                              profile?.display_name?.[0]?.toUpperCase() || <UserIcon className="w-5 h-5" />
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <Link 
                                to={`/profile/${post.author_id || post.author}`}
                                className="font-semibold text-gray-800 dark:text-white hover:text-purple-600 dark:hover:text-purple-400"
                              >
                                {profile?.display_name || 'Gospel User'}
                              </Link>
                              {isFlagged && userProfile?.role === 'admin' && (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-medium rounded-full">
                                  <FlagIcon className="w-3 h-3" />
                                  Flagged
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              {formatDate(post.bookmarked_at || post.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Post Content */}
                      <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">{post.title}</h2>
                      <p className="text-gray-600 dark:text-gray-300 mb-4 whitespace-pre-wrap">{post.content}</p>

                      {/* Tags */}
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-4">
                          {post.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-full text-sm"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex items-center gap-4">
                          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                            <HeartIcon className="w-5 h-5" />
                            <span className="text-sm">Amen</span>
                          </button>
                          
                          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors">
                            <MessageCircleIcon className="w-5 h-5" />
                            <span className="text-sm">Comment</span>
                          </button>
                          
                          <button className="flex items-center gap-2 text-gray-500 dark:text-gray-400 hover:text-green-600 dark:hover:text-green-400 transition-colors">
                            <ShareIcon className="w-5 h-5" />
                            <span className="text-sm">Share</span>
                          </button>
                        </div>

                        <button
                          onClick={() => handleToggleBookmark(post.id)}
                          disabled={bookmarkLoading[post.id] || isBanned}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors ${
                            postBookmarks[post.id]
                              ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-900/50'
                              : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 hover:text-yellow-600 dark:hover:text-yellow-400'
                          } ${(bookmarkLoading[post.id] || isBanned) ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                          <BookmarkIcon className={`w-4 h-4 ${postBookmarks[post.id] ? 'fill-current' : ''}`} />
                          <span className="text-sm">
                            {bookmarkLoading[post.id] ? 'Saving...' : 'Remove'}
                          </span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Load More Button */}
          {nextCursor && !loadingMore && (
            <div className="text-center">
              <button
                onClick={() => loadBookmarkedPosts(nextCursor)}
                className="px-6 py-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
              >
                Load More Saved Posts
              </button>
            </div>
          )}

          {/* Loading More */}
          {loadingMore && (
            <div className="text-center">
              <div className="inline-flex items-center gap-2 text-gray-500 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-300 dark:border-gray-600 border-t-transparent rounded-full animate-spin"></div>
                Loading more...
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white z-50 ${
          toast.type === 'success' ? 'bg-green-500' : 'bg-red-500'
        }`}>
          {toast.message}
        </div>
      )}
      <BottomNavigation />
    </div>
  )
}