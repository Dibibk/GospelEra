import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll, vi } from 'vitest'
import { server } from '../mocks/server'

// Mock Supabase client for mobile
vi.mock('../../lib/supabaseClient', () => import('../mocks/supabaseClient'))

// Mock the useAuth hook for mobile
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: vi.fn(),
    signOut: vi.fn()
  })
}))

// Mock mobile-specific APIs
vi.mock('../../lib/posts', () => ({
  listPosts: vi.fn(),
  createPost: vi.fn(),
  updatePost: vi.fn(),
  softDeletePost: vi.fn()
}))

vi.mock('../../lib/engagement', () => ({
  toggleAmen: vi.fn(),
  toggleBookmark: vi.fn(),
  isBookmarked: vi.fn(),
  getAmenInfo: vi.fn()
}))

vi.mock('../../lib/comments', () => ({
  listComments: vi.fn(),
  createComment: vi.fn(),
  softDeleteComment: vi.fn()
}))

vi.mock('../../lib/prayer', () => ({
  listPrayerRequests: vi.fn(),
  createPrayerRequest: vi.fn(),
  commitToPray: vi.fn(),
  confirmPrayed: vi.fn(),
  getMyCommitments: vi.fn(),
  getPrayerRequest: vi.fn()
}))

vi.mock('../../lib/profiles', () => ({
  getProfilesByIds: vi.fn(),
  updateUserSettings: vi.fn(),
  getUserSettings: vi.fn(),
  upsertMyProfile: vi.fn(),
  ensureMyProfile: vi.fn()
}))

// Mock mobile-specific components  
vi.mock('../../components/ObjectUploader', () => ({
  ObjectUploader: vi.fn(({ onUpload }: { onUpload: (urls: string[]) => void }) => {
    // Simulate upload for tests
    setTimeout(() => onUpload(['test-image.jpg']), 0)
    return null
  })
}))

// Mock YouTube validation
vi.mock('../../../shared/youtube', () => ({
  validateAndNormalizeYouTubeUrl: vi.fn((url: string) => url)
}))

// Mock content moderation
vi.mock('../../../shared/moderation', () => ({
  validateFaithContent: vi.fn(() => ({ isValid: true, message: '' }))
}))

// Establish API mocking before all tests
beforeAll(() => server.listen())

// Reset any request handlers that we may add during the tests,
// so they don't affect other tests
afterEach(() => server.resetHandlers())

// Clean up after the tests are finished
afterAll(() => server.close())