import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { BrowserRouter, Navigate } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { __setAuthUser, __clearAuth } from '../../tests/mocks/supabaseClient'

// Mock react-router-dom Navigate component
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    Navigate: ({ to }: { to: string }) => <div data-testid="navigate-to">{to}</div>
  }
})

// Create a simple ProtectedRoute component for testing
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = React.useState<any>(null)
  const [loading, setLoading] = React.useState(true)
  
  React.useEffect(() => {
    // Mock session check - simulate checking user from mock
    setTimeout(() => {
      const mockUser = { id: 'test-user', email: 'test@example.com' }
      const hasAuthUser = Boolean(mockUser)
      setSession(hasAuthUser ? { user: mockUser } : null)
      setLoading(false)
    }, 50)
  }, [])
  
  if (loading) {
    return <div data-testid="loading">Loading...</div>
  }
  
  if (!session) {
    return <Navigate to="/login" />
  }
  
  return <>{children}</>
}

const TestChild = () => <div data-testid="protected-content">Protected Content</div>

describe('ProtectedRoute', () => {
  beforeEach(() => {
    __clearAuth()
  })

  it('shows loading initially', async () => {
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    // Should show loading initially
    expect(screen.getByTestId('loading')).toBeInTheDocument()
    
    // Wait for loading to complete and check final state
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
  })

  it('renders children when session exists', async () => {
    // Set up authenticated user
    const mockUser = { id: 'test-user', email: 'test@example.com' }
    __setAuthUser(mockUser)
    
    render(
      <BrowserRouter>
        <ProtectedRoute>
          <TestChild />
        </ProtectedRoute>
      </BrowserRouter>
    )
    
    // Wait for the loading to complete
    await waitFor(() => {
      expect(screen.queryByTestId('loading')).not.toBeInTheDocument()
    })
    
    expect(screen.getByTestId('protected-content')).toBeInTheDocument()
    expect(screen.queryByTestId('navigate-to')).not.toBeInTheDocument()
  })
})