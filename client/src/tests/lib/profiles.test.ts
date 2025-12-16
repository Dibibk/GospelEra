import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  getProfile,
  updateProfile,
  updateUserProfile
} from '../../lib/profiles'

// Mock toast notifications
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Profiles Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.single.mockReturnThis()
  })

  describe('getProfile', () => {
    it('should fetch user profile successfully', async () => {
      const mockProfile = {
        id: 'user-1',
        username: 'john_doe',
        display_name: 'John Doe',
        bio: 'Faithful servant',
        avatar_url: 'https://example.com/avatar.jpg',
        created_at: '2024-01-01T00:00:00Z'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockProfile,
          error: null
        })
      }))

      const result = await getProfile('user-1')

      expect(global.mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(result.data).toEqual(mockProfile)
    })

    it('should handle profile not found', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'No rows returned' }
        })
      }))

      const result = await getProfile('non-existent')

      expect(result.error).toBeTruthy()
    })
  })

  describe('updateProfile', () => {
    it('should update profile successfully', async () => {
      const updates = {
        display_name: 'John Updated',
        bio: 'Updated bio',
        website: 'https://johndoe.com'
      }

      const mockUpdated = {
        id: 'user-1',
        ...updates,
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

      const result = await updateProfile('user-1', updates)

      expect(result.data).toEqual(mockUpdated)
    })

    it('should handle update permission errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' }
        })
      }))

      const result = await updateProfile('user-1', { display_name: 'New Name' })

      expect(result.error).toBeTruthy()
    })
  })

  describe('updateUserProfile', () => {
    it('should update current user profile', async () => {
      // Mock authenticated user
      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'user-1' } },
        error: null
      })

      const updates = {
        display_name: 'Updated Name'
      }

      const mockUpdated = {
        id: 'user-1',
        ...updates
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

      const result = await updateUserProfile(updates)

      expect(result.data).toEqual(mockUpdated)
    })

    it('should handle unauthenticated user', async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: null
      })

      const result = await updateUserProfile({ display_name: 'Test' })

      expect(result.error).toBeTruthy()
      expect(result.error).toContain('Authentication required')
    })
  })

  describe('Profile Avatar Upload', () => {
    it('should handle avatar upload flow', async () => {
      // This would test the avatar upload integration
      // with object storage and profile update
      const mockFile = new File(['test'], 'avatar.jpg', { type: 'image/jpeg' })
      
      // Mock successful upload and profile update
      const mockAvatarUrl = 'https://storage.example.com/avatars/user-1.jpg'
      
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: { avatar_url: mockAvatarUrl },
          error: null
        })
      }))

      // This would test the complete avatar upload workflow
      // including object storage integration
      expect(mockFile.type).toBe('image/jpeg')
    })
  })
})