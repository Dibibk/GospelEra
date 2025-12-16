import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  listComments,
  createComment,
  softDeleteComment
} from '../../lib/comments'

// Mock toast notifications
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Comments Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.insert.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.order.mockReturnThis()
    global.mockSupabase.single.mockReturnThis()
    global.mockSupabase.is.mockReturnThis()
  })

  describe('listComments', () => {
    it('should fetch comments for a post', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Great post! Amen to that.',
          post_id: 'post-1',
          author_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z',
          deleted_at: null,
          profiles: {
            username: 'john_doe',
            avatar_url: null
          }
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockComments,
          error: null
        })
      }))

      const result = await getComments('post-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('comments')
      expect(result).toEqual(mockComments)
    })

    it('should exclude soft-deleted comments', async () => {
      const mockComments = [
        {
          id: 'comment-1',
          content: 'Visible comment',
          post_id: 'post-1',
          author_id: 'user-1',
          deleted_at: null
        }
        // Soft-deleted comment should not be returned
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockComments,
          error: null
        })
      }))

      const result = await getComments('post-1')

      expect(result).toEqual(mockComments)
      // Verify soft-delete filter is applied
      expect(global.mockSupabase.is).toHaveBeenCalledWith('deleted_at', null)
    })

    it('should handle database errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }))

      await expect(getComments('post-1')).rejects.toThrow('Failed to fetch comments')
    })
  })

  describe('createComment', () => {
    it('should create a new comment successfully', async () => {
      const newComment = {
        content: 'This is a blessed message!',
        post_id: 'post-1'
      }

      const mockCreated = {
        id: 'comment-2',
        ...newComment,
        author_id: 'user-1',
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

      const result = await createComment(newComment)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('comments')
      expect(result).toEqual(mockCreated)
    })

    it('should handle content moderation rejection', async () => {
      const inappropriateComment = {
        content: 'This contains inappropriate content that should be blocked',
        post_id: 'post-1'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Content violates community guidelines' }
        })
      }))

      await expect(createComment(inappropriateComment)).rejects.toThrow('Failed to create comment')
    })

    it('should handle validation errors', async () => {
      const invalidComment = {
        content: '', // Empty content
        post_id: 'post-1'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Content cannot be empty' }
        })
      }))

      await expect(createComment(invalidComment)).rejects.toThrow('Failed to create comment')
    })
  })

  describe('deleteComment', () => {
    it('should soft-delete a comment successfully', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await deleteComment('comment-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('comments')
      // Verify it's a soft delete (update, not delete)
      expect(global.mockSupabase.update).toHaveBeenCalled()
    })

    it('should handle permission errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' }
        })
      }))

      await expect(deleteComment('comment-1')).rejects.toThrow('Failed to delete comment')
    })

    it('should handle non-existent comment', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Comment not found' }
        })
      }))

      await expect(deleteComment('non-existent')).rejects.toThrow('Failed to delete comment')
    })
  })

  describe('updateComment', () => {
    it('should update comment content successfully', async () => {
      const updates = {
        content: 'Updated comment content'
      }

      const mockUpdated = {
        id: 'comment-1',
        ...updates,
        post_id: 'post-1',
        author_id: 'user-1',
        updated_at: '2024-01-02T00:00:00Z'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdated,
          error: null
        })
      }))

      const result = await updateComment('comment-1', updates)

      expect(result).toEqual(mockUpdated)
    })

    it('should handle content moderation on updates', async () => {
      const inappropriateUpdate = {
        content: 'Updated with inappropriate content'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Content violates community guidelines' }
        })
      }))

      await expect(updateComment('comment-1', inappropriateUpdate)).rejects.toThrow('Failed to update comment')
    })
  })

  describe('Comment Threading', () => {
    it('should handle nested comment replies', async () => {
      const mockThreadedComments = [
        {
          id: 'comment-1',
          content: 'Parent comment',
          post_id: 'post-1',
          parent_id: null,
          author_id: 'user-1'
        },
        {
          id: 'comment-2',
          content: 'Reply to parent',
          post_id: 'post-1',
          parent_id: 'comment-1',
          author_id: 'user-2'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockThreadedComments,
          error: null
        })
      }))

      const result = await getComments('post-1')

      expect(result).toEqual(mockThreadedComments)
    })
  })
})