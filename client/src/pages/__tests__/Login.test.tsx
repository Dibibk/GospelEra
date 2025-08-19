import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import Login from '../Login'
import { MockAuthProvider } from '../../tests/mocks/AuthProvider'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock the useAuth hook specifically for Login component
const mockSignIn = vi.fn()
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    loading: false,
    signIn: mockSignIn,
    signOut: vi.fn()
  })
}))

const LoginWithProviders = () => (
  <BrowserRouter>
    <MockAuthProvider>
      <Login />
    </MockAuthProvider>
  </BrowserRouter>
)

describe('Login', () => {
  beforeEach(() => {
    mockNavigate.mockClear()
    mockSignIn.mockClear()
  })

  it('renders login form', () => {
    render(<LoginWithProviders />)
    
    expect(screen.getByText('Welcome Back')).toBeInTheDocument()
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter dashboard/i })).toBeInTheDocument()
  })

  it('validates email and password fields', async () => {
    const user = userEvent.setup()
    render(<LoginWithProviders />)
    
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    // Try to submit with empty fields
    await user.click(submitButton)
    
    // Since HTML5 validation is used, the form won't submit with empty required fields
    // We can check that the mock function wasn't called
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('calls signInWithPassword on form submission', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<LoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    // The mock supabase client should be called
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })

  it('shows error message on login failure', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })
    const user = userEvent.setup()
    render(<LoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    // Use invalid credentials
    await user.type(emailInput, 'invalid@example.com')
    await user.type(passwordInput, 'wrongpassword')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument()
    })
  })

  it('calls signIn on successful submission', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    const user = userEvent.setup()
    render(<LoginWithProviders />)
    
    const emailInput = screen.getByLabelText(/email/i)
    const passwordInput = screen.getByLabelText(/password/i)
    const submitButton = screen.getByRole('button', { name: /enter dashboard/i })
    
    await user.type(emailInput, 'test@example.com')
    await user.type(passwordInput, 'password123')
    await user.click(submitButton)
    
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123')
    })
  })
})