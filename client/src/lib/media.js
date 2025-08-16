/**
 * Media upload and management utilities for posts
 */

/**
 * Gets upload URL for media files (images and videos)
 */
export async function getMediaUploadURL() {
  try {
    const response = await fetch('/api/media/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { uploadURL: data.uploadURL, error: null };
  } catch (error) {
    return { uploadURL: null, error };
  }
}

/**
 * Processes uploaded media and returns the object path
 */
export async function processUploadedMedia(mediaURL) {
  try {
    const response = await fetch('/api/media', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ mediaURL })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return { objectPath: data.objectPath, error: null };
  } catch (error) {
    return { objectPath: null, error };
  }
}

/**
 * Validates media file type and size
 */
export function validateMediaFile(file) {
  const isImage = file.type.startsWith('image/');
  const isVideo = file.type.startsWith('video/');
  
  if (!isImage && !isVideo) {
    return { valid: false, error: 'File must be an image or video' };
  }
  
  if (isImage) {
    const maxImageSize = 10 * 1024 * 1024; // 10MB
    const allowedImageTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    
    if (file.size > maxImageSize) {
      return { valid: false, error: 'Image must be less than 10MB' };
    }
    
    if (!allowedImageTypes.includes(file.type)) {
      return { valid: false, error: 'Images must be PNG, JPG, or WebP format' };
    }
  }
  
  if (isVideo) {
    const maxVideoSize = 100 * 1024 * 1024; // 100MB
    const allowedVideoTypes = ['video/mp4', 'video/mov', 'video/avi', 'video/quicktime'];
    
    if (file.size > maxVideoSize) {
      return { valid: false, error: 'Video must be less than 100MB' };
    }
    
    if (!allowedVideoTypes.includes(file.type)) {
      return { valid: false, error: 'Videos must be MP4, MOV, or AVI format' };
    }
  }
  
  return { valid: true };
}

/**
 * Gets media type from file extension or MIME type
 */
export function getMediaType(url) {
  if (!url) return 'unknown';
  
  const extension = url.split('.').pop()?.toLowerCase();
  const imageExtensions = ['png', 'jpg', 'jpeg', 'webp'];
  const videoExtensions = ['mp4', 'mov', 'avi'];
  
  if (imageExtensions.includes(extension)) return 'image';
  if (videoExtensions.includes(extension)) return 'video';
  
  // Fallback to checking if URL contains video or image keywords
  if (url.includes('video')) return 'video';
  if (url.includes('image')) return 'image';
  
  return 'unknown';
}