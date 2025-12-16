import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { getProfileById } from '../lib/profiles'
import { listPosts } from '../lib/posts'

export default function PublicProfile() {
  const { id } = useParams<{ id: string }>()
  const { user } = useAuth()
  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [postsLoading, setPostsLoading] = useState(true)
  const [error, setError] = useState('')
  const [nextCursor, setNextCursor] = useState<any>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const isOwnProfile = user?.id === id

  useEffect(() => {
    if (id) {
      loadProfile()
      loadUserPosts()
    }
  }, [id])

  const loadProfile = async () => {
    if (!id) return
    
    setLoading(true)
    setError('')
    
    const { data, error } = await getProfileById(id)
    
    if (error) {
      setError((error as any).message || 'Failed to load profile')
    } else if (data) {
      setProfile(data)
    } else {
      setError('Profile not found')
    }
    
    setLoading(false)
  }

  const loadUserPosts = async (cursor?: any) => {
    if (!id) return
    
    const isLoadingMore = Boolean(cursor)
    
    if (isLoadingMore) {
      setLoadingMore(true)
    } else {
      setPostsLoading(true)
      setPosts([])
      setNextCursor(null)
    }
    
    const fromId = cursor?.id
    const { data, error } = await listPosts({ 
      limit: 10, 
      fromId, 
      authorId: id 
    })
    
    if (error) {
      console.error('Failed to load user posts:', error)
    } else {
      const newPosts = data || []
      setPosts(prev => isLoadingMore ? [...prev, ...newPosts] : newPosts)
      
      // Set cursor for next page if we got a full page
      if (newPosts.length === 10) {
        setNextCursor({ 
          created_at: newPosts[newPosts.length - 1].created_at,
          id: newPosts[newPosts.length - 1].id 
        })
      } else {
        setNextCursor(null)
      }
    }
    
    setPostsLoading(false)
    setLoadingMore(false)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const loadMorePosts = () => {
    if (!nextCursor || loadingMore) return
    loadUserPosts(nextCursor)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
        <nav className="bg-gradient-to-r from-white via-purple-50 to-gold-50 shadow-lg border-b border-purple-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Gospel Community</h1>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center space-x-3">
              <div className="animate-spin rounded-full h-8 w-8 border-3 border-primary-300 border-t-gold-600"></div>
              <span className="text-primary-700 font-medium text-lg">Loading profile...</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
        <nav className="bg-gradient-to-r from-white via-purple-50 to-gold-50 shadow-lg border-b border-purple-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-20">
              <div className="flex items-center">
                <Link to="/" className="flex items-center">
                  <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                    <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                  <div className="ml-6">
                    <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Gospel Community</h1>
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </nav>
        
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          <div className="text-center py-12">
            <div className="h-16 w-16 bg-gradient-to-br from-red-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-primary-800 mb-2">Profile Not Found</h2>
            <p className="text-primary-600 mb-6">{error}</p>
            <Link 
              to="/" 
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 transition-all duration-200 font-medium shadow-lg"
            >
              <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back to Dashboard
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-white via-purple-50 to-gold-50 shadow-lg border-b border-purple-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <Link to="/" className="flex items-center">
                <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13.5 2h-3v7.5H3v3h7.5V22h3v-9.5H22v-3h-8.5V2z" />
                  </svg>
                </div>
                <div className="ml-6">
                  <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Gospel Community</h1>
                </div>
              </Link>
            </div>
            
            <div className="flex items-center">
              <Link 
                to="/" 
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg transition-all duration-200"
              >
                <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Back to Dashboard
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 shadow-xl rounded-2xl mb-8 border border-primary-200/50 backdrop-blur-sm overflow-hidden">
          <div className="p-8">
            <div className="flex items-start space-x-6">
              {/* Avatar */}
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary-500 via-purple-500 to-primary-600 flex items-center justify-center shadow-lg ring-4 ring-white overflow-hidden">
                  {profile?.avatar_url ? (
                    <img 
                      src={profile.avatar_url} 
                      alt={profile.display_name || 'User'} 
                      className="h-24 w-24 rounded-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none'
                      }}
                    />
                  ) : (
                    <span className="text-white font-bold text-2xl">
                      {(profile?.display_name || 'U').charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              
              {/* Profile Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h1 className="text-3xl font-bold text-primary-900 mb-2">
                    {profile?.display_name || 'Anonymous User'}
                  </h1>
                  
                  {isOwnProfile && (
                    <Link
                      to="/profile"
                      className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-primary-600 to-purple-600 text-white rounded-xl hover:from-primary-700 hover:to-purple-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      Edit Profile
                    </Link>
                  )}
                </div>
                
                {profile?.bio && (
                  <div className="bg-gradient-to-r from-primary-50/40 to-purple-50/40 rounded-lg p-4 border border-primary-200/30">
                    <p className="text-primary-800 leading-relaxed">{profile.bio}</p>
                  </div>
                )}
                
                <div className="flex items-center space-x-4 mt-4 text-sm text-primary-600">
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Joined {new Date(profile?.created_at).toLocaleDateString('en-US', { 
                      year: 'numeric', 
                      month: 'long' 
                    })}
                  </div>
                  <div className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-primary-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    {posts.length} {posts.length === 1 ? 'post' : 'posts'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Posts Section */}
        <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 shadow-xl rounded-2xl border border-primary-200/50 backdrop-blur-sm">
          <div className="p-6 border-b border-primary-200/40">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">
              Recent Posts
            </h2>
          </div>
          
          <div className="divide-y divide-primary-200/30">
            {postsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-300 border-t-gold-600"></div>
                  <span className="text-primary-700 font-medium">Loading posts...</span>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="h-16 w-16 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-primary-800 mb-2">No Posts Yet</h3>
                <p className="text-primary-600">
                  {isOwnProfile 
                    ? "You haven't shared any posts yet. Start sharing your faith journey!" 
                    : "This user hasn't shared any posts yet."
                  }
                </p>
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="p-6 hover:bg-gradient-to-r hover:from-primary-50/20 hover:to-purple-50/20 transition-all duration-200">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-primary-900">{post.title}</h3>
                      <time className="text-sm text-primary-600 font-medium">
                        {formatDate(post.created_at)}
                      </time>
                    </div>
                    
                    <div className="bg-gradient-to-r from-primary-50/40 to-purple-50/40 rounded-lg p-4 border border-primary-200/30">
                      <p className="text-primary-800 leading-relaxed">{post.content}</p>
                    </div>
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {post.tags.map((tag: string, index: number) => (
                          <span key={index} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-gold-100 to-gold-50 text-gold-800 border border-gold-200/60">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
            
            {/* Load More Button */}
            {nextCursor && (
              <div className="p-6 text-center border-t border-primary-200/40">
                <button
                  onClick={loadMorePosts}
                  disabled={loadingMore}
                  className="inline-flex items-center px-6 py-3 text-sm font-bold text-primary-700 bg-gradient-to-r from-primary-100 to-purple-100 hover:from-primary-200 hover:to-purple-200 rounded-xl transition-all duration-200 transform hover:scale-105 border border-primary-200/60 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loadingMore ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-400 border-t-primary-700 mr-2"></div>
                      Loading more...
                    </>
                  ) : (
                    <>
                      <svg className="h-4 w-4 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                      Load more posts
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}