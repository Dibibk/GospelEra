import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider, useAuth } from '../../hooks/useAuth'

// Create a test component that uses the useAuth hook
function TestComponent() {
  const { user, loading, signIn, signOut, authTransition } = useAuth()

  return (
    <div>
      <div data-testid="loading">{loading ? 'loading' : 'not-loading'}</div>
      <div data-testid="user">{user ? 'logged-in' : 'logged-out'}</div>
      <div data-testid="auth-transition">{authTransition}</div>
      <button onClick={() => signIn('test@example.com', 'password')}>Sign In</button>
      <button onClick={() => signOut()}>Sign Out</button>
    </div>
  )
}

function renderWithProviders(ui: React.ReactElement) {
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

describe('useAuth Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should start with loading state', () => {
    renderWithProviders(<TestComponent />)
    expect(screen.getByTestId('loading')).toHaveTextContent('loading')
    expect(screen.getByTestId('user')).toHaveTextContent('logged-out')
    expect(screen.getByTestId('auth-transition')).toHaveTextContent('idle')
  })

  it('should handle user session loading', async () => {
    // Mock a successful session retrieval
    const mockSession = {
      user: { id: 'test-user-id', email: 'test@example.com' },
      access_token: 'mock-token'
    }

    global.mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
      expect(screen.getByTestId('user')).toHaveTextContent('logged-in')
    })
  })

  it('should handle sign in with transition states', async () => {
    global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: { id: 'test-user', email: 'test@example.com' }, session: {} },
      error: null
    })

    renderWithProviders(<TestComponent />)

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    const signInButton = screen.getByText('Sign In')
    signInButton.click()

    // Should show signing-in transition state
    await waitFor(() => {
      expect(screen.getByTestId('auth-transition')).toHaveTextContent('signing-in')
    })

    // Eventually should return to idle
    await waitFor(() => {
      expect(screen.getByTestId('auth-transition')).toHaveTextContent('idle')
    }, { timeout: 2000 })
  })

  it('should handle sign out with transition states', async () => {
    // Start with logged in state
    const mockSession = {
      user: { id: 'test-user-id', email: 'test@example.com' },
      access_token: 'mock-token'
    }

    global.mockSupabase.auth.getSession.mockResolvedValue({
      data: { session: mockSession },
      error: null
    })

    global.mockSupabase.auth.signOut.mockResolvedValue({
      error: null
    })

    renderWithProviders(<TestComponent />)

    // Wait for user to be logged in
    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('logged-in')
    })

    const signOutButton = screen.getByText('Sign Out')
    signOutButton.click()

    // Should show signing-out transition state
    await waitFor(() => {
      expect(screen.getByTestId('auth-transition')).toHaveTextContent('signing-out')
    })

    // Eventually should return to idle
    await waitFor(() => {
      expect(screen.getByTestId('auth-transition')).toHaveTextContent('idle')
    }, { timeout: 2000 })
  })

  it('should handle authentication errors', async () => {
    global.mockSupabase.auth.signInWithPassword.mockResolvedValue({
      data: { user: null, session: null },
      error: { message: 'Invalid credentials' }
    })

    renderWithProviders(<TestComponent />)

    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('not-loading')
    })

    const signInButton = screen.getByText('Sign In')
    signInButton.click()

    await waitFor(() => {
      expect(screen.getByTestId('auth-transition')).toHaveTextContent('idle')
    })

    expect(global.mockSupabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password'
    })
  })

  it('should throw error when used outside AuthProvider', () => {
    // This should throw an error
    expect(() => {
      render(<TestComponent />)
    }).toThrow('useAuth must be used within an AuthProvider')
  })
})