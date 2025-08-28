import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../../../hooks/useAuth'

// Mobile-specific test component
function MobileTestComponent() {
  const { user, loading, signIn, signOut, authTransition } = useAuth()

  return (
    <div>
      <div data-testid="mobile-loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="mobile-user">{user ? 'logged-in' : 'logged-out'}</div>
      <div data-testid="mobile-auth-transition">{authTransition}</div>
      <button onClick={() => signIn('mobile@example.com', 'password')}>Mobile Sign In</button>
      <button onClick={() => signOut()}>Mobile Sign Out</button>
    </div>
  )
}

function renderMobileWithProviders(ui: React.ReactElement) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {ui}
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('useAuth Hook - Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with mobile loading state', () => {
    renderMobileWithProviders(<MobileTestComponent />)
    expect(screen.getByTestId('mobile-loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('mobile-user')).toHaveTextContent('logged-out')
    expect(screen.getByTestId('mobile-auth-transition')).toHaveTextContent('idle')
  })

  it('should handle mobile user session loading', async () => {
    // Mock a successful mobile session
    const mockMobileSession = {
      user: { id: 'mobile-user-id', email: 'mobile@example.com' },
      access_token: 'mobile-token'
    }

    global.mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockMobileSession },
      error: null
    })

    renderMobileWithProviders(<MobileTestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('mobile-loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('mobile-user')).toHaveTextContent('logged-in')
    })
  })

  it('should handle mobile sign in with touch interaction', async () => {
    global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'mobile-user', email: 'mobile@example.com' }, session: {} },
      error: null
    })

    renderMobileWithProviders(<MobileTestComponent />)

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('mobile-loading')).toHaveTextContent('not-loading')
    })

    const mobileSignInButton = screen.getByText('Mobile Sign In')
    mobileSignInButton.click()

    // Should show mobile signing-in transition state
    await waitFor(() => {
      expect(screen.getByTestId('mobile-auth-transition')).toHaveTextContent('signing-in')
    })

    // Eventually should return to idle
    await waitFor(() => {
      expect(screen.getByTestId('mobile-auth-transition')).toHaveTextContent('idle')
    }, { timeout: 2000 })
  })

  it('should handle mobile sign out', async () => {
    // Start with mobile logged in state
    const mockMobileSession = {
      user: { id: 'mobile-user-id', email: 'mobile@example.com' },
      access_token: 'mobile-token'
    }

    global.mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockMobileSession },
      error: null
    })

    global.mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    renderMobileWithProviders(<MobileTestComponent />)

    // Wait for user to be logged in
    await waitFor(() => {
      expect(screen.getByTestId('mobile-user')).toHaveTextContent('logged-in')
    })

    const mobileSignOutButton = screen.getByText('Mobile Sign Out')
    mobileSignOutButton.click()

    // Should show mobile signing-out transition state
    await waitFor(() => {
      expect(screen.getByTestId('mobile-auth-transition')).toHaveTextContent('signing-out')
    })

    // Eventually should return to idle
    await waitFor(() => {
      expect(screen.getByTestId('mobile-auth-transition')).toHaveTextContent('idle')
    }, { timeout: 2000 })
  })

  it('should handle mobile authentication errors', async () => {
    global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Mobile network error' }
    })

    renderMobileWithProviders(<MobileTestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('mobile-loading')).toHaveTextContent('not-loading')
    })

    const mobileSignInButton = screen.getByText('Mobile Sign In')
    mobileSignInButton.click()

    await waitFor(() => {
      expect(screen.getByTestId('mobile-auth-transition')).toHaveTextContent('idle')
    })

    expect(global.mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'mobile@example.com',
      password: 'password'
    })
  })

  it('should work properly on mobile devices', async () => {
    // Mock mobile user agent
    Object.defineProperty(window.navigator, 'userAgent', {
      value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
      writable: true
    })

    const mockMobileSession = {
      user: { id: 'mobile-user-id', email: 'mobile@example.com' },
      access_token: 'mobile-token'
    }

    global.mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockMobileSession },
      error: null
    })

    renderMobileWithProviders(<MobileTestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('mobile-user')).toHaveTextContent('logged-in')
    })

    // Should work on mobile devices
    expect(screen.getByTestId('mobile-loading')).toHaveTextContent('not-loading')
  })

  it('should throw error when used outside mobile AuthProvider', () => {
    // This should throw an error when used outside provider
    expect(() => {
      render(<MobileTestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})