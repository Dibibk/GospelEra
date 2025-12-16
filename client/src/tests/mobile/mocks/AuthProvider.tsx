import React, { createContext, useContext, useState } from 'react'

interface AuthContextType {
  user: any
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ error?: any }>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: React.ReactNode
  initialUser?: any
}

export const MockAuthProvider = ({ children, initialUser = null }: AuthProviderProps) => {
  const [user, setUser] = useState(initialUser)
  const [loading, setLoading] = useState(false)

  const signIn = async (email: string, password: string) => {
    setLoading(true)
    if (email === 'test@example.com' && password === 'password123' ||
        email === 'mobile@example.com' && password === 'password123') {
      const mockUser = { 
        id: email.includes('mobile') ? 'mobile-test-user-id' : 'test-user-id', 
        email 
      }
      setUser(mockUser)
      setLoading(false)
      return { error: null }
    }
    setLoading(false)
    return { error: { message: 'Invalid credentials' } }
  }

  const signOut = async () => {
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  )
}