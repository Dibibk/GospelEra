import { supabase } from './supabaseClient'

interface UpsertProfileData {
  display_name?: string
  bio?: string
  avatar_url?: string
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
 * @returns {Promise<{data: Profile|null, error: Error|null}>}
 */
export async function getMyProfile() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to get profile')
    }

    // Fetch profile
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle()

    if (error) {
      throw new Error(`Failed to fetch profile: ${error.message}`)
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Creates or updates the current authenticated user's profile
 * @param {Object} profileData - The profile data to upsert
 * @param {string} profileData.display_name - Display name (optional)
 * @param {string} profileData.bio - User bio (optional)
 * @param {string} profileData.avatar_url - Avatar URL (optional)
 * @returns {Promise<{data: Profile|null, error: Error|null}>}
 */
export async function upsertMyProfile({ display_name, bio, avatar_url }: UpsertProfileData) {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to update profile')
    }

    // Validate display name if provided (2-40 characters)
    if (display_name !== undefined) {
      const trimmed = display_name.trim()
      if (trimmed.length < 2 || trimmed.length > 40) {
        throw new Error('Display name must be between 2 and 40 characters')
      }
    }

    // Prepare update data (only include defined fields)
    const updateData: any = { id: user.id }
    if (display_name !== undefined) updateData.display_name = display_name
    if (bio !== undefined) updateData.bio = bio
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url

    // Upsert profile
    const { data, error } = await supabase
      .from('profiles')
      .upsert(updateData)
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to update profile: ${error.message}`)
    }

    return { data, error: null }
  } catch (err) {
    return { data: null, error: err }
  }
}

/**
 * Batch fetch profiles by user IDs
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

    // Fetch profiles
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .in('id', uniqueIds)

    if (error) {
      throw new Error(`Failed to fetch profiles: ${error.message}`)
    }

    // Convert to Map for easy lookup
    const profileMap = new Map<string, Profile>()
    if (data) {
      data.forEach(profile => {
        profileMap.set(profile.id, profile)
      })
    }

    return { data: profileMap, error: null }
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