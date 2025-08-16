import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '../hooks/useAuth'
import { createPost, listPosts, softDeletePost, searchPosts, getTopTags } from '../lib/posts'
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
  const [nextCursor, setNextCursor] = useState<any>(null)
  const [loadingMore, setLoadingMore] = useState(false)
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [isSearchMode, setIsSearchMode] = useState(false)
  
  // Top tags state
  const [topTags, setTopTags] = useState<any[]>([])
  const [tagsLoading, setTagsLoading] = useState(true)
  
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

  // Load posts, daily verse, and top tags on component mount
  useEffect(() => {
    // Restore search state from sessionStorage
    const savedQuery = sessionStorage.getItem('searchQuery')
    const savedTags = sessionStorage.getItem('selectedTags')
    
    if (savedQuery) {
      setSearchQuery(savedQuery)
    }
    
    if (savedTags) {
      try {
        const parsedTags = JSON.parse(savedTags)
        if (Array.isArray(parsedTags)) {
          setSelectedTags(parsedTags)
        }
      } catch (e) {
        console.error('Failed to parse saved tags:', e)
      }
    }
    
    loadPosts()
    loadDailyVerse()
    loadTopTags()
  }, [])

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery)
    }, 400) // 400ms debounce
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  // Handle search when query or tags change
  useEffect(() => {
    const hasQuery = debouncedQuery.trim().length > 0
    const hasTags = selectedTags.length > 0
    const newIsSearchMode = hasQuery || hasTags
    
    setIsSearchMode(newIsSearchMode)
    
    // Persist to sessionStorage
    sessionStorage.setItem('searchQuery', searchQuery)
    sessionStorage.setItem('selectedTags', JSON.stringify(selectedTags))
    
    if (newIsSearchMode) {
      handleSearch()
    } else {
      loadPosts()
    }
  }, [debouncedQuery, selectedTags])

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

  const loadPosts = async (cursor?: any) => {
    const isLoadingMore = Boolean(cursor)
    
    if (isLoadingMore) {
      setLoadingMore(true)
    } else {
      setIsLoading(true)
      setPosts([])
      setNextCursor(null)
    }
    
    const fromId = cursor?.id
    const { data, error } = await listPosts({ limit: 20, fromId })
    
    if (error) {
      setFeedError((error as any).message || 'Failed to load posts')
    } else {
      const newPosts = data || []
      setPosts(prev => isLoadingMore ? [...prev, ...newPosts] : newPosts)
      
      // Set cursor for next page if we got a full page
      if (newPosts.length === 20) {
        setNextCursor({ 
          created_at: newPosts[newPosts.length - 1].created_at,
          id: newPosts[newPosts.length - 1].id 
        })
      } else {
        setNextCursor(null)
      }
    }
    
    setIsLoading(false)
    setLoadingMore(false)
  }

  const handleSearch = async (cursor?: any) => {
    const isLoadingMore = Boolean(cursor)
    
    if (isLoadingMore) {
      setLoadingMore(true)
    } else {
      setIsLoading(true)
      setPosts([])
      setNextCursor(null)
    }
    
    const { data, error } = await searchPosts({
      q: debouncedQuery,
      tags: selectedTags,
      limit: 20,
      cursor
    })
    
    if (error) {
      setFeedError((error as any).message || 'Failed to search posts')
    } else {
      const result = data || { items: [], nextCursor: null }
      setPosts(prev => isLoadingMore ? [...prev, ...result.items] : result.items)
      setNextCursor(result.nextCursor)
    }
    
    setIsLoading(false)
    setLoadingMore(false)
  }

  const loadTopTags = async () => {
    setTagsLoading(true)
    const { data, error } = await getTopTags({ limit: 12 })
    
    if (error) {
      console.error('Failed to load top tags:', error)
    } else if (data) {
      setTopTags(data)
    }
    
    setTagsLoading(false)
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev => 
      prev.includes(tag) 
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    )
  }

  const clearSearch = () => {
    setSearchQuery('')
    setSelectedTags([])
    sessionStorage.removeItem('searchQuery')
    sessionStorage.removeItem('selectedTags')
  }

  // Check if a post matches current search filters
  const postMatchesFilters = (post: any) => {
    const hasQuery = debouncedQuery.trim().length > 0
    const hasTags = selectedTags.length > 0
    
    if (!hasQuery && !hasTags) return true
    
    let matchesQuery = true
    let matchesTags = true
    
    if (hasQuery) {
      const query = debouncedQuery.toLowerCase()
      matchesQuery = post.title.toLowerCase().includes(query) || 
                    post.content.toLowerCase().includes(query)
    }
    
    if (hasTags) {
      matchesTags = selectedTags.some(tag => post.tags && post.tags.includes(tag))
    }
    
    return matchesQuery && matchesTags
  }

  const loadMorePosts = () => {
    if (!nextCursor || loadingMore) return
    
    if (isSearchMode) {
      handleSearch(nextCursor)
    } else {
      loadPosts(nextCursor)
    }
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
      setCreateError((error as any).message || 'Failed to create post')
    } else {
      // Clear form
      setTitle('')
      setContent('')
      setTags('')
      
      // Check if new post matches current filters
      const newPost = { ...data, profiles: { display_name: user?.email?.split('@')[0] || 'You' } }
      
      if (postMatchesFilters(newPost)) {
        // Post matches filters, prepend to current list
        setPosts(prev => [newPost, ...prev])
        showToast('Post created and added to current view!', 'success')
      } else {
        // Post doesn't match filters, show toast
        showToast('Post created (outside current filter)', 'success')
        
        // If not in search mode, reload to include the new post
        if (!isSearchMode) {
          loadPosts()
        }
      }
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
      alert(`Failed to delete post: ${(error as any).message || 'Unknown error'}`)
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
    <div className="min-h-screen">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-white via-purple-50 to-gold-50 shadow-lg border-b border-purple-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-gradient-to-br from-primary-600 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-6 w-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Gospel Community</h1>
                <p className="text-sm text-primary-600 font-medium">Share your faith, grow together</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* User Menu */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 p-3 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-300 border border-primary-200 bg-white/80 backdrop-blur-sm shadow-sm"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-md ring-2 ring-white">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <span className="ml-3 text-primary-800 hidden sm:block font-medium">{user?.email}</span>
                  <svg className="ml-2 h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-md rounded-xl shadow-xl py-2 ring-1 ring-primary-200 border border-white/50 z-50">
                    <div className="px-4 py-3 border-b border-primary-100">
                      <p className="text-sm font-medium text-primary-800">Signed in as</p>
                      <p className="text-sm text-primary-600 truncate">{user?.email}</p>
                    </div>
                    <a
                      href="/profile"
                      className="block w-full text-left px-4 py-3 text-sm text-primary-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-200 font-medium"
                    >
                      <svg className="inline h-4 w-4 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Profile
                    </a>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-primary-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-200 font-medium"
                    >
                      <svg className="inline h-4 w-4 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {/* Verse of the Day */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white via-primary-50/50 to-purple-50/50 border border-primary-200/60 shadow-xl rounded-2xl mb-10 backdrop-blur-sm">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent animate-pulse"></div>
          <div className="relative px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary-800 via-purple-700 to-primary-800 bg-clip-text text-transparent flex items-center">
                <div className="h-8 w-8 bg-gradient-to-br from-gold-500 to-gold-600 rounded-lg flex items-center justify-center mr-3 shadow-md">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                </div>
                Daily Scripture
              </h2>
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 bg-gold-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-primary-700 font-semibold tracking-wide">
                  {new Date().toLocaleDateString('en-US', { 
                    weekday: 'long',
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative px-8 py-8">
            {verseLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-300 border-t-gold-600"></div>
                  <span className="text-primary-700 font-medium">Receiving God's Word...</span>
                </div>
              </div>
            ) : dailyVerse ? (
              <div className="space-y-6">
                <blockquote className="relative">
                  <div className="absolute -left-2 top-0 h-full w-1 bg-gradient-to-b from-gold-500 via-primary-500 to-purple-600 rounded-full"></div>
                  <div className="pl-8">
                    <svg className="h-8 w-8 text-gold-500/40 mb-3" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h4v10h-10z"/>
                    </svg>
                    <p className="text-xl font-medium text-primary-900 leading-relaxed mb-4 font-serif">
                      {dailyVerse.text}
                    </p>
                  </div>
                </blockquote>
                <div className="flex justify-end">
                  <div className="flex items-center space-x-2 bg-gradient-to-r from-primary-100/60 to-purple-100/60 px-4 py-2 rounded-full border border-primary-200/40">
                    <svg className="h-4 w-4 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                    </svg>
                    <cite className="text-primary-800 font-bold not-italic tracking-wide">
                      {dailyVerse.reference}
                    </cite>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-10">
                <div className="h-16 w-16 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                </div>
                <p className="text-primary-600 font-medium">Scripture temporarily unavailable</p>
                <p className="text-primary-500 text-sm mt-1">Please try refreshing the page</p>
              </div>
            )}
          </div>
        </div>
        {/* Create Post Form */}
        <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 shadow-xl rounded-2xl mb-8 border border-primary-200/50 backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
            <div className="flex items-center space-x-3">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Share Your Heart</h2>
            </div>
          </div>
          <form onSubmit={handleCreatePost} className="p-8">
            <div className="space-y-6">
              <div>
                <label htmlFor="title" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Post Title
                </label>
                <input
                  id="title"
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                  placeholder="Share your inspiration..."
                />
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Your Message
                </label>
                <textarea
                  id="content"
                  required
                  rows={5}
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400 resize-none"
                  placeholder="Write your heart... Share testimonies, prayers, reflections, or encouragement for our community."
                />
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags (optional)
                </label>
                <input
                  id="tags"
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                  placeholder="prayer, testimony, encouragement, worship"
                />
              </div>

              {createError && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 shadow-sm" role="alert">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <p className="text-sm font-medium text-red-700">{createError}</p>
                  </div>
                </div>
              )}

              <div>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim() || !content.trim()}
                  className="w-full flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 hover:from-primary-700 hover:via-purple-700 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl"
                >
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                      Sharing...
                    </>
                  ) : (
                    <>
                      <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Share with Community
                    </>
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Search Section */}
        <div className="bg-gradient-to-br from-white via-primary-50/20 to-purple-50/20 shadow-xl rounded-2xl border border-primary-200/50 backdrop-blur-sm mb-8">
          <div className="px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
            <div className="flex items-center space-x-3 mb-6">
              <div className="h-10 w-10 bg-gradient-to-br from-purple-500 to-primary-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">Search & Discover</h2>
            </div>
            
            {/* Search Input */}
            <div className="relative mb-6">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search posts by title or content..."
                className="w-full px-4 py-3 pl-12 pr-12 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 bg-white/80 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
              />
              <svg className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary-400 hover:text-primary-600 transition-colors duration-200"
                  title="Clear search"
                >
                  <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            
            {/* Tags Filter */}
            <div>
              <h3 className="text-sm font-bold text-primary-800 mb-3 flex items-center">
                <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                </svg>
                Popular Topics
              </h3>
              
              {tagsLoading ? (
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-2 border-primary-300 border-t-gold-600"></div>
                  <span className="text-primary-600 font-medium text-sm">Loading topics...</span>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topTags.map((tagData) => {
                    const isSelected = selectedTags.includes(tagData.tag)
                    return (
                      <button
                        key={tagData.tag}
                        onClick={() => toggleTag(tagData.tag)}
                        className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold transition-all duration-200 transform hover:scale-105 border shadow-sm ${
                          isSelected
                            ? 'bg-gradient-to-r from-gold-500 to-gold-600 text-white border-gold-600 shadow-lg ring-2 ring-gold-300 ring-offset-2'
                            : 'bg-gradient-to-r from-gold-100 via-gold-50 to-gold-100 text-gold-800 border-gold-300/60 hover:from-gold-200 hover:to-gold-200'
                        }`}
                      >
                        <svg className="h-3 w-3 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        {tagData.tag}
                        <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-bold ${
                          isSelected ? 'bg-white/20 text-white' : 'bg-gold-200 text-gold-700'
                        }`}>
                          {tagData.count}
                        </span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
            
            {/* Active Filters Display */}
            {(searchQuery.trim() || selectedTags.length > 0) && (
              <div className="mt-6 pt-6 border-t border-primary-200/40">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className="text-sm font-bold text-primary-800">Active Filters:</span>
                    {searchQuery.trim() && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Search: "{searchQuery.trim()}"
                      </span>
                    )}
                    {selectedTags.map(tag => (
                      <span key={tag} className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-gold-100 text-gold-800 border border-gold-200">
                        {tag}
                        <button
                          onClick={() => toggleTag(tag)}
                          className="ml-2 hover:text-gold-600 transition-colors duration-200"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                  <button
                    onClick={clearSearch}
                    className="text-sm text-primary-600 hover:text-primary-700 transition-colors duration-200 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Posts Feed */}
        <div className="bg-gradient-to-br from-white via-primary-50/20 to-purple-50/20 shadow-xl rounded-2xl border border-primary-200/50 backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-gradient-to-br from-gold-500 to-gold-600 rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold bg-gradient-to-r from-primary-800 to-purple-700 bg-clip-text text-transparent">
                  {isSearchMode ? 'Search Results' : 'Community Voices'}
                </h2>
              </div>
              {isSearchMode && (
                <span className="text-sm text-primary-600 font-medium">
                  {posts.length} post{posts.length !== 1 ? 's' : ''} found
                </span>
              )}
            </div>
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
              <div className="p-12 text-center">
                {isSearchMode ? (
                  <div>
                    <div className="h-20 w-20 bg-gradient-to-br from-purple-400 to-primary-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-primary-800 mb-2">No Posts Found</h3>
                    <p className="text-primary-600 mb-4">No posts match your search criteria. Try adjusting your search terms or tags.</p>
                    <button
                      onClick={clearSearch}
                      className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-primary-100 to-purple-100 text-primary-800 rounded-full text-sm font-medium hover:from-primary-200 hover:to-purple-200 transition-all duration-200"
                    >
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                      Clear search and view all posts
                    </button>
                  </div>
                ) : (
                  <div>
                    <div className="h-20 w-20 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
                      <svg className="h-10 w-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <h3 className="text-xl font-bold text-primary-800 mb-2">Begin Your Journey</h3>
                    <p className="text-primary-600 mb-4">Share your first testimony, prayer, or encouragement with our faithful community.</p>
                    <div className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-gold-100 to-gold-200 text-gold-800 rounded-full text-sm font-medium">
                      <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                      </svg>
                      Create your first post above
                    </div>
                  </div>
                )}
              </div>
            ) : (
              posts.map((post) => (
                <div key={post.id} className="relative bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 rounded-2xl shadow-lg border border-primary-200/60 hover:shadow-xl transition-all duration-300 transform hover:scale-[1.01] mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                  <div className="relative p-8">
                    <div className="flex items-start space-x-5 mb-6">
                      <div className="flex-shrink-0">
                        <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary-500 via-purple-500 to-primary-600 flex items-center justify-center shadow-lg ring-2 ring-white">
                          <span className="text-white font-bold text-base">
                            {(post.profiles?.display_name || 'U').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-3 mb-3">
                          <h4 className="text-base font-bold text-primary-900">
                            {post.profiles?.display_name || user?.email?.split('@')[0] || 'Anonymous User'}
                          </h4>
                          <div className="h-1 w-1 bg-gold-500 rounded-full"></div>
                          <time className="text-sm text-primary-600 font-medium">
                            {formatDate(post.created_at)}
                          </time>
                          <div className="flex items-center ml-auto">
                            <div className="h-2 w-2 bg-green-400 rounded-full animate-pulse mr-2"></div>
                            <span className="text-xs text-primary-500 font-medium">Active</span>
                          </div>
                        </div>
                        <h3 className="text-2xl font-bold text-primary-900 mb-4 leading-tight">{post.title}</h3>
                        <div className="bg-gradient-to-r from-primary-50/50 to-purple-50/50 rounded-xl p-5 mb-5 border border-primary-200/40">
                          <p className="text-primary-800 leading-relaxed font-medium">{post.content}</p>
                        </div>
                        
                        {post.tags && post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-3 mb-5">
                            {post.tags.map((tag: string, index: number) => (
                              <span
                                key={index}
                                className="inline-flex items-center px-4 py-2 rounded-full text-sm font-bold bg-gradient-to-r from-gold-100 via-gold-50 to-gold-100 text-gold-800 border border-gold-300/60 hover:from-gold-200 hover:to-gold-200 transition-all duration-200 shadow-sm"
                              >
                                <svg className="h-3 w-3 mr-2 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                                </svg>
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-between pt-6 border-t border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => toggleCommentForm(post.id)}
                          className="inline-flex items-center px-4 py-2 text-sm font-bold text-primary-700 bg-gradient-to-r from-primary-100 to-purple-100 hover:from-primary-200 hover:to-purple-200 rounded-xl transition-all duration-200 transform hover:scale-105 border border-primary-200/60 shadow-sm"
                        >
                          <svg className="h-4 w-4 mr-2 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          Respond
                        </button>
                        
                        <button
                          onClick={() => openReportModal('post', post.id.toString())}
                          className="inline-flex items-center px-4 py-2 text-sm font-bold text-sage-700 bg-gradient-to-r from-sage-100 to-sage-50 hover:from-sage-200 hover:to-sage-100 rounded-xl transition-all duration-200 transform hover:scale-105 border border-sage-200/60 shadow-sm"
                        >
                          <svg className="h-4 w-4 mr-2 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          Report
                        </button>
                      </div>
                      
                      {post.author === user?.id && (
                        <button
                          onClick={() => handleDeletePost(post.id)}
                          disabled={deletingPostId === post.id}
                          className="inline-flex items-center px-4 py-2 text-sm font-bold text-red-700 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 rounded-xl transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-red-200/60 shadow-sm"
                        >
                          {deletingPostId === post.id ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-400 border-t-red-700 mr-2"></div>
                              Removing...
                            </>
                          ) : (
                            <>
                              <svg className="h-4 w-4 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                              Remove
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </div>

                  {/* Comment form */}
                  {commentForms[post.id] && (
                    <div className="border-t border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40 pt-6 mt-6 bg-gradient-to-br from-primary-50/30 to-purple-50/30 -mx-8 px-8 pb-6 rounded-b-2xl">
                      <div className="flex space-x-4">
                        <div className="flex-shrink-0">
                          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-gold-500 to-gold-600 flex items-center justify-center shadow-md ring-2 ring-white">
                            <span className="text-white font-bold text-sm">
                              {(user?.email?.charAt(0) || 'Y').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                            placeholder="Share your thoughts, encouragement, or prayers..."
                            rows={4}
                            className="w-full px-4 py-3 border-2 border-primary-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-gold-500 focus:border-gold-500 resize-none shadow-sm bg-white/90 backdrop-blur-sm transition-all duration-200 font-medium text-primary-900 placeholder-primary-400"
                          />
                          <div className="flex justify-end mt-4">
                            <button
                              onClick={() => handleCreateComment(post.id)}
                              disabled={submittingComment[post.id] || !commentTexts[post.id]?.trim()}
                              className="px-6 py-3 bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 text-white rounded-xl hover:from-primary-700 hover:via-purple-700 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 font-bold shadow-lg hover:shadow-xl transform hover:scale-105"
                            >
                              {submittingComment[post.id] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                                  Sharing...
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                  </svg>
                                  Share Response
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Comments section */}
                  {commentForms[post.id] && (
                    <div className="border-t border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40 pt-6 -mx-8 px-8">
                      {commentLoading[post.id] ? (
                        <div className="flex items-center justify-center py-8">
                          <div className="flex items-center space-x-3">
                            <div className="animate-spin rounded-full h-6 w-6 border-3 border-primary-300 border-t-gold-600"></div>
                            <span className="text-primary-700 font-medium">Loading responses...</span>
                          </div>
                        </div>
                      ) : postComments[post.id]?.length === 0 ? (
                        <div className="text-center py-8">
                          <div className="h-16 w-16 bg-gradient-to-br from-primary-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <h4 className="text-lg font-bold text-primary-800 mb-2">Start the Conversation</h4>
                          <p className="text-primary-600">Be the first to share your thoughts and encouragement!</p>
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {(postComments[post.id] || []).map((comment) => (
                            <div key={comment.id} className="bg-gradient-to-br from-white to-primary-50/20 rounded-xl border border-primary-200/50 p-5 shadow-sm hover:shadow-lg transition-all duration-300 transform hover:scale-[1.01]">
                              <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-purple-500 to-primary-600 flex items-center justify-center shadow-md ring-2 ring-white">
                                    <span className="text-white font-bold text-sm">
                                      {(comment.profiles?.display_name || 'A').charAt(0).toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-3 mb-3">
                                    <h5 className="text-sm font-bold text-primary-900">
                                      {comment.profiles?.display_name || user?.email?.split('@')[0] || 'Anonymous User'}
                                    </h5>
                                    <div className="h-1 w-1 bg-gold-500 rounded-full"></div>
                                    <time className="text-xs text-primary-600 font-medium">
                                      {formatDate(comment.created_at)}
                                    </time>
                                  </div>
                                  <div className="bg-gradient-to-r from-primary-50/40 to-purple-50/40 rounded-lg p-4 mb-4 border border-primary-200/30">
                                    <p className="text-primary-800 leading-relaxed font-medium">{comment.content}</p>
                                  </div>
                                  <div className="flex items-center space-x-3">
                                    <button
                                      onClick={() => openReportModal('comment', comment.id.toString())}
                                      className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-sage-700 bg-gradient-to-r from-sage-100 to-sage-50 hover:from-sage-200 hover:to-sage-100 rounded-lg transition-all duration-200 transform hover:scale-105 border border-sage-200/60 shadow-sm"
                                    >
                                      <svg className="h-3 w-3 mr-2 text-sage-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                      Report
                                    </button>
                                    {comment.author === user?.id && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id, post.id)}
                                        disabled={deletingCommentId === comment.id}
                                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-red-700 bg-gradient-to-r from-red-100 to-pink-100 hover:from-red-200 hover:to-pink-200 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed border border-red-200/60 shadow-sm"
                                      >
                                        {deletingCommentId === comment.id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border border-red-300 border-t-red-600 mr-2"></div>
                                            Removing...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="h-3 w-3 mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Remove
                                          </>
                                        )}
                                      </button>
                                    )}
                                  </div>
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