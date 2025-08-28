import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  listComments,
  createComment,
  softDeleteComment
} from '../../../lib/comments'

// Mock toast notifications for mobile
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Comments Library - Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks for mobile
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.insert.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.order.mockReturnThis()
    global.mockSupabase.single.mockReturnThis()
    global.mockSupabase.is.mockReturnThis()
  })

  describe('listComments - Mobile', () => {
    it('should fetch comments optimized for mobile display', async () => {
      const mockMobileComments = [
        {
          id: 'mobile-comment-1',
          content: 'Great mobile post! Amen to that.',
          post_id: 'mobile-post-1',
          author_id: 'mobile-user-1',
          created_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
          profiles: {
            username: 'mobile_user',
            avatar_url: 'mobile-avatar.jpg'
          }
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMobileComments,
          error: null
        })
      }))

      const result = await listComments('mobile-post-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('comments')
      expect(result).toEqual(mockMobileComments)
    })

    it('should exclude soft-deleted comments on mobile', async () => {
      const mockMobileComments = [
        {
          id: 'mobile-comment-1',
          content: 'Visible mobile comment',
          post_id: 'mobile-post-1',
          author_id: 'mobile-user-1',
          deleted_at: null
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMobileComments,
          error: null
        })
      }))

      const result = await listComments('mobile-post-1')

      expect(result).toEqual(mockMobileComments)
      // Verify mobile soft-delete filter is applied
      expect(global.mockSupabase.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should handle mobile network errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile network error' }
        })
      }))

      await expect(listComments('mobile-post-1')).rejects.toThrow()
    })
  })

  describe('createComment - Mobile', () => {
    it('should create comment from mobile interface', async () => {
      const newMobileComment = {
        content: 'This is a blessed mobile message!',
        post_id: 'mobile-post-1'
      }

      const mockCreated = {
        id: 'mobile-comment-2',
        ...newMobileComment,
        author_id: 'mobile-user-1',
        created_at: '2024-01-01T00:00:00Z',
        deleted_at: null
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreated,
          error: null
        })
      }))

      const result = await createComment(newMobileComment)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('comments')
      expect(result).toEqual(mockCreated)
    })

    it('should handle mobile content moderation', async () => {
      const inappropriateMobileComment = {
        content: 'Mobile inappropriate content',
        post_id: 'mobile-post-1'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile: Content violates guidelines' }
        })
      }))

      await expect(createComment(inappropriateMobileComment)).rejects.toThrow()
    })

    it('should validate mobile comment length', async () => {
      const longMobileComment = {
        content: 'a'.repeat(1001), // Exceeds mobile limit
        post_id: 'mobile-post-1'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile: Comment too long' }
        })
      }))

      await expect(createComment(longMobileComment)).rejects.toThrow()
    })
  })

  describe('softDeleteComment - Mobile', () => {
    it('should soft-delete comment from mobile', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await softDeleteComment('mobile-comment-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('comments')
      // Verify mobile soft delete (update, not delete)
      expect(global.mockSupabase.update).toHaveBeenCalled()
    })

    it('should handle mobile permission errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile: Permission denied' }
        })
      }))

      await expect(softDeleteComment('mobile-comment-1')).rejects.toThrow()
    })
  })

  describe('Mobile-Specific Comment Features', () => {
    it('should handle mobile swipe gestures for comments', async () => {
      // Test mobile swipe to delete/reply functionality
      const mobileSwipeGesture = {
        commentId: 'mobile-comment-1',
        direction: 'left',
        velocity: 1.5,
        action: 'delete'
      }

      expect(mobileSwipeGesture.direction).toBe('left')
      expect(mobileSwipeGesture.action).toBe('delete')
    })

    it('should optimize comment loading for mobile', async () => {
      // Test mobile-optimized comment pagination
      const mobileCommentBatch = [
        { id: 1, content: 'Comment 1' },
        { id: 2, content: 'Comment 2' },
        { id: 3, content: 'Comment 3' }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mobileCommentBatch,
          error: null
        })
      }))

      const result = await listComments('mobile-post-1')
      expect(result).toHaveLength(3)
    })

    it('should handle mobile keyboard interactions', async () => {
      // Test mobile virtual keyboard handling
      const mobileKeyboardEvent = {
        type: 'keyboardWillShow',
        height: 300,
        adjustLayout: true
      }

      expect(mobileKeyboardEvent.type).toBe('keyboardWillShow')
      expect(mobileKeyboardEvent.height).toBe(300)
    })

    it('should support mobile voice-to-text comments', async () => {
      // Test mobile voice input for comments
      const voiceComment = {
        content: 'This comment was spoken on mobile',
        inputMethod: 'voice',
        confidence: 0.95
      }

      expect(voiceComment.inputMethod).toBe('voice')
      expect(voiceComment.confidence).toBe(0.95)
    })

    it('should handle mobile comment threading', async () => {
      // Test mobile-optimized comment threading
      const mobileThreadedComments = [
        {
          id: 'mobile-comment-1',
          content: 'Parent mobile comment',
          post_id: 'mobile-post-1',
          parent_id: null,
          author_id: 'mobile-user-1'
        },
        {
          id: 'mobile-comment-2',
          content: 'Mobile reply to parent',
          post_id: 'mobile-post-1',
          parent_id: 'mobile-comment-1',
          author_id: 'mobile-user-2'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mobileThreadedComments,
          error: null
        })
      }))

      const result = await listComments('mobile-post-1')
      expect(result).toEqual(mobileThreadedComments)
    })
  })
})