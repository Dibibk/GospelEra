import { useState, useEffect } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useRole } from '../hooks/useRole'
import { createPost, updatePost, CreatePostData } from '../lib/posts'
import { validateFaithContent } from '../../../shared/moderation'
import { validateAndNormalizeYouTubeUrl } from '../../../shared/youtube'
import { X, Send, Edit3, Plus } from 'lucide-react'

interface PostCreateModalProps {
  isOpen: boolean
  onClose: () => void
  hasMediaPermission: boolean
  onMediaRequestClick: () => void
  onSuccess: () => void
  editingPost?: any
}

export function PostCreateModal({ 
  isOpen, 
  onClose, 
  hasMediaPermission,
  onMediaRequestClick,
  onSuccess,
  editingPost
}: PostCreateModalProps) {
  const { user } = useAuth()
  const { isBanned } = useRole()
  
  // Form state
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [tags, setTags] = useState('')
  const [youtubeUrl, setYoutubeUrl] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [moderationError, setModerationError] = useState('')
  const [youtubeError, setYoutubeError] = useState('')


  // Load editing post data
  useEffect(() => {
    if (editingPost) {
      setTitle(editingPost.title || '')
      setContent(editingPost.content || '')
      setTags(editingPost.tags ? editingPost.tags.join(', ') : '')
      setYoutubeUrl(editingPost.embed_url || '')
    } else {
      // Reset form for new post
      setTitle('')
      setContent('')
      setTags('')
      setYoutubeUrl('')
    }
    setCreateError('')
    setModerationError('')
    setYoutubeError('')

  }, [editingPost, isOpen])


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (isBanned) {
      setCreateError('Your account is limited. You cannot create posts.')
      return
    }

    setIsCreating(true)
    setCreateError('')
    setModerationError('')
    setYoutubeError('')

    const titleText = title.trim()
    const contentText = content.trim()

    if (!titleText && !contentText) {
      setCreateError('Please provide either a title or content for your post.')
      setIsCreating(false)
      return
    }

    // Enhanced Christ-centric validation for title and content (at least one must pass)
    const titleValidation = validateFaithContent(titleText)
    const contentValidation = validateFaithContent(contentText)
    
    if (!titleValidation.isValid && !contentValidation.isValid) {
      setModerationError(titleValidation.reason || 'Please keep your post centered on Jesus or Scripture.')
      setIsCreating(false)
      return
    }

    const tagsArray = tags.trim() ? tags.split(',').map(tag => tag.trim()) : []
    
    // Validate YouTube URL if provided
    let normalizedYouTubeUrl = ''
    if (youtubeUrl.trim()) {
      const validation = validateAndNormalizeYouTubeUrl(youtubeUrl.trim())
      if (!validation.isValid) {
        setYoutubeError(validation.error || 'Invalid YouTube URL')
        setIsCreating(false)
        return
      }
      normalizedYouTubeUrl = validation.normalizedUrl || ''
    }

    const postData = {
      title: titleText,
      content: contentText,
      tags: tagsArray,
      media_urls: [],
      embed_url: normalizedYouTubeUrl
    }

    try {
      if (editingPost) {
        // Update existing post
        const { data, error } = await updatePost(editingPost.id, postData)
        
        if (error) {
          setCreateError((error as any).message || 'Failed to update post')
        } else {
          onSuccess()
        }
      } else {
        // Create new post
        const { data, error } = await createPost(postData)

        if (error) {
          setCreateError((error as any).message || 'Failed to create post')
        } else {
          onSuccess()
        }
      }
    } catch (error) {
      setCreateError('An unexpected error occurred. Please try again.')
    } finally {
      setIsCreating(false)
    }
  }


  if (!isOpen) return null

  return (
    <div className="modal-pro">
      <div className="modal-pro-content w-full max-w-2xl">
        {/* Header */}
        <div className="modal-pro-header">
          <div className="flex items-center space-x-3">
            <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
              {editingPost ? <Edit3 className="h-5 w-5 text-white" /> : <Plus className="h-5 w-5 text-white" />}
            </div>
            <h2 className="text-h2">
              {editingPost ? 'Edit Post' : 'Create New Post'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="btn-pro p-2 border-0"
            data-testid="button-close-modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <div className="modal-pro-body">
          <form onSubmit={handleSubmit} className="form-pro">
            <div className="form-pro-group">
              <label className="form-pro-label">
                Post Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Share your title here..."
                disabled={isBanned}
                className="input-pro"
                data-testid="input-post-title"
              />
              {isBanned && (
                <p className="form-pro-error">Account limited - posting disabled</p>
              )}
            </div>

            <div className="form-pro-group">
              <label className="form-pro-label">
                Your Message
              </label>
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={6}
                placeholder="Share your heart, testimony, or encouragement..."
                disabled={isBanned}
                className="textarea-pro"
                data-testid="textarea-post-content"
              />
            </div>

            <div className="form-pro-group">
              <label className="form-pro-label">
                Tags (comma-separated)
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="prayer, testimony, encouragement, bible-study..."
                disabled={isBanned}
                className="input-pro"
                data-testid="input-post-tags"
              />
            </div>

            <div className="form-pro-group">
              <label className="form-pro-label">
                YouTube Video (optional)
              </label>
              <input
                type="url"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                disabled={isBanned || !hasMediaPermission}
                className="input-pro"
                data-testid="input-youtube-url"
              />
              {youtubeError && (
                <p className="form-pro-error">{youtubeError}</p>
              )}
            </div>

          {/* Request Link Sharing */}
          {!isBanned && !hasMediaPermission && (
            <div>
              <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                🔗 Link Sharing
              </label>
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-xl">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                  Want to share YouTube links or media? Request permission to enable link sharing.
                </p>
                <button
                  type="button"
                  onClick={onMediaRequestClick}
                  className="w-full flex justify-center items-center py-2 px-4 border border-purple-300 dark:border-purple-600 rounded-lg bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30 hover:border-purple-400 dark:hover:border-purple-500 text-purple-700 dark:text-purple-300 text-sm font-medium transition-all duration-200"
                  data-testid="button-request-link-sharing"
                >
                  <svg className="h-4 w-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                  Request Link Sharing
                </button>
              </div>
            </div>
          )}

            {/* Error Messages */}
            {createError && (
              <div className="card-pro-compact" style={{backgroundColor: '#fef2f2', border: '1px solid #fecaca'}}>
                <p className="text-caption" style={{color: '#b91c1c'}}>{createError}</p>
              </div>
            )}

            {moderationError && (
              <div className="card-pro-compact" style={{backgroundColor: '#fff7ed', border: '1px solid #fed7aa'}}>
                <p className="text-secondary-medium">Content Review</p>
                <p className="text-secondary mt-1">{moderationError}</p>
                <p className="text-caption mt-2">
                  Our community focuses on Jesus-centered content. Consider adding scripture references or gospel themes.
                </p>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6" style={{borderTop: '1px solid var(--border-light)'}}>
              <button
                type="button"
                onClick={onClose}
                className="btn-pro"
                data-testid="button-cancel"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isCreating || isBanned || (!title.trim() && !content.trim())}
                className="btn-pro-primary flex items-center space-x-2"
                data-testid="button-submit-post"
              >
                {isCreating ? (
                  <>
                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                    <span>{editingPost ? 'Updating...' : 'Creating...'}</span>
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    <span>{editingPost ? 'Update Post' : 'Create Post'}</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}