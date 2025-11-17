// YouTube link validation and normalization utilities

export interface YouTubeLinkValidation {
  isValid: boolean;
  normalizedUrl?: string;
  videoId?: string;
  error?: string;
}

export interface YouTubeMetadata {
  title: string;
  description?: string;
  author_name?: string;
}

/**
 * Validates and normalizes YouTube URLs
 * Accepts formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://m.youtube.com/watch?v=VIDEO_ID
 */
export function validateAndNormalizeYouTubeUrl(url: string): YouTubeLinkValidation {
  if (!url || url.trim() === '') {
    return { isValid: true }; // Empty URLs are valid (optional field)
  }

  try {
    const parsedUrl = new URL(url.trim());
    
    // Check if it's a valid YouTube domain
    const validDomains = ['youtube.com', 'www.youtube.com', 'youtu.be', 'm.youtube.com'];
    if (!validDomains.includes(parsedUrl.hostname)) {
      return {
        isValid: false,
        error: 'Only Christ-centered YouTube content is allowed. Please share gospel music, sermons, or Christian testimonies.'
      };
    }

    let videoId: string | null = null;

    // Handle youtu.be format
    if (parsedUrl.hostname === 'youtu.be') {
      videoId = parsedUrl.pathname.slice(1); // Remove leading slash
    }
    // Handle youtube.com formats
    else if (parsedUrl.pathname === '/watch') {
      videoId = parsedUrl.searchParams.get('v');
    }

    if (!videoId || videoId.length !== 11) {
      return {
        isValid: false,
        error: 'Please provide a valid YouTube video link that honors Jesus and aligns with our Christian community guidelines.'
      };
    }

    // Normalize to standard format, preserving timestamp if present
    const timeParam = parsedUrl.searchParams.get('t');
    const normalizedUrl = `https://www.youtube.com/watch?v=${videoId}${timeParam ? `&t=${timeParam}` : ''}`;

    return {
      isValid: true,
      normalizedUrl,
      videoId
    };
  } catch (error) {
    return {
      isValid: false,
      error: 'Please enter a valid YouTube URL.'
    };
  }
}

/**
 * Extracts video ID from a normalized YouTube URL
 */
export function getYouTubeVideoId(url: string): string | null {
  try {
    const parsedUrl = new URL(url);
    return parsedUrl.searchParams.get('v');
  } catch {
    return null;
  }
}

/**
 * Creates YouTube embed URL from video ID
 */
export function getYouTubeEmbedUrl(videoId: string): string {
  return `https://www.youtube.com/embed/${videoId}`;
}