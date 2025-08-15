import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createPost, listPosts, softDeletePost } from '../lib/posts'
import { getDailyVerse } from '../lib/scripture'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  // Post creation form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  
  // Posts feed state
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [feedError, setFeedError] = useState('')
  
  // Daily verse state
  const [dailyVerse, setDailyVerse] = useState<{reference: string, text: string} | null>(null)
  const [verseLoading, setVerseLoading] = useState(true)
  
  // Delete post state
  const [deletingPostId, setDeletingPostId] = useState<number | null>(null)

  const handleLogout = async () => {
    await signOut()
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

  // Load posts and daily verse on component mount
  useEffect(() => {
    loadPosts()
    loadDailyVerse()
  }, [])

  const loadDailyVerse = async () => {
    try {
      setVerseLoading(true)
      const verse = await getDailyVerse()
      setDailyVerse(verse)
    } catch (error) {
      console.error('Failed to load daily verse:', error)
    } finally {
      setVerseLoading(false)
    }
  }

  const loadPosts = async () => {
    setIsLoading(true)
    const { data, error } = await listPosts({ limit: 20 })
    
    if (error) {
      setFeedError(error.message)
    } else {
      setPosts(data || [])
    }
    
    setIsLoading(false)
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError('')

    const tagsArray = tags.trim() ? tags.split(',').map(tag => tag.trim()) : []
    
    const { data, error } = await createPost({
      title: title.trim(),
      content: content.trim(),
      tags: tagsArray
    })

    if (error) {
      setCreateError(error.message)
    } else {
      // Clear form and reload posts
      setTitle('')
      setContent('')
      setTags('')
      loadPosts()
    }

    setIsCreating(false)
  }

  const handleDeletePost = async (postId: number) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return
    }
    
    setDeletingPostId(postId)
    const { error } = await softDeletePost(postId)
    
    if (error) {
      alert(`Failed to delete post: ${error.message}`)
    } else {
      // Remove the deleted post from the current posts array
      setPosts(posts.filter(post => post.id !== postId))
    }
    
    setDeletingPostId(null)
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-8 w-8 bg-primary-500 rounded-lg flex items-center justify-center">
                  <svg className="h-4 w-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </div>
              </div>
              <div className="ml-4">
                <h1 className="text-xl font-semibold text-gray-900">Posts</h1>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 p-2 hover:bg-gray-100 transition-colors duration-200"
                >
                  <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
                    <svg className="h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="ml-2 text-gray-700 hidden sm:block">{user?.email}</span>
                  <svg className="ml-2 h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-1 ring-1 ring-black ring-opacity-5">
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors duration-200"
                    >
                      <svg className="inline h-4 w-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Verse of the Day */}
        <div className="bg-primary-50 border border-primary-200 shadow-sm rounded-lg mb-8">
          <div className="px-6 py-5 border-b border-primary-200">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-primary-800 flex items-center">
                <svg className="h-5 w-5 text-primary-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Verse of the Day
              </h2>
              <span className="text-sm text-primary-600 font-medium">
                {new Date().toLocaleDateString('en-US', { 
                  weekday: 'long',
                  month: 'long', 
                  day: 'numeric' 
                })}
              </span>
            </div>
          </div>
          
          <div className="px-6 py-6">
            {verseLoading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-300 border-t-primary-600 mr-3"></div>
                <span className="text-primary-700">Loading verse...</span>
              </div>
            ) : dailyVerse ? (
              <div className="space-y-4">
                <blockquote className="border-l-4 border-primary-400 pl-4">
                  <p className="text-lg font-normal text-primary-800 leading-relaxed">
                    "{dailyVerse.text}"
                  </p>
                </blockquote>
                <div className="flex justify-end">
                  <cite className="text-primary-600 font-medium not-italic">
                    — {dailyVerse.reference}
                  </cite>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-primary-500">Unable to load verse</p>
              </div>
            )}
          </div>
        </div>
        {/* Create Post Form */}
        <div className="bg-white shadow-sm rounded-lg mb-6">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Create New Post</h2>
          </div>
          <form onSubmit={handleCreatePost} className="p-6">
            <div className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Enter post title"
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-1">
                  Content
                </label>
                <textarea
                  id="content"
                  required
                  rows={4}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Write your post content..."
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-1">
                  Tags (comma-separated)
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="tag1, tag2, tag3"
                />
              </div>

              {createError && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                  <p className="text-sm text-red-700">{createError}</p>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim() || !content.trim()}
                  className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? 'Creating...' : 'Create Post'}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Posts Feed */}
        <div className="bg-white shadow-sm rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-medium text-gray-900">Recent Posts</h2>
          </div>
          
          <div className="divide-y divide-gray-200">
            {isLoading ? (
              <div className="p-6 text-center">
                <div className="inline-flex items-center">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-500 mr-3"></div>
                  <span className="text-gray-600">Loading posts...</span>
                </div>
              </div>
            ) : feedError ? (
              <div className="p-6">
                <div className="bg-red-50 border border-red-200 rounded-md p-3" role="alert">
                  <p className="text-sm text-red-700">Error loading posts: {feedError}</p>
                </div>
              </div>
            ) : posts.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No posts yet. Create your first post above!
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{post.title}</h3>
                      <p className="text-gray-700 mb-3">{post.content}</p>
                      
                      {post.tags && post.tags.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {post.tags.map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                      
                      <div className="text-sm text-gray-500">
                        By {post.profiles?.display_name || 'Unknown'} • {formatDate(post.created_at)}
                      </div>
                    </div>
                    
                    {/* Delete button - only show for posts authored by current user */}
                    {post.author === user?.id && (
                      <div className="ml-4">
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="inline-flex items-center px-3 py-1.5 border border-red-300 text-sm font-medium rounded-md text-red-700 bg-white hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {deletingPostId === post.id ? (
                            <>
                              <div className="animate-spin rounded-full h-3 w-3 border border-red-300 border-t-red-600 mr-2"></div>
                              Deleting...
                            </>
                          ) : (
                            <>
                              <svg className="h-3 w-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Delete
                            </>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}