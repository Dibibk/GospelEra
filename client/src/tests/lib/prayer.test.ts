import { describe, it, expect, vi, beforeEach } from 'vitest'
import { 
  createPrayerRequest,
  listPrayerRequests,
  commitToPray,
  confirmPrayed,
  getLeaderboard,
  getUserStats,
  getUserPrayerCommitments
} from '../../lib/prayer'

// Mock toast notifications
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}))

describe('Prayer Library', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset supabase mocks
    global.mockSupabase.from.mockReturnThis()
    global.mockSupabase.select.mockReturnThis()
    global.mockSupabase.insert.mockReturnThis()
    global.mockSupabase.update.mockReturnThis()
    global.mockSupabase.eq.mockReturnThis()
    global.mockSupabase.order.mockReturnThis()
    global.mockSupabase.limit.mockReturnThis()
    global.mockSupabase.single.mockReturnThis()
  })

  describe('createPrayerRequest', () => {
    it('should create a new prayer request successfully', async () => {
      const newRequest = {
        title: 'Please pray for healing',
        details: 'Going through difficult health challenges',
        is_anonymous: false,
        tags: ['healing', 'health']
      }

      const mockCreated = {
        id: 'prayer-1',
        ...newRequest,
        author_id: 'user-1',
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

      const result = await createPrayerRequest(newRequest)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_requests')
      expect(result).toEqual(mockCreated)
    })

    it('should handle validation errors', async () => {
      const invalidRequest = {
        title: '', // Empty title
        details: 'Some description',
        is_anonymous: false,
        tags: []
      }

      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnThis(),
        single: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Title is required' }
        })
      }))

      await expect(createPrayerRequest(invalidRequest)).rejects.toThrow('Failed to create prayer request')
    })
  })

  describe('listPrayerRequests', () => {
    it('should fetch open prayer requests', async () => {
      const mockRequests = [
        {
          id: 'prayer-1',
          title: 'Prayer for family',
          description: 'Please pray for my family',
          author_id: 'user-1',
          status: 'open',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockRequests,
          error: null
        })
      }))

      const result = await listPrayerRequests()

      expect(result.data).toEqual(mockRequests)
      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_requests')
    })

    it('should handle database errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Database error' }
        })
      }))

      const result = await listPrayerRequests()
      expect(result.error).toBeTruthy()
    })
  })

  describe('commitToPray', () => {
    it('should create prayer commitment successfully', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: null
        })
      }))

      await commitToPray(1)

      expect(global.mockSupabase.from).toHaveBeenCalledWith('prayer_commitments')
    })

    it('should handle duplicate commitment errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        insert: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'duplicate key value violates unique constraint' }
        })
      }))

      const result = await commitToPray(1)
      expect(result.error).toBeTruthy()
    })
  })

  describe('confirmPrayed', () => {
    it('should confirm prayer completion successfully', async () => {
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

    it('should handle permission errors', async () => {
      global.mockSupabase.from.mockImplementation(() => ({
        update: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Permission denied' }
        })
      }))

      await expect(confirmPrayed('commitment-1')).rejects.toThrow('Failed to confirm prayer')
    })
  })

  describe('getPrayerLeaderboard', () => {
    it('should fetch weekly leaderboard', async () => {
      const mockLeaderboard = [
        {
          user_id: 'user-1',
          username: 'john_doe',
          prayer_count: 15,
          streak: 7,
          rank: 1
        },
        {
          user_id: 'user-2',
          username: 'jane_smith',
          prayer_count: 12,
          streak: 5,
          rank: 2
        }
      ]

      global.mockSupabase.rpc.mockResolvedValue({
        data: mockLeaderboard,
        error: null
      })

      const result = await getPrayerLeaderboard('weekly')

      expect(global.mockSupabase.rpc).toHaveBeenCalledWith('get_prayer_leaderboard', {
        timeframe: 'weekly'
      })
      expect(result).toEqual(mockLeaderboard)
    })

    it('should handle invalid timeframe', async () => {
      global.mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: { message: 'Invalid timeframe' }
      })

      await expect(getPrayerLeaderboard('invalid')).rejects.toThrow('Failed to fetch leaderboard')
    })
  })

  describe('getUserPrayerStats', () => {
    it('should fetch user prayer statistics', async () => {
      const mockStats = {
        total_prayers: 45,
        current_streak: 7,
        longest_streak: 12,
        weekly_count: 15,
        monthly_count: 45,
        rank_weekly: 3,
        rank_monthly: 5
      }

      global.mockSupabase.rpc.mockResolvedValue({
        data: mockStats,
        error: null
      })

      const result = await getUserPrayerStats('user-1')

      expect(global.mockSupabase.rpc).toHaveBeenCalledWith('get_user_prayer_stats', {
        user_id: 'user-1'
      })
      expect(result).toEqual(mockStats)
    })
  })

  describe('searchPrayerRequests', () => {
    it('should search prayer requests by query', async () => {
      const mockResults = [
        {
          id: 'prayer-1',
          title: 'Healing prayer needed',
          description: 'Please pray for healing',
          tags: ['healing'],
          author_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        textSearch: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockResults,
          error: null
        })
      }))

      const result = await searchPrayerRequests('healing')

      expect(result).toEqual(mockResults)
    })

    it('should filter by tags', async () => {
      const mockResults = [
        {
          id: 'prayer-2',
          title: 'Family prayer request',
          tags: ['family'],
          author_id: 'user-1',
          created_at: '2024-01-01T00:00:00Z'
        }
      ]

      global.mockSupabase.from.mockImplementation(() => ({
        select: vi.fn().mockReturnThis(),
        contains: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockResolvedValue({
          data: mockResults,
          error: null
        })
      }))

      const result = await searchPrayerRequests('', { tags: ['family'] })

      expect(result).toEqual(mockResults)
    })
  })

  describe('updatePrayerRequest', () => {
    it('should update prayer request successfully', async () => {
      const updates = {
        title: 'Updated prayer request',
        description: 'Updated description'
      }

      const mockUpdated = {
        id: 'prayer-1',
        ...updates,
        author_id: 'user-1',
        status: 'open',
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

      const result = await updatePrayerRequest('prayer-1', updates)

      expect(result).toEqual(mockUpdated)
    })
  })
})