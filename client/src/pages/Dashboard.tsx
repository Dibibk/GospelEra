import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createPost, listPosts, softDeletePost } from '../lib/posts'
import { createComment, listComments, softDeleteComment } from '../lib/comments'
import { createReport } from '../lib/reports'
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
  
  // Comment states
  const [commentForms, setCommentForms] = useState<{[postId: number]: boolean}>({})
  const [commentTexts, setCommentTexts] = useState<{[postId: number]: string}>({})
  const [postComments, setPostComments] = useState<{[postId: number]: any[]}>({})
  const [commentLoading, setCommentLoading] = useState<{[postId: number]: boolean}>({})
  const [loadingMoreComments, setLoadingMoreComments] = useState<{[postId: number]: boolean}>({})
  const [submittingComment, setSubmittingComment] = useState<{[postId: number]: boolean}>({})
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)
  
  // Report modal states
  const [reportModal, setReportModal] = useState<{isOpen: boolean, targetType: 'post'|'comment', targetId: string, reason: string}>({isOpen: false, targetType: 'post', targetId: '', reason: ''})
  const [submittingReport, setSubmittingReport] = useState(false)
  
  // Toast state
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success'|'error'}>({show: false, message: '', type: 'success'})

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

  const toggleCommentForm = (postId: number) => {
    setCommentForms(prev => ({...prev, [postId]: !prev[postId]}))
    
    // Load comments when opening the form for the first time
    if (!commentForms[postId] && !postComments[postId]) {
      loadComments(postId)
    }
  }

  const loadComments = async (postId: number, fromId?: number) => {
    const loadingKey = fromId ? 'loadingMoreComments' : 'commentLoading'
    
    if (fromId) {
      setLoadingMoreComments(prev => ({...prev, [postId]: true}))
    } else {
      setCommentLoading(prev => ({...prev, [postId]: true}))
    }
    
    const { data, error } = await listComments({ postId, limit: 3, fromId })
    
    if (error) {
      showToast(`Failed to load comments: ${(error as any).message}`, 'error')
    } else {
      setPostComments(prev => ({
        ...prev, 
        [postId]: fromId ? [...(prev[postId] || []), ...(data || [])] : (data || [])
      }))
    }
    
    if (fromId) {
      setLoadingMoreComments(prev => ({...prev, [postId]: false}))
    } else {
      setCommentLoading(prev => ({...prev, [postId]: false}))
    }
  }

  const handleCreateComment = async (postId: number) => {
    const content = commentTexts[postId]?.trim()
    if (!content) return
    
    setSubmittingComment(prev => ({...prev, [postId]: true}))
    
    const { data, error } = await createComment({ postId, content })
    
    if (error) {
      showToast(`Failed to create comment: ${(error as any).message}`, 'error')
    } else {
      // Clear the input and add the comment to the list
      setCommentTexts(prev => ({...prev, [postId]: ''}))
      setPostComments(prev => ({
        ...prev,
        [postId]: [data, ...(prev[postId] || [])]
      }))
    }
    
    setSubmittingComment(prev => ({...prev, [postId]: false}))
  }

  const handleDeleteComment = async (commentId: number, postId: number) => {
    if (!confirm('Are you sure you want to delete this comment?')) {
      return
    }
    
    setDeletingCommentId(commentId)
    
    const { error } = await softDeleteComment(commentId)
    
    if (error) {
      showToast(`Failed to delete comment: ${(error as any).message}`, 'error')
    } else {
      // Remove comment from the list
      setPostComments(prev => ({
        ...prev,
        [postId]: (prev[postId] || []).filter(comment => comment.id !== commentId)
      }))
    }
    
    setDeletingCommentId(null)
  }

  const openReportModal = (targetType: 'post'|'comment', targetId: string) => {
    setReportModal({isOpen: true, targetType, targetId, reason: ''})
  }

  const closeReportModal = () => {
    setReportModal({isOpen: false, targetType: 'post', targetId: '', reason: ''})
  }

  const handleSubmitReport = async () => {
    setSubmittingReport(true)
    
    const { error } = await createReport({
      targetType: reportModal.targetType,
      targetId: reportModal.targetId,
      reason: reportModal.reason
    })
    
    if (error) {
      showToast(`Failed to submit report: ${(error as any).message}`, 'error')
    } else {
      showToast('Report submitted successfully. Thank you for helping keep our community safe.', 'success')
      closeReportModal()
    }
    
    setSubmittingReport(false)
  }

  const showToast = (message: string, type: 'success'|'error') => {
    setToast({show: true, message, type})
    setTimeout(() => setToast({show: false, message: '', type: 'success'}), 5000)
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
                  <div className="flex justify-between items-start mb-4">
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
                      
                      <div className="text-sm text-gray-500 mb-3">
                        By {post.profiles?.display_name || 'Unknown'} • {formatDate(post.created_at)}
                      </div>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center space-x-4 mb-4">
                    <button
                      onClick={() => toggleCommentForm(post.id)}
                      className="inline-flex items-center text-sm text-gray-500 hover:text-primary-600 transition-colors duration-200"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Comment
                    </button>
                    
                    <button
                      onClick={() => openReportModal('post', post.id.toString())}
                      className="inline-flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors duration-200"
                    >
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      Report
                    </button>
                    
                    {post.author === user?.id && (
                      <button
                        onClick={() => handleDeletePost(post.id)}
                        disabled={deletingPostId === post.id}
                        className="inline-flex items-center text-sm text-gray-500 hover:text-red-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {deletingPostId === post.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border border-gray-400 border-t-gray-600 mr-1"></div>
                            Deleting...
                          </>
                        ) : (
                          <>
                            <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                            Delete
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {/* Comment form */}
                  {commentForms[post.id] && (
                    <div className="border-t pt-4 mb-4">
                      <div className="flex space-x-3">
                        <div className="flex-1">
                          <textarea
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                            placeholder="Write a comment..."
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
                          />
                        </div>
                        <button
                          onClick={() => handleCreateComment(post.id)}
                          disabled={submittingComment[post.id] || !commentTexts[post.id]?.trim()}
                          className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
                        >
                          {submittingComment[post.id] ? 'Posting...' : 'Post'}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Comments section */}
                  {commentForms[post.id] && (
                    <div className="border-t pt-4">
                      {commentLoading[post.id] ? (
                        <div className="flex items-center justify-center py-4">
                          <div className="animate-spin rounded-full h-4 w-4 border-2 border-primary-300 border-t-primary-600 mr-2"></div>
                          <span className="text-gray-500">Loading comments...</span>
                        </div>
                      ) : postComments[post.id]?.length === 0 ? (
                        <div className="text-center py-4 text-gray-500">
                          No comments yet. Be the first to comment!
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(postComments[post.id] || []).map((comment) => (
                            <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                              <div className="flex justify-between items-start">
                                <div className="flex-1">
                                  <p className="text-gray-700 mb-2">{comment.content}</p>
                                  <div className="text-xs text-gray-500">
                                    By {comment.profiles?.display_name || 'Unknown'} • {formatDate(comment.created_at)}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2 ml-3">
                                  <button
                                    onClick={() => openReportModal('comment', comment.id.toString())}
                                    className="text-xs text-gray-400 hover:text-red-500 transition-colors duration-200"
                                  >
                                    Report
                                  </button>
                                  {comment.author === user?.id && (
                                    <button
                                      onClick={() => handleDeleteComment(comment.id, post.id)}
                                      disabled={deletingCommentId === comment.id}
                                      className="text-xs text-gray-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {deletingCommentId === comment.id ? 'Deleting...' : 'Delete'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          ))}
                          
                          {/* Load more comments button */}
                          {postComments[post.id]?.length >= 3 && (
                            <div className="text-center pt-2">
                              <button
                                onClick={() => loadComments(post.id, postComments[post.id][postComments[post.id].length - 1].id)}
                                disabled={loadingMoreComments[post.id]}
                                className="text-sm text-primary-600 hover:text-primary-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {loadingMoreComments[post.id] ? 'Loading...' : 'Load more comments'}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </main>

      {/* Report Modal */}
      {reportModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Report {reportModal.targetType === 'post' ? 'Post' : 'Comment'}
            </h3>
            <div className="mb-4">
              <label htmlFor="report-reason" className="block text-sm font-medium text-gray-700 mb-2">
                Reason for reporting (optional)
              </label>
              <textarea
                id="report-reason"
                value={reportModal.reason}
                onChange={(e) => setReportModal(prev => ({...prev, reason: e.target.value}))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Please describe why you're reporting this content..."
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={closeReportModal}
                disabled={submittingReport}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                {submittingReport ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast.show && (
        <div className={`fixed bottom-4 right-4 p-4 rounded-md shadow-lg z-50 ${
          toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
        }`}>
          <div className="flex items-center">
            <svg className="h-5 w-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {toast.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              )}
            </svg>
            <span className="text-sm">{toast.message}</span>
          </div>
        </div>
      )}
    </div>
  )
}