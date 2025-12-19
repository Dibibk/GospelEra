import { vi } from 'vitest'

// Mock auth state for mobile
let currentMobileUser: any = null
let currentMobileSession: any = null

// Helper functions for mobile tests
export const __setMobileAuthUser = (user: any, session: any = null) => {
  currentMobileUser = user
  currentMobileSession = session || {
    access_token: 'mobile-mock-token',
    user
  }
}

export const __clearMobileAuth = () => {
  currentMobileUser = null
  currentMobileSession = null
}

// Mock Supabase client for mobile
const mockMobileSupabase = {
  auth: {
    getSession: vi.fn(() => Promise.resolve({ 
      data: { session: currentMobileSession }, 
      error: null 
    })),
    
    getUser: vi.fn(() => Promise.resolve({ 
      data: { user: currentMobileUser }, 
      error: null 
    })),
    
    onAuthStateChange: vi.fn((callback) => {
      // Immediately call with current mobile state
      callback('SIGNED_IN', currentMobileSession)
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
      if ((email === 'test@example.com' || email === 'mobile@example.com') && password === 'password123') {
        const user = {
          id: email.includes('mobile') ? 'mobile-test-user-id' : 'test-user-id',
          email
        }
        __setMobileAuthUser(user)
        return Promise.resolve({ 
          data: { user, session: currentMobileSession }, 
          error: null 
        })
      }
      return Promise.resolve({ 
        data: { user: null, session: null }, 
        error: { message: 'Invalid credentials' }
      })
    }),
    
    signOut: vi.fn(() => {
      __clearMobileAuth()
      return Promise.resolve({ error: null })
    })
  },
  
  from: vi.fn((table: string) => ({
    select: vi.fn(() => ({
      eq: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 1, name: 'Mobile Test' }, 
          error: null 
        })),
        order: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve({
            data: [{ id: 1, name: 'Mobile Test' }],
            error: null
          }))
        }))
      })),
      in: vi.fn(() => Promise.resolve({
        data: [{ id: 1, name: 'Mobile Test' }],
        error: null
      })),
      order: vi.fn(() => ({
        limit: vi.fn(() => Promise.resolve({
          data: [{ id: 1, name: 'Mobile Test' }],
          error: null
        }))
      })),
      limit: vi.fn(() => Promise.resolve({
        data: [{ id: 1, name: 'Mobile Test' }],
        error: null
      }))
    })),
    
    insert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 1, mobile_created: true }, 
          error: null 
        }))
      }))
    })),
    
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        select: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ 
            data: { id: 1, mobile_updated: true }, 
            error: null 
          }))
        }))
      }))
    })),

    upsert: vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn(() => Promise.resolve({
          data: { id: 1, mobile_upserted: true },
          error: null
        }))
      }))
    }))
  })),

  rpc: vi.fn((functionName: string, params?: any) => {
    return Promise.resolve({
      data: { mobile_rpc_result: true, function: functionName },
      error: null
    })
  })
}

// Make it available globally for mobile tests
declare global {
  var mockMobileSupabase: typeof mockMobileSupabase
}

global.mockMobileSupabase = mockMobileSupabase

export default mockMobileSupabase