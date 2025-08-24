import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { useOnlineStatus } from '../hooks/useOnlineStatus'
import { createPost, listPosts, softDeletePost, updatePost, searchPosts, getTopTags, CreatePostData } from '../lib/posts'
import { createComment, listComments, softDeleteComment } from '../lib/comments'
import { createReport } from '../lib/reports'
import { checkMediaPermission } from '../lib/mediaRequests'
import { getDailyVerse } from '../lib/scripture'
import { getProfilesByIds } from '../lib/profiles'
import { checkFlaggedStatus } from '../lib/flagged'
import { moderateContent } from '../lib/moderation'
import { validateAndNormalizeYouTubeUrl } from '../../../shared/youtube'
// @ts-ignore
import { toggleBookmark, isBookmarked, toggleAmen, getAmenInfo, listBookmarks } from '../lib/engagement'
// @ts-ignore
import { getMediaUploadURL, processUploadedMedia } from '../lib/media'
import { MediaUploader } from '../components/MediaUploader'
import { MediaDisplay } from '../components/MediaDisplay'
import { EmbedCard } from '../components/EmbedCard'
import { parseYouTube } from '../lib/embeds'
import { ThemeSwitcher } from '../components/ThemeSwitcher'
import { GuidelinesModal } from '../components/GuidelinesModal'
import { MediaAccessRequestModal } from '../components/MediaAccessRequestModal'
import { supabase } from '../lib/supabaseClient'
import { HandHeart, ArrowRight } from 'lucide-react'
import { BottomNavigation } from '../components/BottomNavigation'

export default function Dashboard() {
  const { user, signOut } = useAuth()
  const { isBanned } = useRole()
  const isOnline = useOnlineStatus()
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  
  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      if (userMenuOpen && !target.closest('.user-menu-container')) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [userMenuOpen])
  
  // Post creation form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [youtubeError, setYoutubeError] = useState('')
  const [hasMediaPermission, setHasMediaPermission] = useState(false)
  const [checkingMediaPermission, setCheckingMediaPermission] = useState(true)
  
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
  // Edit post state
  const [editingPostId, setEditingPostId] = useState<number | null>(null)
  const [editingPost, setEditingPost] = useState<any>(null)
  
  // Comment states
  const [commentForms, setCommentForms] = useState<{[postId: number]: boolean}>({})
  const [commentTexts, setCommentTexts] = useState<{[postId: number]: string}>({})
  const [postComments, setPostComments] = useState<{[postId: number]: any[]}>({})
  const [commentLoading, setCommentLoading] = useState<{[postId: number]: boolean}>({})
  const [loadingMoreComments, setLoadingMoreComments] = useState<{[postId: number]: boolean}>({})
  const [submittingComment, setSubmittingComment] = useState<{[postId: number]: boolean}>({})
  const [deletingCommentId, setDeletingCommentId] = useState<number | null>(null)
  
  // Report modal states
  const [reportModal, setReportModal] = useState<{isOpen: boolean, targetType: 'post'|'comment', targetId: string, reason: string, selectedReason: string}>({isOpen: false, targetType: 'post', targetId: '', reason: '', selectedReason: ''})
  const [submittingReport, setSubmittingReport] = useState(false)
  
  // Toast state
  const [toast, setToast] = useState<{show: boolean, message: string, type: 'success'|'error'}>({show: false, message: '', type: 'success'})
  
  // Guidelines modal state
  const [showGuidelinesModal, setShowGuidelinesModal] = useState(false)
  
  // User profile state with guidelines
  const [userProfile, setUserProfile] = useState<{display_name?: string, avatar_url?: string, role?: string, accepted_guidelines?: boolean} | null>(null)
  
  // Profile cache for author information
  const [profileCache, setProfileCache] = useState<Map<string, any>>(new Map())
  
  // Flagged status cache for admin indicators
  const [flaggedPosts, setFlaggedPosts] = useState<Map<number, boolean>>(new Map())
  const [flaggedComments, setFlaggedComments] = useState<Map<number, boolean>>(new Map())
  
  // Engagement state
  const [postBookmarks, setPostBookmarks] = useState<{[postId: number]: boolean}>({})
  const [postAmenInfo, setPostAmenInfo] = useState<{[postId: number]: {count: number, mine: boolean}}>({})
  const [bookmarkLoading, setBookmarkLoading] = useState<{[postId: number]: boolean}>({})
  const [amenLoading, setAmenLoading] = useState<{[postId: number]: boolean}>({})

  // Moderation state
  const [moderationError, setModerationError] = useState<string>('')
  const [draftContent, setDraftContent] = useState({ title: '', content: '' })
  
  // Media request modal state  
  const [showMediaRequestModal, setShowMediaRequestModal] = useState(false)

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
    loadUserProfile()
    
    // Load cached profiles from session storage
    const cachedProfiles = sessionStorage.getItem('profileCache')
    if (cachedProfiles) {
      try {
        const parsedCache = JSON.parse(cachedProfiles)
        setProfileCache(new Map(Object.entries(parsedCache)))
      } catch (e) {
        console.error('Failed to parse cached profiles:', e)
      }
    }
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
  
  // Check media permission when user changes
  useEffect(() => {
    const checkPermission = async () => {
      if (!user) {
        setHasMediaPermission(false)
        setCheckingMediaPermission(false)
        return
      }
      
      setCheckingMediaPermission(true)
      try {
        const { hasPermission } = await checkMediaPermission(user.id)
        setHasMediaPermission(hasPermission)
      } catch (error) {
        console.error('Error checking media permission:', error)
        setHasMediaPermission(false)
      } finally {
        setCheckingMediaPermission(false)
      }
    }
    
    checkPermission()
  }, [user])

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
      
      // Batch load author profiles and engagement data
      if (newPosts.length > 0) {
        const authorIds = newPosts.map((post: any) => post.author_id)
        const postIds = newPosts.map((post: any) => post.id)
        loadProfiles(authorIds)
        loadEngagementData(postIds)
        
        // Load flagged status for admin users
        if (userProfile?.role === 'admin') {
          loadFlaggedStatus(postIds, [])
        }
      }
      
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
      
      // Batch load author profiles and engagement data
      if (result.items.length > 0) {
        const authorIds = result.items.map((post: any) => post.author_id)
        const postIds = result.items.map((post: any) => post.id)
        loadProfiles(authorIds)
        loadEngagementData(postIds)
        
        // Load flagged status for admin users
        if (userProfile?.role === 'admin') {
          loadFlaggedStatus(postIds, [])
        }
      }
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

  // Media upload replaced with YouTube link sharing

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsCreating(true)
    setCreateError('')
    setModerationError('')

    const titleText = title.trim()
    const contentText = content.trim()
    
    // Store draft in case of moderation rejection
    setDraftContent({ title: titleText, content: contentText })
    
    // Check moderation for title and content
    const titleModeration = moderateContent(titleText)
    const contentModeration = moderateContent(contentText)
    
    if (!titleModeration.allowed) {
      setModerationError(titleModeration.reason || 'Content moderation failed')
      setIsCreating(false)
      return
    }
    
    if (!contentModeration.allowed) {
      setModerationError(contentModeration.reason || 'Content moderation failed') 
      setIsCreating(false)
      return
    }

    const tagsArray = tags.trim() ? tags.split(',').map(tag => tag.trim()) : []
    
    // Validate YouTube URL if provided
    let normalizedYouTubeUrl = '';
    if (youtubeUrl.trim()) {
      const validation = validateAndNormalizeYouTubeUrl(youtubeUrl.trim());
      if (!validation.isValid) {
        setYoutubeError(validation.error || 'Invalid YouTube URL');
        setIsCreating(false);
        return;
      }
      normalizedYouTubeUrl = validation.normalizedUrl || '';
    }

    const postData = {
      title: titleText,
      content: contentText,
      tags: tagsArray,
      embed_url: normalizedYouTubeUrl
    };

    if (editingPost) {
      // Update existing post
      const { data, error } = await updatePost(editingPost.id, postData)
      
      if (error) {
        setCreateError((error as any).message || 'Failed to update post')
      } else {
        // Force a complete refresh to ensure the updated embed_url is reflected
        handleCancelEdit()
        showToast('Post updated successfully!', 'success')
        
        // Clear posts first to force a fresh reload
        setPosts([])
        setNextCursor(null)
        
        // Refresh the posts to get the latest data
        if (isSearchMode) {
          handleSearch()
        } else {
          loadPosts()
        }
      }
    } else {
      // Create new post
      const { data, error } = await createPost(postData)

      if (error) {
        setCreateError((error as any).message || 'Failed to create post')
      } else {
        // Clear form
        setTitle('')
        setContent('')
        setTags('')
        setYoutubeUrl('')
        setYoutubeError('')
        
        // Check if new post matches current filters
        const newPost = { ...data }
        
        if (postMatchesFilters(newPost)) {
          // Post matches filters, prepend to current list
          setPosts(prev => [newPost, ...prev])
          
          // Load profile and engagement data for the new post
          if (data.author) {
            loadProfiles([data.author])
            loadEngagementData([data.id])
          }
          
          showToast('Post created and added to current view!', 'success')
        } else {
          // Post doesn't match filters, show toast
          showToast('Post created (outside current filter)', 'success')
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
      showToast('Post deleted successfully', 'success')
      
      // Force complete refresh by clearing state first
      setPosts([])
      setNextCursor(null)
      
      // Then reload posts to ensure the deleted post is filtered out
      if (isSearchMode) {
        handleSearch()
      } else {
        loadPosts()
      }
    }
    
    setDeletingPostId(null)
  }

  const handleEditPost = (postId: number) => {
    const post = posts.find(p => p.id === postId)
    if (!post) return
    
    setEditingPost(post)
    setEditingPostId(postId)
    
    // Pre-fill the form with current post data
    setTitle(post.title)
    setContent(post.content)
    setTags(Array.isArray(post.tags) ? post.tags.join(', ') : (post.tags || ''))
    setYoutubeUrl(post.embed_url || '')
    
    // Clear any previous errors
    setCreateError('')
    setModerationError('')
    setYoutubeError('')
    
    // Scroll to the form at the top and focus on title field
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // Focus on the title field to make editing obvious
      const titleInput = document.querySelector('input[name="title"]') as HTMLInputElement || 
                        document.querySelector('input[placeholder*="Post Title"]') as HTMLInputElement ||
                        document.querySelector('input[type="text"]') as HTMLInputElement
      if (titleInput) {
        titleInput.focus()
        titleInput.select() // Select all text to make it clear we're editing
      }
    }, 300) // Longer delay to ensure scroll completes first
  }

  const handleCancelEdit = () => {
    setEditingPost(null)
    setEditingPostId(null)
    
    // Clear the form
    setTitle('')
    setContent('')
    setTags('')
    setYoutubeUrl('')
    setYoutubeError('')
    setCreateError('')
    setModerationError('')
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
      const comments = data || []
      setPostComments(prev => ({
        ...prev, 
        [postId]: fromId ? [...(prev[postId] || []), ...comments] : comments
      }))
      
      // Batch load comment author profiles
      if (comments.length > 0) {
        const authorIds = comments.map((comment: any) => comment.author_id)
        loadProfiles(authorIds)
        
        // Load flagged status for admin users
        if (userProfile?.role === 'admin') {
          const commentIds = comments.map((comment: any) => comment.id)
          loadFlaggedStatus([], commentIds)
        }
      }
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
    
    // Check moderation for comment content
    const moderation = moderateContent(content)
    
    if (!moderation.allowed) {
      showToast(moderation.reason || 'We welcome all, but this space is specifically for Christian prayer to Jesus.', 'error')
      return
    }
    
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
      
      // Load profile for the new comment author
      if (data.author) {
        loadProfiles([data.author])
      }
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
    setReportModal({isOpen: true, targetType, targetId, reason: '', selectedReason: ''})
  }

  const closeReportModal = () => {
    setReportModal({isOpen: false, targetType: 'post', targetId: '', reason: '', selectedReason: ''})
  }

  const handleSubmitReport = async () => {
    setSubmittingReport(true)
    
    // Combine selected reason with custom reason
    const finalReason = reportModal.selectedReason ? 
      (reportModal.reason ? `${reportModal.selectedReason}: ${reportModal.reason}` : reportModal.selectedReason) : 
      reportModal.reason
    
    const { error } = await createReport({
      targetType: reportModal.targetType,
      targetId: reportModal.targetId,
      reason: finalReason
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

  const loadUserProfile = async () => {
    if (!user?.id) return
    
    try {
      // First try with the new column
      let { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_url, role, accepted_guidelines')
        .eq('id', user.id)
        .single()
      
      // If column doesn't exist, fall back to basic query
      if (error && error.code === '42703') {
        const fallbackResult = await supabase
          .from('profiles')
          .select('display_name, avatar_url, role')
          .eq('id', user.id)
          .single()
        
        // Check localStorage for guidelines acceptance as fallback
        const localAcceptance = localStorage.getItem(`guidelines_accepted_${user.id}`) === 'true'
        data = fallbackResult.data ? { 
          display_name: fallbackResult.data.display_name || null,
          avatar_url: fallbackResult.data.avatar_url || null,
          role: fallbackResult.data.role || 'user',
          accepted_guidelines: localAcceptance 
        } : null
        error = fallbackResult.error
      }
      
      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user profile:', error)
      } else if (data) {
        setUserProfile(data)
        
        // Show guidelines modal if user hasn't accepted them
        if (!data.accepted_guidelines) {
          setShowGuidelinesModal(true)
        }
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
    }
  }

  const handleAcceptGuidelines = async () => {
    if (!user?.id) return
    
    try {
      // Try to update with the new column, if it fails gracefully handle it
      const { error } = await supabase
        .from('profiles')
        .update({ accepted_guidelines: true })
        .eq('id', user.id)
      
      if (error && (error.code === '42703' || error.code === 'PGRST204')) {
        // Column doesn't exist yet, just mark as accepted in memory and localStorage
        const updatedProfile = { ...userProfile, accepted_guidelines: true }
        setUserProfile(updatedProfile)
        setShowGuidelinesModal(false)
        
        // Store acceptance in localStorage as fallback
        localStorage.setItem(`guidelines_accepted_${user.id}`, 'true')
        showToast('Guidelines accepted! Welcome to the community.', 'success')
      } else if (error) {
        console.error('Error updating guidelines acceptance:', error)
        showToast('Failed to save guidelines acceptance', 'error')
      } else {
        setUserProfile(prev => prev ? { ...prev, accepted_guidelines: true } : null)
        setShowGuidelinesModal(false)
        showToast('Guidelines accepted! Welcome to the community.', 'success')
      }
    } catch (error) {
      console.error('Error updating guidelines acceptance:', error)
      
      // Fallback: mark as accepted locally
      const updatedProfile = { ...userProfile, accepted_guidelines: true }
      setUserProfile(updatedProfile)
      setShowGuidelinesModal(false)
      
      localStorage.setItem(`guidelines_accepted_${user.id}`, 'true')
      showToast('Guidelines accepted! Welcome to the community.', 'success')
    }
  }

  const handleViewFullGuidelines = () => {
    setShowGuidelinesModal(false)
    window.location.href = '/guidelines'
  }
  
  // Batch load profiles and cache them
  const loadProfiles = async (userIds: string[]) => {
    if (userIds.length === 0) return
    
    // Filter out IDs that are already cached
    const uncachedIds = userIds.filter(id => !profileCache.has(id))
    
    if (uncachedIds.length === 0) return
    
    try {
      const { data, error } = await getProfilesByIds(uncachedIds)
      
      if (error) {
        console.error('Failed to batch load profiles:', error)
        return
      }
      
      if (data) {
        // Update cache with new profiles
        const newCache = new Map(profileCache)
        data.forEach((profile, id) => {
          newCache.set(id, profile)
        })
        setProfileCache(newCache)
        
        // Save to session storage
        const cacheObj = Object.fromEntries(newCache.entries())
        sessionStorage.setItem('profileCache', JSON.stringify(cacheObj))
      }
    } catch (error) {
      console.error('Error batch loading profiles:', error)
    }
  }
  
  // Load flagged status for admin indicators
  const loadFlaggedStatus = async (postIds: number[], commentIds: number[]) => {
    if (userProfile?.role !== 'admin') return // Only load for admin users
    
    try {
      // Load flagged status for posts and comments
      const [flaggedPostsResult, flaggedCommentsResult] = await Promise.all([
        postIds.length > 0 ? checkFlaggedStatus(postIds, 'post') : Promise.resolve(new Map()),
        commentIds.length > 0 ? checkFlaggedStatus(commentIds, 'comment') : Promise.resolve(new Map())
      ])
      
      setFlaggedPosts(flaggedPostsResult)
      setFlaggedComments(flaggedCommentsResult)
    } catch (error) {
      console.error('Failed to load flagged status:', error)
    }
  }

  // Load engagement data (bookmarks and amen reactions) for posts
  const loadEngagementData = async (postIds: number[]) => {
    if (postIds.length === 0) return
    
    try {
      // Load amen info for all posts
      const { data: amenData, error: amenError } = await getAmenInfo(postIds)
      if (amenError) {
        console.error('Failed to load amen info:', amenError)
      } else if (amenData) {
        setPostAmenInfo(prev => ({ ...prev, ...amenData }))
      }
      
      // Load bookmark status for each post
      const bookmarkPromises = postIds.map(async (postId) => {
        const { isBookmarked: bookmarked, error } = await isBookmarked(postId)
        if (error) {
          console.error('Failed to check bookmark status:', error)
          return { postId, bookmarked: false }
        }
        return { postId, bookmarked }
      })
      
      const bookmarkResults = await Promise.all(bookmarkPromises)
      const bookmarkMap: {[postId: number]: boolean} = {}
      bookmarkResults.forEach(({ postId, bookmarked }) => {
        bookmarkMap[postId] = bookmarked
      })
      
      setPostBookmarks(prev => ({ ...prev, ...bookmarkMap }))
    } catch (error) {
      console.error('Error loading engagement data:', error)
    }
  }

  // Helper functions for YouTube embeds
  const extractVideoId = (embedUrl: string): string => {
    const parsed = parseYouTube(embedUrl)
    return parsed.videoId || ''
  }

  const extractStartTime = (embedUrl: string): number | undefined => {
    const parsed = parseYouTube(embedUrl)
    return parsed.start
  }
  
  // Handle bookmark toggle with optimistic updates
  const handleToggleBookmark = async (postId: number) => {
    const currentBookmarked = postBookmarks[postId] || false
    
    // Optimistic update
    setPostBookmarks(prev => ({ ...prev, [postId]: !currentBookmarked }))
    setBookmarkLoading(prev => ({ ...prev, [postId]: true }))
    
    try {
      const { success, isBookmarked: newBookmarked, error } = await toggleBookmark(postId)
      
      if (error) {
        // Revert optimistic update on error
        setPostBookmarks(prev => ({ ...prev, [postId]: currentBookmarked }))
        console.error('Failed to toggle bookmark:', error)
        showToast(`Failed to ${currentBookmarked ? 'remove' : 'save'} post`, 'error')
      } else if (success) {
        // Update to actual state
        setPostBookmarks(prev => ({ ...prev, [postId]: newBookmarked }))
        showToast(newBookmarked ? 'Post saved!' : 'Post unsaved', 'success')
      }
    } catch (error) {
      // Revert optimistic update on error
      setPostBookmarks(prev => ({ ...prev, [postId]: currentBookmarked }))
      console.error('Error toggling bookmark:', error)
      showToast('Failed to update bookmark', 'error')
    } finally {
      setBookmarkLoading(prev => ({ ...prev, [postId]: false }))
    }
  }
  
  // Handle amen toggle with optimistic updates
  const handleToggleAmen = async (postId: number) => {
    const currentAmen = postAmenInfo[postId] || { count: 0, mine: false }
    
    // Optimistic update
    const optimisticCount = currentAmen.mine ? currentAmen.count - 1 : currentAmen.count + 1
    setPostAmenInfo(prev => ({
      ...prev,
      [postId]: { count: optimisticCount, mine: !currentAmen.mine }
    }))
    setAmenLoading(prev => ({ ...prev, [postId]: true }))
    
    try {
      const { success, hasReacted, error } = await toggleAmen(postId)
      
      if (error) {
        // Revert optimistic update on error
        setPostAmenInfo(prev => ({ ...prev, [postId]: currentAmen }))
        console.error('Failed to toggle amen:', error)
        showToast('Failed to update reaction', 'error')
      } else if (success) {
        // Update to actual state
        const actualCount = hasReacted ? currentAmen.count + 1 : currentAmen.count - 1
        setPostAmenInfo(prev => ({
          ...prev,
          [postId]: { count: Math.max(0, actualCount), mine: hasReacted }
        }))
      }
    } catch (error) {
      // Revert optimistic update on error
      setPostAmenInfo(prev => ({ ...prev, [postId]: currentAmen }))
      console.error('Error toggling amen:', error)
      showToast('Failed to update reaction', 'error')
    } finally {
      setAmenLoading(prev => ({ ...prev, [postId]: false }))
    }
  }
  
  // Get profile from cache with fallbacks
  const getAuthorProfile = (authorId: string, fallbackEmail?: string) => {
    const profile = profileCache.get(authorId)
    return {
      display_name: profile?.display_name || fallbackEmail?.split('@')[0] || 'Anonymous',
      avatar_url: profile?.avatar_url || null,
      id: authorId
    }
  }
  
  // Render clickable author info
  const renderAuthorInfo = (authorId: string, fallbackEmail?: string, size: 'sm' | 'md' = 'md') => {
    const author = getAuthorProfile(authorId, fallbackEmail)
    const avatarSize = size === 'sm' ? 'h-8 w-8' : 'h-10 w-10'
    const textSize = size === 'sm' ? 'text-sm' : 'text-base'
    const iconSize = size === 'sm' ? 'text-sm' : 'text-base'
    
    return (
      <Link to={`/profile/${authorId}`} className="flex items-center space-x-3 hover:text-blue-600 transition-colors duration-150">
        <div className={`${avatarSize} rounded-full bg-gray-100 flex items-center justify-center border border-gray-200 overflow-hidden`}>
          {author.avatar_url ? (
            <img 
              src={author.avatar_url} 
              alt={author.display_name} 
              className={`${avatarSize} rounded-full object-cover`}
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <span className={`text-gray-600 font-medium ${iconSize}`}>
              {author.display_name.charAt(0).toUpperCase()}
            </span>
          )}
        </div>
        <span className={`font-medium text-gray-900 ${textSize}`}>
          {author.display_name}
        </span>
      </Link>
    )
  }

  return (
    <div className="min-h-screen relative">
      {/* Faith-centered Navigation */}
      <nav className="faith-gradient-bg light-rays shadow-lg border-b border-purple-200/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-20">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl flex items-center justify-center shadow-lg animate-glow">
                  {/* Glowing Cross Icon */}
                  <svg className="h-7 w-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C10.34 2 9 3.34 9 5v6H5c-1.66 0-3 1.34-3 3s1.34 3 3 3h4v6c0 1.66 1.34 3 3 3s3-1.34 3-3v-6h4c1.66 0 3-1.34 3-3s-1.34-3-3-3h-4V5c0-1.66-1.34-3-3-3z" />
                  </svg>
                </div>
              </div>
              <div className="ml-6">
                <h1 className="text-2xl font-serif font-bold bg-gradient-to-r from-purple-800 to-indigo-700 bg-clip-text text-transparent">Gospel Era</h1>
                <p className="text-sm text-purple-600 font-medium">Share your faith, grow together</p>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              {/* Offline Badge */}
              {!isOnline && (
                <div className="flex items-center px-2 py-1 bg-red-100 border border-red-200 rounded-full text-red-700 text-xs font-medium animate-pulse">
                  <div className="w-2 h-2 bg-red-500 rounded-full mr-1.5"></div>
                  Offline
                </div>
              )}

              
              {/* User Menu */}
              <div className="relative user-menu-container">
                <button
                  type="button"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-sm rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gold-500 p-3 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-300 border border-primary-200 bg-white/80 backdrop-blur-sm shadow-sm"
                >
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-md ring-2 ring-white overflow-hidden">
                    {userProfile?.avatar_url ? (
                      <img 
                        src={userProfile.avatar_url} 
                        alt={userProfile.display_name || user?.email || 'User'} 
                        className="h-9 w-9 rounded-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                          // Show fallback icon when image fails to load
                          const parent = (e.target as HTMLImageElement).parentElement
                          if (parent) {
                            parent.innerHTML = `<svg class="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>`
                          }
                        }}
                      />
                    ) : (
                      <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )}
                  </div>
                  <span className="ml-3 text-primary-800 hidden sm:block font-medium">{user?.email}</span>
                  <svg className="ml-2 h-4 w-4 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {/* Dropdown menu */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-3 w-52 bg-white/95 backdrop-blur-md rounded-xl shadow-xl py-2 ring-1 ring-primary-200 border border-white/50 z-50" style={{ transform: 'translateX(0)' }}>
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
                    <a
                      href="/settings"
                      className="block w-full text-left px-4 py-3 text-sm text-primary-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-200 font-medium"
                    >
                      <svg className="inline h-4 w-4 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.50 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Settings
                    </a>
                    <ThemeSwitcher />
                    <a
                      href="/guidelines"
                      className="block w-full text-left px-4 py-3 text-sm text-primary-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-200 font-medium"
                    >
                      <svg className="inline h-4 w-4 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M15 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                      </svg>
                      Community Guidelines
                    </a>
                    <a
                      href="/support"
                      className="block w-full text-left px-4 py-3 text-sm text-gold-700 hover:bg-gradient-to-r hover:from-gold-50 hover:to-yellow-50 transition-all duration-200 font-medium"
                    >
                      <svg className="inline h-4 w-4 mr-3 text-gold-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      Be a Supporter
                    </a>
                    <a
                      href="/saved"
                      className="block w-full text-left px-4 py-3 text-sm text-primary-700 hover:bg-gradient-to-r hover:from-primary-50 hover:to-purple-50 transition-all duration-200 font-medium"
                    >
                      <svg className="inline h-4 w-4 mr-3 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                      </svg>
                      Saved Posts
                    </a>
                    {/* Admin Links - only show for admin users */}
                    {userProfile?.role === 'admin' && (
                      <div className="border-t border-primary-100">
                        <a
                          href="/admin/reports"
                          className="block w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-200 font-medium"
                        >
                          <svg className="inline h-4 w-4 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Admin Reports
                        </a>
                        <a
                          href="/admin/media-requests"
                          className="block w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-200 font-medium"
                        >
                          <svg className="inline h-4 w-4 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Media Requests
                        </a>
                        <a
                          href="/admin/support"
                          className="block w-full text-left px-4 py-3 text-sm text-red-700 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 transition-all duration-200 font-medium"
                        >
                          <svg className="inline h-4 w-4 mr-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                          Admin Support
                        </a>
                      </div>
                    )}
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
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8 pb-20 md:pb-8">
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

        {/* Prayer Request Call-to-Action Card */}
        <div className="mb-8">
          <Link to="/prayer/browse" className="block">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl p-6 text-white hover:from-purple-700 hover:to-blue-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-[1.02]">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center backdrop-blur-sm">
                    <HandHeart className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold mb-1">Prayer Requests</h3>
                    <p className="text-white text-sm font-medium">Share your heart with our community and receive prayer support</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-white/80">
                  <span className="text-sm font-medium hidden sm:block">View & Share</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              </div>
              <div className="mt-4 flex items-center space-x-6 text-white/80 text-sm">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span>Submit prayer requests</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span>Pray for others</span>
                </div>
                <div className="flex items-center space-x-2 hidden sm:flex">
                  <div className="w-2 h-2 bg-white/60 rounded-full"></div>
                  <span>Build community support</span>
                </div>
              </div>
            </div>
          </Link>
        </div>
        
        {/* Banned User Banner */}
        {isBanned && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-8 shadow-sm">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-orange-800">Account limited</h3>
                <p className="text-sm text-orange-700">You can read posts and comments but cannot post or comment.</p>
              </div>
            </div>
          </div>
        )}
        
        {/* Create Post Form */}
        <div className="bg-gradient-to-br from-white via-primary-50/30 to-purple-50/30 shadow-xl rounded-2xl mb-8 border border-primary-200/50 backdrop-blur-sm">
          <div className="px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">
                  {editingPost ? 'Edit Your Post' : 'Share Your Heart'}
                </h2>
                {editingPost && (
                  <p className="text-sm text-white/80 mt-1">Editing post #{editingPost.id}</p>
                )}
              </div>
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
                <div className="relative">
                  <input
                    id="title"
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    disabled={isBanned}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 font-medium ${
                      isBanned 
                        ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed placeholder-gray-400' 
                        : 'border-primary-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-primary-900 placeholder-primary-400'
                    }`}
                    placeholder={isBanned ? "Account limited - cannot create posts" : "Share your inspiration..."}
                    title={isBanned ? "Account limited - you cannot create posts or comments" : ""}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="content" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Your Message
                </label>
                <div className="relative">
                  <textarea
                    id="content"
                    required
                    rows={5}
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isBanned}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 font-medium resize-none ${
                      isBanned 
                        ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed placeholder-gray-400' 
                        : 'border-primary-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-primary-900 placeholder-gray-600'
                    }`}
                    placeholder={isBanned ? "Account limited - cannot create posts" : "Write your heart... Share testimonies, prayers, reflections, or encouragement for our community."}
                    title={isBanned ? "Account limited - you cannot create posts or comments" : ""}
                  />
                </div>
              </div>

              <div>
                <label htmlFor="tags" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-gold-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                  </svg>
                  Tags (optional)
                </label>
                <div className="relative">
                  <input
                    id="tags"
                    type="text"
                    value={tags}
                    onChange={(e) => setTags(e.target.value)}
                    disabled={isBanned}
                    className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 font-medium ${
                      isBanned 
                        ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed placeholder-gray-400' 
                        : 'border-primary-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-gold-500 focus:border-gold-500 text-primary-900 placeholder-primary-400'
                    }`}
                    placeholder={isBanned ? "Account limited - cannot create posts" : "prayer, testimony, encouragement, worship"}
                    title={isBanned ? "Account limited - you cannot create posts or comments" : ""}
                  />
                </div>
              </div>

              {/* YouTube Link Section */}
              <div>
                <label htmlFor="youtubeUrl" className="block text-sm font-bold text-primary-800 mb-2 flex items-center">
                  <svg className="h-4 w-4 text-red-600 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                  </svg>
                  YouTube link (optional)
                </label>
                
                <div className="space-y-3">
                  <div className="relative">
                    <input
                      id="youtubeUrl"
                      type="url"
                      value={youtubeUrl}
                      onChange={(e) => {
                        setYoutubeUrl(e.target.value);
                        setYoutubeError('');
                      }}
                      onBlur={() => {
                        if (youtubeUrl.trim()) {
                          const validation = validateAndNormalizeYouTubeUrl(youtubeUrl.trim());
                          if (!validation.isValid) {
                            setYoutubeError(validation.error || 'Invalid YouTube URL');
                          } else {
                            setYoutubeUrl(validation.normalizedUrl || youtubeUrl);
                          }
                        }
                      }}
                      disabled={isBanned || !hasMediaPermission}
                      className={`w-full px-4 py-3 border-2 rounded-xl focus:outline-none transition-all duration-200 font-medium ${
                        youtubeError 
                          ? 'border-red-300 bg-red-50/50 focus:ring-2 focus:ring-red-500 focus:border-red-500 text-red-900' 
                          : isBanned 
                            ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed placeholder-gray-400'
                            : !hasMediaPermission
                              ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed placeholder-gray-400'
                              : 'border-primary-200 bg-white/80 backdrop-blur-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 text-primary-900 placeholder-primary-400'
                      }`}
                      placeholder={
                        isBanned 
                          ? "Account limited - cannot share links" 
                          : !hasMediaPermission 
                            ? "Link sharing requires approval - disabled until approved"
                            : "https://youtu.be/VIDEO_ID or https://www.youtube.com/watch?v=VIDEO_ID"
                      }
                      title={
                        isBanned 
                          ? "Account limited - you cannot create posts or comments" 
                          : !hasMediaPermission 
                            ? "Link sharing requires media upload permission - request access above"
                            : ""
                      }
                    />
                    {(isBanned || !hasMediaPermission) && (
                      <div className="absolute inset-0 bg-transparent cursor-not-allowed" title={
                        isBanned 
                          ? "Account limited - you cannot create posts or comments"
                          : "Link sharing requires media upload permission - request access above"
                      }></div>
                    )}
                  </div>
                  
                  {youtubeError && (
                    <p className="text-sm text-red-600 flex items-center">
                      <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                      </svg>
                      {youtubeError}
                    </p>
                  )}
                  
                  <p className="text-xs text-primary-600">
                    You can request permission to share YouTube links. We don't host uploads.
                  </p>
                  
                  {/* Request Link Sharing Button */}
                  {!isBanned && !(userProfile as any)?.media_enabled && (
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowMediaRequestModal(true)}
                        className="w-full flex justify-center items-center py-2 px-4 border border-primary-300 rounded-lg bg-primary-50/50 hover:bg-primary-100/50 hover:border-primary-400 text-primary-700 text-sm font-medium transition-all duration-200"
                      >
                        <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Request Link Sharing
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {(createError || moderationError) && (
                <div className="bg-gradient-to-r from-red-50 to-pink-50 border-2 border-red-200 rounded-xl p-4 shadow-sm" role="alert">
                  <div className="flex items-center">
                    <svg className="h-5 w-5 text-red-500 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <div>
                      {createError && <p className="text-sm font-medium text-red-700">{createError}</p>}
                      {moderationError && (
                        <div className="text-sm font-medium text-red-700">
                          <p className="flex items-center">
                            <svg className="h-4 w-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14L21 3M7 7l-3 3 3 3" />
                            </svg>
                            {moderationError}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            We welcome all, but this space is specifically for Christian prayer to Jesus.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="text-center">
                  <Link 
                    to="/guidelines"
                    className="inline-flex items-center text-sm text-purple-600 hover:text-purple-700 font-medium transition-colors duration-200"
                  >
                    <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h.01M12 12h.01M15 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Review Community Guidelines
                  </Link>
                </div>
                <div className={`${editingPost ? 'flex space-x-4' : ''}`}>
                  {editingPost && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 flex justify-center items-center py-4 px-6 border-2 border-gray-300 rounded-xl shadow-lg text-base font-bold text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-400 focus:outline-none focus:ring-4 focus:ring-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                    >
                      <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Cancel
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={isCreating || !title.trim() || !content.trim() || isBanned}
                    className={`${editingPost ? 'flex-1' : 'w-full'} flex justify-center items-center py-4 px-6 border border-transparent rounded-xl shadow-lg text-base font-bold text-white bg-gradient-to-r from-primary-600 via-purple-600 to-primary-600 hover:from-primary-700 hover:via-purple-700 hover:to-primary-700 focus:outline-none focus:ring-4 focus:ring-gold-500/50 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 transform hover:scale-[1.02] hover:shadow-xl`}
                    title={isBanned ? "Account limited - you cannot create posts or comments" : ""}
                  >
                    {isCreating ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3"></div>
                        {editingPost ? 'Updating...' : 'Sharing...'}
                      </>
                    ) : (
                      <>
                        <svg className="h-5 w-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={editingPost ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" : "M12 6v6m0 0v6m0-6h6m-6 0H6"} />
                        </svg>
                        {isBanned ? 'Account Limited' : editingPost ? 'Update Post' : 'Share with Community'}
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>

        {/* Search Section */}
        <div className="bg-gradient-to-br from-white via-primary-50/20 to-purple-50/20 shadow-xl rounded-2xl border border-primary-200/50 backdrop-blur-sm mb-8">
          <div className="px-8 py-6 border-b border-gradient-to-r from-primary-200/40 via-purple-200/40 to-primary-200/40">
            <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg px-6 py-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                  <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <h2 className="text-xl font-bold text-white">Search & Discover</h2>
              </div>
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
              <div className="bg-gradient-to-br from-purple-600 to-blue-600 rounded-lg px-6 py-4">
                <div className="flex items-center space-x-3">
                  <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center shadow-lg backdrop-blur-sm">
                    <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 715.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">
                    {isSearchMode ? 'Search Results' : 'Community Voices'}
                  </h2>
                </div>
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
                <div key={post.id} className="bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-shadow duration-200 mb-4 sm:mb-6">
                  <div className="p-4 sm:p-6">
                    <div className="flex items-start space-x-4 mb-4">
                      {renderAuthorInfo(post.author_id, user?.email, 'md')}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-end mb-2">
                          {/* Flagged indicator for admins */}
                          {userProfile?.role === 'admin' && flaggedPosts.get(post.id) && (
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                              <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                              </svg>
                              Flagged
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="mb-3">
                      <time className="text-sm text-gray-500">
                        {formatDate(post.created_at)}
                      </time>
                    </div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 leading-tight">{post.title}</h3>
                    <div className="bg-gray-50 rounded-lg p-3 sm:p-4 mb-4 border border-gray-100">
                      <p className="text-sm sm:text-base text-gray-700 leading-relaxed">{post.content}</p>
                    </div>

                    {/* Media Display */}
                    {post.media_urls && post.media_urls.length > 0 && (
                      <div className="mb-4">
                        <MediaDisplay 
                          mediaUrls={post.media_urls} 
                          className="w-full max-w-lg"
                          showControls={true}
                        />
                      </div>
                    )}

                    {/* YouTube Embed Display */}
                    {post.embed_url && (
                      <div className="mb-4">
                        <EmbedCard 
                          videoId={extractVideoId(post.embed_url)}
                          start={extractStartTime(post.embed_url)}
                          className="max-w-2xl"
                        />
                      </div>
                    )}
                    
                    {post.tags && post.tags.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {post.tags.map((tag: string, index: number) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-3 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"
                          >
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 border-t border-gray-200 space-y-3 sm:space-y-0">
                      <div className="flex items-center space-x-2 overflow-x-auto scrollbar-hide">
                        <button
                          onClick={() => toggleCommentForm(post.id)}
                          className="inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors duration-150 flex-shrink-0"
                        >
                          <svg className="h-4 w-4 sm:mr-2 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                          <span className="hidden sm:inline">Reply</span>
                        </button>
                        
                        {/* Save (Bookmark) Button */}
                        <button
                          onClick={() => handleToggleBookmark(post.id)}
                          disabled={bookmarkLoading[post.id]}
                          title={postBookmarks[post.id] ? "Saved" : "Save"}
                          className={`inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium rounded-md border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                            postBookmarks[post.id] 
                              ? 'text-blue-700 bg-blue-50 hover:bg-blue-100 border-blue-200' 
                              : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          {bookmarkLoading[post.id] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 sm:mr-2"></div>
                          ) : (
                            <svg className={`h-4 w-4 sm:mr-2 ${
                              postBookmarks[post.id] ? 'text-blue-600 fill-current' : 'text-gray-500'
                            }`} fill={postBookmarks[post.id] ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">{postBookmarks[post.id] ? 'Saved' : 'Save'}</span>
                        </button>
                        
                        {/* Amen Button */}
                        <button
                          onClick={() => handleToggleAmen(post.id)}
                          disabled={amenLoading[post.id]}
                          title={postAmenInfo[post.id]?.mine ? "Amen'd" : "Amen"}
                          className={`inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium rounded-md border transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 ${
                            postAmenInfo[post.id]?.mine 
                              ? 'text-red-700 bg-red-50 hover:bg-red-100 border-red-200' 
                              : 'text-gray-700 bg-white hover:bg-gray-50 border-gray-300'
                          }`}
                        >
                          {amenLoading[post.id] ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-gray-600 sm:mr-2"></div>
                          ) : (
                            <svg className={`h-4 w-4 sm:mr-2 ${
                              postAmenInfo[post.id]?.mine ? 'text-red-600' : 'text-gray-500'
                            }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          )}
                          <span className="hidden sm:inline">Amen</span>
                          {(postAmenInfo[post.id]?.count || 0) > 0 && (
                            <span className="ml-1 sm:ml-2 px-1.5 py-0.5 bg-gray-100 rounded text-xs font-medium">
                              {postAmenInfo[post.id]?.count}
                            </span>
                          )}
                        </button>
                        
                        <button
                          onClick={() => openReportModal('post', post.id.toString())}
                          className="inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-gray-500 bg-white hover:bg-gray-50 rounded-md border border-gray-300 transition-colors duration-150 flex-shrink-0"
                        >
                          <svg className="h-4 w-4 sm:mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                          </svg>
                          <span className="hidden sm:inline">Report</span>
                        </button>
                      </div>
                      
                      {(post.author_id === user?.id || (post.author_id === null && user?.id) || userProfile?.role === 'admin') && (
                        <div className="flex items-center space-x-2">
                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditPost(post.id)}
                            disabled={editingPostId === post.id}
                            className="inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-md border border-blue-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 self-start sm:self-auto"
                          >
                            {editingPostId === post.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-300 border-t-blue-600 sm:mr-2"></div>
                                <span className="hidden sm:inline">Editing...</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 sm:mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                </svg>
                                <span className="hidden sm:inline">Edit</span>
                              </>
                            )}
                          </button>
                          
                          {/* Delete Button */}
                          <button
                            onClick={() => handleDeletePost(post.id)}
                            disabled={deletingPostId === post.id}
                            className="inline-flex items-center px-2 sm:px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md border border-red-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 self-start sm:self-auto"
                          >
                            {deletingPostId === post.id ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-red-300 border-t-red-600 sm:mr-2"></div>
                                <span className="hidden sm:inline">Deleting...</span>
                              </>
                            ) : (
                              <>
                                <svg className="h-4 w-4 sm:mr-2 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                                <span className="hidden sm:inline">Delete</span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </div>

                  </div>

                  {/* Comment form */}
                  {commentForms[post.id] && (
                    <div className="border-t border-gray-200 pt-4 mt-4 bg-gray-50 -mx-6 px-6 pb-6 rounded-b-lg">
                      <div className="flex space-x-3">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center border border-gray-300">
                            <span className="text-gray-600 font-medium text-sm">
                              {(user?.email?.charAt(0) || 'Y').toUpperCase()}
                            </span>
                          </div>
                        </div>
                        <div className="flex-1">
                          <textarea
                            value={commentTexts[post.id] || ''}
                            onChange={(e) => setCommentTexts(prev => ({...prev, [post.id]: e.target.value}))}
                            placeholder={isBanned ? "Account limited - cannot comment" : "Write a comment..."}
                            rows={3}
                            disabled={isBanned}
                            className={`w-full px-3 py-2 border rounded-md focus:outline-none resize-none ${
                              isBanned 
                                ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed placeholder-gray-400' 
                                : 'border-gray-300 bg-white text-gray-900 placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-blue-500'
                            }`}
                            title={isBanned ? "Account limited - you cannot create posts or comments" : ""}
                          />
                          <div className="flex justify-end mt-3">
                            <button
                              onClick={() => handleCreateComment(post.id)}
                              disabled={submittingComment[post.id] || !commentTexts[post.id]?.trim() || isBanned}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-150 font-medium"
                              title={isBanned ? "Account limited - you cannot create posts or comments" : ""}
                            >
                              {submittingComment[post.id] ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2 inline-block"></div>
                                  Posting...
                                </>
                              ) : (
                                <>
                                  <svg className="h-4 w-4 mr-2 inline-block" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                  </svg>
                                  {isBanned ? 'Account Limited' : 'Post Comment'}
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
                    <div className="border-t border-gray-200 pt-4 -mx-6 px-6">
                      {commentLoading[post.id] ? (
                        <div className="flex items-center justify-center py-6">
                          <div className="flex items-center space-x-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-300 border-t-blue-600"></div>
                            <span className="text-gray-600">Loading comments...</span>
                          </div>
                        </div>
                      ) : postComments[post.id]?.length === 0 ? (
                        <div className="text-center py-6">
                          <div className="h-12 w-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                            <svg className="h-6 w-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                          </div>
                          <h4 className="text-sm font-medium text-gray-900 mb-1">No comments yet</h4>
                          <p className="text-sm text-gray-500">Be the first to comment</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {(postComments[post.id] || []).map((comment) => (
                            <div key={comment.id} className="bg-white rounded-lg border border-gray-200 p-4">
                              <div className="flex items-start space-x-3">
                                {renderAuthorInfo(comment.author_id, user?.email, 'sm')}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center space-x-2 mb-2">
                                    <time className="text-xs text-gray-500">
                                      {formatDate(comment.created_at)}
                                    </time>
                                    {/* Flagged indicator for admins */}
                                    {userProfile?.role === 'admin' && flaggedComments.get(comment.id) && (
                                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-red-100 text-red-800 border border-red-200">
                                        <svg className="h-3 w-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                        </svg>
                                        Flagged
                                      </span>
                                    )}
                                  </div>
                                  <div className="bg-gray-50 rounded-md p-3 mb-3">
                                    <p className="text-gray-700 leading-relaxed text-sm">{comment.content}</p>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <button
                                      onClick={() => openReportModal('comment', comment.id.toString())}
                                      className="inline-flex items-center px-2 py-1 text-xs font-medium text-gray-500 bg-white hover:bg-gray-50 rounded border border-gray-300 transition-colors duration-150"
                                    >
                                      <svg className="h-3 w-3 mr-1 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4.5c-.77-.833-2.694-.833-3.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                                      </svg>
                                      Report
                                    </button>
                                    {comment.author_id === user?.id && (
                                      <button
                                        onClick={() => handleDeleteComment(comment.id, post.id)}
                                        disabled={deletingCommentId === comment.id}
                                        className="inline-flex items-center px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded border border-red-200 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
                                      >
                                        {deletingCommentId === comment.id ? (
                                          <>
                                            <div className="animate-spin rounded-full h-3 w-3 border border-red-300 border-t-red-600 mr-1"></div>
                                            Deleting...
                                          </>
                                        ) : (
                                          <>
                                            <svg className="h-3 w-3 mr-1 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                            Delete
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
                                className="text-sm text-blue-600 hover:text-blue-700 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white dark:bg-gray-900 rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Report {reportModal.targetType === 'post' ? 'Post' : 'Comment'}
            </h3>
            
            {/* Preset Reasons */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Select a reason for reporting:
              </label>
              <div className="space-y-2">
                {[
                  'Spam or misleading content',
                  'Inappropriate or offensive language',
                  'Harassment or bullying',
                  'Not Christ-Centered (prayer not to Jesus)',
                  'Violates community guidelines',
                  'Other'
                ].map((reason) => (
                  <label key={reason} className="flex items-center">
                    <input
                      type="radio"
                      name="reportReason"
                      value={reason}
                      checked={reportModal.selectedReason === reason}
                      onChange={(e) => setReportModal(prev => ({...prev, selectedReason: e.target.value}))}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300"
                    />
                    <span className="ml-2 text-sm text-gray-900 dark:text-white">{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Reason */}
            <div className="mb-4">
              <label htmlFor="report-reason" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Additional details (optional)
              </label>
              <textarea
                id="report-reason"
                value={reportModal.reason}
                onChange={(e) => setReportModal(prev => ({...prev, reason: e.target.value}))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Please provide additional details if needed..."
              />
            </div>

            {/* Special Notice for Christ-Centered Reports */}
            {reportModal.selectedReason === 'Not Christ-Centered (prayer not to Jesus)' && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/30 border border-purple-200 dark:border-purple-700 rounded-md">
                <p className="text-xs text-purple-700 dark:text-purple-300">
                  ℹ️ This content will be temporarily hidden from the public feed while our moderation team reviews it with our faith-alignment guidelines.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3">
              <button
                onClick={closeReportModal}
                disabled={submittingReport}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitReport}
                disabled={submittingReport || !reportModal.selectedReason}
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

      {/* Faith-centered Footer */}
      <footer className="mt-16 py-12 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="faith-card-gradient rounded-xl p-8 border border-purple-200/30 shadow-lg">
            <div className="mb-4">
              <svg className="h-8 w-8 text-yellow-500 mx-auto mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2L15.09 8.26L22 9L17 14L18.18 21L12 17.77L5.82 21L7 14L2 9L8.91 8.26L12 2Z"/>
              </svg>
            </div>
            <blockquote className="scripture-quote text-lg font-serif mb-4">
              Let your light shine before others, that they may see your good deeds and glorify your Father in heaven
            </blockquote>
            <cite className="text-sm text-purple-600 font-medium">— Matthew 5:16</cite>
            <div className="mt-6 pt-4 border-t border-purple-200/30">
              <p className="text-sm text-purple-700 font-medium">
                May your words bring comfort, your testimony inspire faith, and your presence reflect His love
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Guidelines Modal */}
      <GuidelinesModal
        isOpen={showGuidelinesModal}
        onAgree={handleAcceptGuidelines}
        onViewFull={handleViewFullGuidelines}
      />

      {/* Media Access Request Modal */}
      <MediaAccessRequestModal
        isOpen={showMediaRequestModal}
        onClose={() => setShowMediaRequestModal(false)}
        onSuccess={() => {
          // Refresh user's media permission status
          if (user?.id) {
            loadUserProfile();
          }
        }}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNavigation />
    </div>
  )
}