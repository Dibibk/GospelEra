import { supabase } from './supabaseClient'

/**
 * Uploads an avatar file to Supabase storage
 * @param {File} file - The file to upload
 * @returns {Promise<{url: string|null, error: Error|null}>}
 */
export async function uploadAvatar(file) {
  try {
    // Validate file size (< 1MB)
    if (file.size > 1048576) {
      throw new Error('File size must be less than 1MB')
    }

    // Validate file type (png/jpg/webp)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      throw new Error('File must be PNG, JPG, or WebP format')
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to upload avatar')
    }

    // Get file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    
    // Create file path: avatars/{auth.uid()}/avatar.{ext}
    const filePath = `avatars/${user.id}/avatar.${fileExt}`

    // Upload file to Supabase storage (this will overwrite existing file)
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true // This allows overwriting
      })

    if (error) {
      throw new Error(`Failed to upload avatar: ${error.message}`)
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath)

    return { url: publicUrl, error: null }
  } catch (err) {
    return { url: null, error: err }
  }
}

/**
 * Removes the current user's avatar from storage and clears avatar_url in profile
 * @returns {Promise<{success: boolean, error: Error|null}>}
 */
export async function removeAvatar() {
  try {
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (userError) {
      throw new Error(`Authentication error: ${userError.message}`)
    }
    
    if (!user) {
      throw new Error('User must be authenticated to remove avatar')
    }

    // Get current profile to check if avatar exists
    const { data: profile } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .single()

    // If no avatar_url, nothing to remove
    if (!profile?.avatar_url) {
      return { success: true, error: null }
    }

    // List all files in the user's avatar directory to find what to delete
    const { data: files, error: listError } = await supabase.storage
      .from('avatars')
      .list(`avatars/${user.id}`, {
        limit: 10,
        offset: 0
      })

    if (listError && listError.message !== 'The resource was not found') {
      throw new Error(`Failed to list avatar files: ${listError.message}`)
    }

    // Delete all avatar files for the user
    if (files && files.length > 0) {
      const filesToDelete = files
        .filter(file => file.name.startsWith('avatar.'))
        .map(file => `avatars/${user.id}/${file.name}`)

      if (filesToDelete.length > 0) {
        const { error: deleteError } = await supabase.storage
          .from('avatars')
          .remove(filesToDelete)

        if (deleteError) {
          throw new Error(`Failed to delete avatar files: ${deleteError.message}`)
        }
      }
    }

    // Clear avatar_url in profile
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: null })
      .eq('id', user.id)

    if (updateError) {
      throw new Error(`Failed to clear avatar_url in profile: ${updateError.message}`)
    }

    return { success: true, error: null }
  } catch (err) {
    return { success: false, error: err }
  }
}