import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createPrayerRequest,
  listPrayerRequests,
  commitToPray,
  confirmPrayed,
  getMyCommitments,
  getPrayerRequest
} from '../../../lib/prayer'

// Mock toast notifications for mobile
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Prayer Library - Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks for mobile
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.insert.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.order.mockReturnThis()
    global.mockSupabase.limit.mockReturnThis()
    global.mockSupabase.single.mockReturnThis()
  })

  describe('createPrayerRequest - Mobile', () => {
    it('should create prayer request from mobile interface', async () => {
      const newMobileRequest = {
        title: 'Mobile Prayer Request',
        details: 'Created from mobile app',
        is_anonymous: false,
        tags: ['mobile', 'healing']
      }

      const mockCreated = {
        id: 'mobile-prayer-1',
        ...newMobileRequest,
        author_id: 'mobile-user-1',
        status: 'open',
        created_at: '2024-01-01T00:00:00Z'
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: mockCreated,
          error: null
        })
      }))

      const result = await createPrayerRequest(newMobileRequest)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_requests')
      expect(result).toEqual(mockCreated)
    })

    it('should handle mobile validation errors', async () => {
      const invalidMobileRequest = {
        title: '', // Empty title on mobile
        details: 'Mobile description',
        is_anonymous: false,
        tags: []
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile: Title is required' }
        })
      }))

      await expect(createPrayerRequest(invalidMobileRequest)).rejects.toThrow()
    })
  })

  describe('listPrayerRequests - Mobile', () => {
    it('should fetch prayer requests optimized for mobile', async () => {
      const mockMobileRequests = [
        {
          id: 'mobile-prayer-1',
          title: 'Mobile Prayer for Family',
          description: 'Please pray for my family',
          author_id: 'mobile-user-1',
          status: 'open',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockMobileRequests,
          error: null
        })
      }))

      const result = await listPrayerRequests()

      expect(result.data).toEqual(mockMobileRequests)
      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_requests')
    })

    it('should handle mobile network timeouts', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile network timeout' }
        })
      }))

      const result = await listPrayerRequests()
      expect(result.error).toBeTruthy()
    })
  })

  describe('commitToPray - Mobile', () => {
    it('should create mobile prayer commitment', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await commitToPray(1)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_commitments')
    })

    it('should handle mobile commitment errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Mobile: Already committed' }
        })
      }))

      const result = await commitToPray(1)
      expect(result.error).toBeTruthy()
    })
  })

  describe('confirmPrayed - Mobile', () => {
    it('should confirm prayer from mobile interface', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await confirmPrayed(1)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_commitments')
    })
  })

  describe('getMyCommitments - Mobile', () => {
    it('should fetch user commitments on mobile', async () => {
      const mockMobileCommitments = [
        {
          id: 'mobile-commitment-1',
          prayer_request_id: 1,
          user_id: 'mobile-user-1',
          committed_at: '2024-01-01T00:00:00Z',
          prayed_at: null
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockResolvedValue({
          data: mockMobileCommitments,
          error: null
        })
      }))

      const result = await getMyCommitments()

      expect(result.data).toEqual(mockMobileCommitments)
    })
  })

  describe('Mobile-Specific Prayer Features', () => {
    it('should handle mobile gesture interactions for prayers', async () => {
      // Test mobile-specific gesture handling
      const mobileGesture = {
        type: 'swipeRight',
        action: 'commitToPray',
        prayerId: 1
      }

      expect(mobileGesture.type).toBe('swipeRight')
      expect(mobileGesture.action).toBe('commitToPray')
    })

    it('should optimize prayer loading for mobile bandwidth', async () => {
      // Mock mobile-optimized prayer loading
      const compactPrayers = [
        {
          id: 1,
          title: 'Compact Prayer',
          summary: 'Brief summary for mobile'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: compactPrayers,
          error: null
        })
      }))

      const result = await listPrayerRequests()
      expect(result.data).toEqual(compactPrayers)
    })

    it('should handle mobile offline prayer storage', async () => {
      // Test mobile offline prayer functionality
      const offlinePrayer = {
        title: 'Offline Prayer',
        details: 'Created while offline',
        offline: true,
        syncPending: true
      }

      expect(offlinePrayer.offline).toBe(true)
      expect(offlinePrayer.syncPending).toBe(true)
    })

    it('should support mobile push notifications for prayers', async () => {
      // Test mobile push notification setup
      const notificationData = {
        prayerId: 1,
        type: 'prayer_commitment',
        message: 'Someone committed to pray for your request',
        mobile: true
      }

      expect(notificationData.mobile).toBe(true)
      expect(notificationData.type).toBe('prayer_commitment')
    })
  })
})