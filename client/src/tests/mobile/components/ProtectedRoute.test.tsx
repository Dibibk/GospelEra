import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { ProtectedRoute } from '../../../components/ProtectedRoute'
import { AuthProvider } from '../../../hooks/useAuth'

// Mock the useAuth hook
const mockUseAuth = vi.fn()
vi.mock('../../../hooks/useAuth', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual as any,
    useAuth: mockUseAuth,
  }
})

function TestMobileComponent() {
  return <div data-testid="mobile-protected-content">Mobile Protected Content</div>
}

function renderMobileProtectedRoute() {
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
            <TestMobileComponent />
          </ProtectedRoute>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  )
}

describe('ProtectedRoute Component - Mobile', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should show loading state while checking mobile authentication', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authTransition: 'idle'
    })

    renderMobileProtectedRoute()

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-protected-content')).not.toBeInTheDocument()
  })

  it('should render mobile protected content when user is authenticated', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'mobile-user-1', email: 'mobile@example.com' },
      loading: false,
      authTransition: 'idle'
    })

    renderMobileProtectedRoute()

    await waitFor(() => {
      expect(screen.getByTestId('mobile-protected-content')).toBeInTheDocument()
    })

    expect(screen.queryByTestId('auth-loading')).not.toBeInTheDocument()
  })

  it('should handle mobile-specific authentication states', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: true,
      authTransition: 'signing-in'
    })

    renderMobileProtectedRoute()

    expect(screen.getByTestId('auth-loading')).toBeInTheDocument()
    expect(screen.getByText(/signing you in/i)).toBeInTheDocument()
  })

  it('should handle mobile authentication errors', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      loading: false,
      authTransition: 'idle',
      error: 'Mobile authentication failed'
    })

    renderMobileProtectedRoute()

    expect(screen.queryByTestId('mobile-protected-content')).not.toBeInTheDocument()
  })

  it('should work with mobile app navigation', async () => {
    mockUseAuth.mockReturnValue({
      user: { id: 'mobile-user-1', email: 'mobile@example.com' },
      loading: false,
      authTransition: 'idle'
    })

    renderMobileProtectedRoute()

    await waitFor(() => {
      const protectedContent = screen.getByTestId('mobile-protected-content')
      expect(protectedContent).toBeInTheDocument()
      // Verify mobile component is rendered correctly
      expect(protectedContent).toHaveTextContent('Mobile Protected Content')
    })
  })
})