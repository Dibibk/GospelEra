import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../../components/ProtectedRoute'
import { AuthProvider } from '../../hooks/useAuth'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual as any,
    useAuth: mockUseAuth,
  }
})

function TestComponent() {
  return <div data-testid="protected-content">Protected Content</div>
}

function renderProtectedRoute() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <ProtectedRoute>
            <TestComponent />
          </ProtectedRoute>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while checking authentication', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authTransition: 'idle'
    })

    renderProtectedRoute()

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should render protected content when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
      authTransition: 'idle'
    })

    renderProtectedRoute()

    await waitFor(() => {
      expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument()
  })

  it('should redirect to login when user is not authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authTransition: 'idle'
    })

    renderProtectedRoute()

    // Should not render protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
    expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument()
  })

  it('should show contextual loading during authentication transitions', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authTransition: 'signing-in'
    })

    renderProtectedRoute()

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    // Should show contextual loading message
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument()
  })

  it('should handle sign-out transition gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authTransition: 'signing-out'
    })

    renderProtectedRoute()

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.getByText(/signing you out/i)).toBeInTheDocument()
  })

  it('should handle authentication errors gracefully', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authTransition: 'idle',
      error: 'Authentication failed'
    })

    renderProtectedRoute()

    // Should handle error state appropriately
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument()
  })

  it('should show smooth transitions with Framer Motion', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', email: 'test@example.com' },
      loading: false,
      authTransition: 'idle'
    })

    renderProtectedRoute()

    await waitFor(() => {
      const protectedContent = screen.getByTestId('protected-content')
      expect(protectedContent).toBeInTheDocument()
      // Verify Framer Motion wrapper is applied
      expect(protectedContent.closest('[style]')).toBeInTheDocument()
    })
  })
})