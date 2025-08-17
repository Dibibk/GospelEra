import { useAuth } from './useAuth'
import { useQuery } from '@tanstack/react-query'

export interface UserRole {
  role: 'admin' | 'user' | 'banned' | null
  isLoading: boolean
  isBanned: boolean
  isAdmin: boolean
}

/**
 * Lightweight hook to get user role information
 * Returns role status and helper booleans for UI logic
 */
export function useRole(): UserRole {
  const { user } = useAuth()
  
  const { data: userProfile, isLoading } = useQuery({
    queryKey: ['/api/profiles', user?.id],
    enabled: !!user?.id,
  })

  const role = (userProfile as any)?.role || null
  
  return {
    role,
    isLoading,
    isBanned: role === 'banned',
    isAdmin: role === 'admin'
  }
}