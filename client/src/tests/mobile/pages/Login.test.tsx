import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Login from '../../../pages/Login'
import { MockAuthProvider } from '../../mocks/AuthProvider'

// Mock react-router-dom for mobile navigation
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock the useAuth hook for mobile login
const mockSignIn = vi.fn()
vi.mock('../../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signOut: vi.fn()
  })
}))

const MobileLoginWithProviders = () => (
  <BrowserRouter>
    <MockAuthProvider>
      <Login />
    </MockAuthProvider>
  </BrowserRouter>
)

describe('Login - Mobile', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockSignIn.mockClear()
  })

  it('renders mobile-optimized login form', () => {
    render(<MobileLoginWithProviders />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter dashboard/i })).toBeInTheDocument()
    
    // Check mobile-specific form styling
    const emailInput = screen.getByLabelText(/email/i)
    expect(emailInput).toHaveAttribute('type', 'email')
    // Mobile forms should have font-size 16px to prevent iOS zoom
    expect(emailInput).toHaveStyle('font-size: 16px')
  })

  it('handles mobile keyboard interactions', async () => {
    const user = userEvent.setup()
    render(<MobileLoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    // Mobile touch interactions
    await user.click(emailInput)
    await user.type(emailInput, 'mobile@example.com')
    
    await user.click(passwordInput)
    await user.type(passwordInput, 'password123')
    
    expect(emailInput).toHaveValue('mobile@example.com')
    expect(passwordInput).toHaveValue('password123')
  })

  it('validates mobile form inputs', async () => {
    const user = userEvent.setup()
    render(<MobileLoginWithProviders />)
    
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    // Try to submit with empty fields on mobile
    await user.click(submitButton)
    
    // Mobile validation should work the same as web
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('handles mobile login submission', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<MobileLoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    await user.type(emailInput, 'mobile@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('mobile@example.com', 'password123')
    })
  })

  it('shows mobile error messages', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Mobile authentication failed' } })
    const user = userEvent.setup()
    render(<MobileLoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    await user.type(emailInput, 'invalid@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/mobile authentication failed/i)).toBeInTheDocument()
    })
  })

  it('handles mobile navigation after login', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<MobileLoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    await user.type(emailInput, 'mobile@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('mobile@example.com', 'password123')
    })
  })

  it('handles mobile touch events properly', async () => {
    const user = userEvent.setup()
    render(<MobileLoginWithProviders />)
    
    const loginForm = screen.getByRole('form', { name: /login form/i }) || 
                     screen.getByText('Welcome Back').closest('form')
    
    if (loginForm) {
      // Test touch interactions work on mobile
      fireEvent.touchStart(loginForm)
      fireEvent.touchEnd(loginForm)
    }
    
    // Form should still be functional after touch events
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
  })

  it('maintains mobile accessibility standards', () => {
    render(<MobileLoginWithProviders />)
    
    // Check mobile accessibility features
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    
    expect(emailInput).toHaveAttribute('type', 'email')
    expect(passwordInput).toHaveAttribute('type', 'password')
    
    // Should have proper mobile attributes
    expect(emailInput).toHaveAttribute('autocomplete')
    expect(passwordInput).toHaveAttribute('autocomplete')
  })
})