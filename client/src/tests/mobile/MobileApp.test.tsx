import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import MobileApp from '../../pages/MobileApp'
import { MockAuthProvider } from '../mocks/AuthProvider'

// Mock all mobile app dependencies
const mockListPosts = vi.fn()
const mockListPrayerRequests = vi.fn()
const mockGetProfilesByIds = vi.fn()
const mockCheckMediaPermission = vi.fn()
const mockGetDailyVerse = vi.fn()

vi.mock('../../lib/posts', () => ({
  listPosts: mockListPosts,
  createPost: vi.fn(),
  updatePost: vi.fn(),
  softDeletePost: vi.fn()
}))

vi.mock('../../lib/prayer', () => ({
  listPrayerRequests: mockListPrayerRequests,
  createPrayerRequest: vi.fn(),
  commitToPray: vi.fn(),
  confirmPrayed: vi.fn(),
  getMyCommitments: vi.fn(),
  getPrayerRequest: vi.fn()
}))

vi.mock('../../lib/profiles', () => ({
  getProfilesByIds: mockGetProfilesByIds,
  updateUserSettings: vi.fn(),
  getUserSettings: vi.fn(),
  upsertMyProfile: vi.fn(),
  ensureMyProfile: vi.fn()
}))

vi.mock('../../lib/mediaRequests', () => ({
  checkMediaPermission: mockCheckMediaPermission
}))

vi.mock('../../lib/scripture', () => ({
  getDailyVerse: mockGetDailyVerse
}))

vi.mock('../../lib/engagement', () => ({
  toggleAmen: vi.fn(),
  toggleBookmark: vi.fn(),
  isBookmarked: vi.fn(() => Promise.resolve({ isBookmarked: false })),
  getAmenInfo: vi.fn(() => Promise.resolve({ data: {} }))
}))

vi.mock('../../lib/comments', () => ({
  listComments: vi.fn(),
  createComment: vi.fn(),
  softDeleteComment: vi.fn()
}))

vi.mock('../../lib/leaderboard', () => ({
  getTopPrayerWarriors: vi.fn()
}))

vi.mock('../../hooks/useRole', () => ({
  useRole: () => ({
    isBanned: false,
    isAdmin: false
  })
}))

const mockSignIn = vi.fn()
const mockSignOut = vi.fn()

vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-user-id', email: 'test@example.com' },
    loading: false,
    signIn: mockSignIn,
    signOut: mockSignOut
  })
}))

const MobileAppWithProviders = () => (
  <MockAuthProvider initialUser={{ id: 'test-user-id', email: 'test@example.com' }}>
    <MobileApp />
  </MockAuthProvider>
)

describe('MobileApp', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    
    // Setup default mock responses
    mockListPosts.mockResolvedValue([
      {
        id: 1,
        title: 'Test Post',
        content: 'Test content',
        userId: 'test-user-id',
        created_at: new Date().toISOString(),
        tags: ['test'],
        media_urls: []
      }
    ])
    
    mockListPrayerRequests.mockResolvedValue({
      data: [
        {
          id: 1,
          title: 'Test Prayer',
          details: 'Please pray for this',
          author_id: 'test-user-id',
          created_at: new Date().toISOString(),
          tags: ['healing']
        }
      ]
    })
    
    mockGetProfilesByIds.mockResolvedValue({
      'test-user-id': {
        id: 'test-user-id',
        display_name: 'Test User',
        avatar_url: null
      }
    })
    
    mockCheckMediaPermission.mockResolvedValue({ hasPermission: true })
    mockGetDailyVerse.mockResolvedValue({
      reference: 'John 3:16',
      text: 'For God so loved the world...'
    })
  })

  it('renders mobile app interface', async () => {
    render(<MobileAppWithProviders />)
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Check main mobile interface elements
    expect(screen.getByText('Gospel Era')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /home/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /prayer/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /create/i })).toBeInTheDocument()
  })

  it('loads and displays posts on home tab', async () => {
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(mockListPosts).toHaveBeenCalled()
      expect(screen.getByText('Test Post')).toBeInTheDocument()
      expect(screen.getByText('Test content')).toBeInTheDocument()
    })
  })

  it('switches between tabs correctly', async () => {
    const user = userEvent.setup()
    render(<MobileAppWithProviders />)
    
    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    
    // Click prayer tab
    const prayerTab = screen.getByRole('button', { name: /prayer/i })
    await user.click(prayerTab)
    
    await waitFor(() => {
      expect(mockListPrayerRequests).toHaveBeenCalled()
      expect(screen.getByText('Test Prayer')).toBeInTheDocument()
    })
  })

  it('opens create post modal', async () => {
    const user = userEvent.setup()
    render(<MobileAppWithProviders />)
    
    // Wait for loading
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Click create button
    const createButton = screen.getByRole('button', { name: /create/i })
    await user.click(createButton)
    
    // Should show create post form
    expect(screen.getByText('Create New Post')).toBeInTheDocument()
    expect(screen.getByLabelText(/post title/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/content/i)).toBeInTheDocument()
  })

  it('handles search functionality', async () => {
    const user = userEvent.setup()
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    
    // Find and use search input
    const searchInput = screen.getByPlaceholderText(/search posts/i)
    await user.type(searchInput, 'test')
    
    // Search should filter posts
    expect(searchInput).toHaveValue('test')
  })

  it('displays daily scripture verse', async () => {
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(mockGetDailyVerse).toHaveBeenCalled()
      expect(screen.getByText('John 3:16')).toBeInTheDocument()
      expect(screen.getByText(/For God so loved the world/)).toBeInTheDocument()
    })
  })

  it('handles user interaction with posts', async () => {
    const user = userEvent.setup()
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(screen.getByText('Test Post')).toBeInTheDocument()
    })
    
    // Should show engagement buttons
    const amenButton = screen.getByLabelText(/amen/i)
    const bookmarkButton = screen.getByLabelText(/bookmark/i)
    
    expect(amenButton).toBeInTheDocument()
    expect(bookmarkButton).toBeInTheDocument()
    
    // Test interaction
    await user.click(amenButton)
    // Amen interaction should be handled (mocked)
  })

  it('opens user profile dropdown', async () => {
    const user = userEvent.setup()
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Click user avatar/profile button
    const profileButton = screen.getByRole('button', { name: /profile/i })
    await user.click(profileButton)
    
    // Should show dropdown options
    expect(screen.getByText(/profile/i)).toBeInTheDocument()
    expect(screen.getByText(/settings/i)).toBeInTheDocument()
    expect(screen.getByText(/sign out/i)).toBeInTheDocument()
  })

  it('handles sign out functionality', async () => {
    const user = userEvent.setup()
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Open profile dropdown and click sign out
    const profileButton = screen.getByRole('button', { name: /profile/i })
    await user.click(profileButton)
    
    const signOutButton = screen.getByText(/sign out/i)
    await user.click(signOutButton)
    
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('handles responsive mobile layout', () => {
    render(<MobileAppWithProviders />)
    
    // Check that mobile-specific styles are applied
    const container = screen.getByTestId('mobile-app-container')
    expect(container).toHaveStyle('min-height: 100vh')
  })

  it('handles error states gracefully', async () => {
    // Mock API failure
    mockListPosts.mockRejectedValue(new Error('API Error'))
    
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      // Should handle error gracefully without crashing
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
  })

  it('shows banned user restrictions', async () => {
    // Mock banned user
    vi.mocked(vi.importActual('../../hooks/useRole')).useRole = () => ({
      isBanned: true,
      isAdmin: false
    })
    
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      // Should show restriction banner
      expect(screen.getByText(/account limited/i)).toBeInTheDocument()
    })
  })

  it('shows admin options for admin users', async () => {
    const user = userEvent.setup()
    
    // Mock admin user
    vi.mocked(vi.importActual('../../hooks/useRole')).useRole = () => ({
      isBanned: false,
      isAdmin: true
    })
    
    render(<MobileAppWithProviders />)
    
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })
    
    // Open profile dropdown
    const profileButton = screen.getByRole('button', { name: /profile/i })
    await user.click(profileButton)
    
    // Should show admin options
    expect(screen.getByText(/admin dashboard/i)).toBeInTheDocument()
    expect(screen.getByText(/review reports/i)).toBeInTheDocument()
  })
})