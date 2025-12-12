import { supabase } from './supabaseClient'
import { getApiBaseUrl } from './posts'

interface UpsertProfileData {
  display_name?: string
  bio?: string
  avatar_url?: string
  show_name_on_prayers?: boolean
  private_profile?: boolean
}

interface Profile {
  id: string
  display_name: string
  bio?: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

/**
 * Gets the current authenticated user's profile
 * Uses API endpoint to query Neon database (profiles are in Neon, not Supabase)
 * @returns {Promise<{data: Profile|null, error: Error|null}>}
 */
export async function getMyProfile() {
  try {
    // Get current user and session
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to get profile')
    }

    const { data: { session } } = await supabase.auth.getSession()
    
    // Fetch profile from API (Neon database)
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/profiles/${user.id}`, {
      headers: session?.access_token ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {}
    })

    if (response.status === 404) {
      // Profile doesn't exist yet - return null (not an error)
      return { data: null, error: null }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`)
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Creates or updates the current authenticated user's profile
 * SECURITY: Uses server-side API to prevent privilege escalation
 * @param {Object} profileData - The profile data to upsert
 * @param {string} profileData.display_name - Display name (optional)
 * @param {string} profileData.bio - User bio (optional)
 * @param {string} profileData.avatar_url - Avatar URL (optional)
 * @returns {Promise<{data: Profile|null, error: Error|null}>}
 */
export async function upsertMyProfile({ display_name, bio, avatar_url, show_name_on_prayers, private_profile }: UpsertProfileData) {
  try {
    // Get current user and auth token
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`)
    }
    
    if (!session) {
      throw new Error('User must be authenticated to update profile')
    }

    // Prepare update data (only include defined fields)
    const updateData: any = {}
    if (display_name !== undefined) updateData.display_name = display_name
    if (bio !== undefined) updateData.bio = bio
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (show_name_on_prayers !== undefined) updateData.show_name_on_prayers = show_name_on_prayers
    if (private_profile !== undefined) updateData.private_profile = private_profile

    // Call server-side API to update profile
    // Server validates that protected fields (role, media_enabled) are not modified
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update profile')
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Batch fetch profiles by user IDs
 * Uses API endpoint to query Neon database (profiles are in Neon, not Supabase)
 * @param {string[]} ids - Array of user IDs to fetch
 * @returns {Promise<{data: Map<string, Profile>|null, error: Error|null}>}
 */
export async function getProfilesByIds(ids: string[]) {
  try {
    if (!ids || ids.length === 0) {
      return { data: new Map(), error: null }
    }

    // Remove duplicates
    const uniqueIds = Array.from(new Set(ids))
    const baseUrl = getApiBaseUrl()

    // Fetch profiles individually from API (Neon database)
    const profilePromises = uniqueIds.map(async (id) => {
      try {
        const response = await fetch(`${baseUrl}/api/profiles/${id}`)
        if (response.ok) {
          return await response.json()
        }
        return null
      } catch {
        return null
      }
    })

    const profiles = await Promise.all(profilePromises)

    // Convert to Map for easy lookup
    const profileMap = new Map<string, Profile>()
    profiles.forEach(profile => {
      if (profile && profile.id) {
        profileMap.set(profile.id, profile)
      }
    })

    return { data: profileMap, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Gets a profile by user ID (public, for viewing other users)
 * Uses API endpoint to query Neon database (profiles are in Neon, not Supabase)
 * @param {string} userId - The user ID to fetch profile for
 * @returns {Promise<{data: Profile|null, error: Error|null}>}
 */
export async function getProfileById(userId: string) {
  try {
    if (!userId) {
      throw new Error('User ID is required')
    }

    // Fetch profile from API (Neon database)
    const baseUrl = getApiBaseUrl()
    const response = await fetch(`${baseUrl}/api/profiles/${userId}`)

    if (response.status === 404) {
      // Profile doesn't exist - return null
      return { data: null, error: null }
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch profile: ${response.statusText}`)
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Ensures the current user has a profile, creating one if missing
 * Creates a basic profile with display_name set to user's email
 * @returns {Promise<{data: Profile|null, error: Error|null}>}
 */
export async function ensureMyProfile() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to ensure profile')
    }

    // Check if profile exists
    const { data: existingProfile, error: fetchError } = await getMyProfile()
    
    if (fetchError) {
      throw fetchError
    }

    // If profile exists, return it
    if (existingProfile) {
      return { data: existingProfile, error: null }
    }

    // Create new profile with basic info
    const { data, error } = await upsertMyProfile({
      display_name: user.email || 'User'
    })

    if (error) {
      throw error
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Updates user settings in the profile
 * SECURITY: Uses server-side API to prevent privilege escalation
 * @param {Object} settings - The settings object to save
 * @returns {Promise<{data: any|null, error: Error|null}>}
 */
export async function updateUserSettings(settings: Record<string, any>) {
  try {
    // Get current session
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError) {
      throw new Error(`Authentication error: ${sessionError.message}`)
    }
    
    if (!session) {
      throw new Error('User must be authenticated to update settings')
    }

    // Call server-side API to update settings
    const baseUrl = getApiBaseUrl();
    const response = await fetch(`${baseUrl}/api/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({ settings })
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || 'Failed to update settings')
    }

    const data = await response.json()
    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Gets user settings from the profile
 * Uses getMyProfile to fetch from Neon database
 * @returns {Promise<{data: Record<string, any>|null, error: Error|null}>}
 */
export async function getUserSettings() {
  try {
    // Use getMyProfile which queries the API (Neon database)
    const { data: profile, error } = await getMyProfile()
    
    if (error) {
      throw error
    }

    return { data: profile?.settings || {}, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}