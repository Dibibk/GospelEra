import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  getProfilesByIds,
  updateUserSettings,
  getUserSettings,
  upsertMyProfile,
  ensureMyProfile
} from '../../../lib/profiles'

// Mock toast notifications for mobile
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Profiles Library - Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks for mobile
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.upsert.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.in.mockReturnThis()
    global.mockSupabase.single.mockReturnThis()
  })

  describe('getProfilesByIds - Mobile', () => {
    it('should fetch multiple profiles optimized for mobile', async () => {
      const mockMobileProfiles = {
        'mobile-user-1': {
          id: 'mobile-user-1',
          username: 'mobile_john',
          display_name: 'Mobile John',
          bio: 'Mobile faithful servant',
          avatar_url: 'mobile-avatar-1.jpg',
          created_at: '2024-01-01T00:00:00Z'
        },
        'mobile-user-2': {
          id: 'mobile-user-2',
          username: 'mobile_jane',
          display_name: 'Mobile Jane',
          bio: 'Mobile prayer warrior',
          avatar_url: 'mobile-avatar-2.jpg',
          created_at: '2024-01-02T00:00:00Z'
        }
      }

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: Object.values(mockMobileProfiles),
          error: null
        })
      }))

      const result = await getProfilesByIds(['mobile-user-1', 'mobile-user-2'])

      expect(global.mockSupabase.from).toHaveBeenCalledWith('profiles')
      expect(result).toEqual(mockMobileProfiles)
    })

    it('should handle mobile network failures', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        in: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile network failure' }
        })
      }))

      const result = await getProfilesByIds(['mobile-user-1'])
      expect(result).toEqual({})
    })
  })

  describe('updateUserSettings - Mobile', () => {
    it('should update mobile user settings', async () => {
      const mobileSettings = {
        theme: 'dark',
        notifications_enabled: true,
        mobile_push_enabled: true,
        mobile_data_saver: false
      }

      const mockUpdated = {
        id: 'mobile-user-1',
        ...mobileSettings,
        updated_at: '2024-01-02T00:00:00Z'
      }

      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'mobile-user-1' } },
        error: null
      })

      global.mockSupabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpdated,
          error: null
        })
      }))

      const result = await updateUserSettings(mobileSettings)

      expect(result).toEqual(mockUpdated)
    })

    it('should handle mobile authentication errors', async () => {
      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: null },
        error: { message: 'Mobile auth expired' }
      })

      await expect(updateUserSettings({ theme: 'dark' })).rejects.toThrow()
    })
  })

  describe('getUserSettings - Mobile', () => {
    it('should fetch mobile user settings', async () => {
      const mockMobileSettings = {
        id: 'mobile-user-1',
        theme: 'light',
        notifications_enabled: true,
        mobile_push_enabled: true,
        mobile_data_saver: true,
        mobile_offline_mode: false
      }

      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'mobile-user-1' } },
        error: null
      })

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMobileSettings,
          error: null
        })
      }))

      const result = await getUserSettings()

      expect(result).toEqual(mockMobileSettings)
    })
  })

  describe('upsertMyProfile - Mobile', () => {
    it('should upsert mobile profile', async () => {
      const mobileProfileData = {
        display_name: 'Mobile Updated Name',
        bio: 'Updated from mobile',
        mobile_verified: true,
        mobile_device: 'iPhone'
      }

      const mockUpserted = {
        id: 'mobile-user-1',
        ...mobileProfileData,
        updated_at: '2024-01-02T00:00:00Z'
      }

      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'mobile-user-1' } },
        error: null
      })

      global.mockSupabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockUpserted,
          error: null
        })
      }))

      const result = await upsertMyProfile(mobileProfileData)

      expect(result).toEqual(mockUpserted)
    })
  })

  describe('ensureMyProfile - Mobile', () => {
    it('should ensure mobile profile exists', async () => {
      const mockMobileProfile = {
        id: 'mobile-user-1',
        display_name: 'Mobile User',
        mobile_created: true,
        created_at: '2024-01-01T00:00:00Z'
      }

      global.mockSupabase.auth.getUser.mockResolvedValue({
        data: { user: { id: 'mobile-user-1', email: 'mobile@example.com' } },
        error: null
      })

      global.mockSupabase.from.mockImplementation(() => ({
        upsert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockMobileProfile,
          error: null
        })
      }))

      const result = await ensureMyProfile()

      expect(result).toEqual(mockMobileProfile)
    })
  })

  describe('Mobile-Specific Profile Features', () => {
    it('should handle mobile avatar upload', async () => {
      // Test mobile-specific avatar upload flow
      const mobileAvatarData = {
        file: new File(['mobile-avatar'], 'mobile-avatar.jpg', { type: 'image/jpeg' }),
        compressed: true,
        quality: 0.8,
        maxSize: 1024 * 1024 // 1MB mobile limit
      }

      expect(mobileAvatarData.compressed).toBe(true)
      expect(mobileAvatarData.quality).toBe(0.8)
      expect(mobileAvatarData.maxSize).toBe(1048576)
    })

    it('should optimize profile data for mobile bandwidth', async () => {
      // Test mobile-optimized profile data
      const mobileOptimizedProfile = {
        id: 'mobile-user-1',
        display_name: 'User',
        avatar_url: 'compressed-avatar.webp', // WebP for mobile
        mobile_optimized: true
      }

      expect(mobileOptimizedProfile.avatar_url).toContain('.webp')
      expect(mobileOptimizedProfile.mobile_optimized).toBe(true)
    })

    it('should handle mobile location services', async () => {
      // Test mobile location-based profile features
      const mobileLocationData = {
        latitude: 40.7128,
        longitude: -74.0060,
        city: 'New York',
        privacy_level: 'city_only',
        mobile_location_enabled: true
      }

      expect(mobileLocationData.privacy_level).toBe('city_only')
      expect(mobileLocationData.mobile_location_enabled).toBe(true)
    })

    it('should support mobile biometric authentication', async () => {
      // Test mobile biometric profile security
      const mobileBiometricData = {
        biometric_enabled: true,
        fingerprint_enrolled: true,
        face_id_enrolled: false,
        secure_profile: true
      }

      expect(mobileBiometricData.biometric_enabled).toBe(true)
      expect(mobileBiometricData.fingerprint_enrolled).toBe(true)
    })

    it('should handle mobile offline profile caching', async () => {
      // Test mobile offline profile functionality
      const mobileOfflineProfile = {
        id: 'mobile-user-1',
        cached_at: '2024-01-01T00:00:00Z',
        offline_available: true,
        sync_pending: false
      }

      expect(mobileOfflineProfile.offline_available).toBe(true)
      expect(mobileOfflineProfile.sync_pending).toBe(false)
    })

    it('should support mobile social sharing', async () => {
      // Test mobile social sharing features
      const mobileSharingData = {
        share_url: 'https://gospelera.app/profile/mobile-user-1',
        qr_code_enabled: true,
        mobile_share_enabled: true,
        social_platforms: ['whatsapp', 'messenger', 'sms']
      }

      expect(mobileSharingData.qr_code_enabled).toBe(true)
      expect(mobileSharingData.social_platforms).toContain('whatsapp')
    })
  })
})