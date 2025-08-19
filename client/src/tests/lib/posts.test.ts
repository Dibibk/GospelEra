import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  getPosts, 
  createPost, 
  deletePost, 
  toggleAmen, 
  toggleBookmark,
  searchPosts 
} from '../../lib/posts'

// Mock toast notifications
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Posts Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.insert.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.delete.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.order.mockReturnThis()
    global.mockSupabase.limit.mockReturnThis()
  })

  describe('getPosts', () => {
    it('should fetch posts with default parameters', async () => {
      const mockPosts = [
        {
          id: '1',
          title: 'Test Post',
          content: 'Test content',
          author_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockPosts,
          error: null
        })
      }))

      const result = await getPosts()

      expect(global.mockSupabase.from).toHaveBeenCalledWith('posts')
      expect(result).toEqual(mockPosts)
    })

    it('should handle pagination with cursor', async () => {
      const mockPosts = [
        {
          id: '2',
          title: 'Second Post',
          content: 'Second content',
          author_id: 'user-1',
          created_at: '2024-01-02T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        lt: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockPosts,
          error: null
        })
      }))

      const result = await getPosts({ cursor: '2024-01-02T00:00:00Z' })

      expect(result).toEqual(mockPosts)
    })

    it('should throw error on database failure', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }))

      await expect(getPosts()).rejects.toThrow('Failed to fetch posts')
    })
  })

  describe('createPost', () => {
    it('should create a new post successfully', async () => {
      const newPost = {
        title: 'New Post',
        content: 'New content',
        tags: ['faith', 'prayer'],
        media_urls: []
      }

      const mockCreatedPost = {
        id: '3',
        ...newPost,
        author_id: 'user-1',
        created_at: '2024-01-03T00:00:00Z'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreatedPost,
          error: null
        })
      }))

      const result = await createPost(newPost)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('posts')
      expect(result).toEqual(mockCreatedPost)
    })

    it('should handle validation errors', async () => {
      const invalidPost = {
        title: '', // Empty title should cause validation error
        content: 'Some content',
        tags: [],
        media_urls: []
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Title is required' }
        })
      }))

      await expect(createPost(invalidPost)).rejects.toThrow('Failed to create post')
    })
  })

  describe('deletePost', () => {
    it('should delete a post successfully', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await deletePost('post-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('posts')
    })

    it('should handle permission errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' }
        })
      }))

      await expect(deletePost('post-1')).rejects.toThrow('Failed to delete post')
    })
  })

  describe('toggleAmen', () => {
    it('should toggle amen reaction successfully', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await toggleAmen('post-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('post_reactions')
    })

    it('should handle authentication errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Authentication required' }
        })
      }))

      await expect(toggleAmen('post-1')).rejects.toThrow('Failed to toggle amen')
    })
  })

  describe('toggleBookmark', () => {
    it('should toggle bookmark successfully', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await toggleBookmark('post-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('bookmarks')
    })
  })

  describe('searchPosts', () => {
    it('should search posts by query', async () => {
      const mockResults = [
        {
          id: '1',
          title: 'Faith Journey',
          content: 'Content about faith',
          author_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockResults,
          error: null
        })
      }))

      const result = await searchPosts('faith')

      expect(result).toEqual(mockResults)
      expect(global.mockSupabase.from).toHaveBeenCalledWith('posts')
    })

    it('should filter by tags', async () => {
      const mockResults = [
        {
          id: '2',
          title: 'Prayer Request',
          content: 'Please pray for...',
          tags: ['prayer'],
          author_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockResults,
          error: null
        })
      }))

      const result = await searchPosts('', { tags: ['prayer'] })

      expect(result).toEqual(mockResults)
    })
  })
})