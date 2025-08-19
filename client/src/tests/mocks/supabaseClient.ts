import { vi } from 'vitest'

// Mock auth state
let currentUser: any = null
let currentSession: any = null

// Helper functions for tests
export const __setAuthUser = (user: any, session: any = null) => {
  currentUser = user
  currentSession = session || {
    access_token: 'mock-token',
    user
  }
}

export const __clearAuth = () => {
  currentUser = null
  currentSession = null
}

// Mock Supabase client
const mockSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ 
      data: { session: currentSession }, 
      error: null 
    })),
    
    getUser: vi.fn(() => Promise.resolve({ 
      data: { user: currentUser }, 
      error: null 
    })),
    
    onAuthStateChange: vi.fn((callback) => {
      // Immediately call with current state
      callback('SIGNED_IN', currentSession)
      // Return unsubscribe function
      return {
        data: {
          subscription: {
            unsubscribe: vi.fn()
          }
        }
      }
    }),
    
    signInWithPassword: vi.fn(({ email, password }) => {
      if (email === 'test@example.com' && password === 'password123') {
        const user = {
          id: 'test-user-id',
          email: 'test@example.com'
        }
        __setAuthUser(user)
        return Promise.resolve({ 
          data: { user, session: currentSession }, 
          error: null 
        })
      }
      return Promise.resolve({ 
        data: { user: null, session: null }, 
        error: { message: 'Invalid credentials' }
      })
    }),
    
    signOut: vi.fn(() => {
      __clearAuth()
      return Promise.resolve({ error: null })
    })
  },
  
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 1, name: 'Test' }, 
          error: null 
        }))
      }))
    })),
    
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 1 }, 
          error: null 
        }))
      }))
    })),
    
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 1 }, 
            error: null 
          }))
        }))
      }))
    }))
  }))
}

export default mockSupabase