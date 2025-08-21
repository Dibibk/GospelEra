import { EMBEDS, type AllowedHost } from '../config/embeds';

export interface YouTubeParseResult {
  ok: boolean;
  videoId?: string;
  start?: number;
  canonical?: string;
  reason?: string;
}

export interface EmbedVerificationResult {
  ok: boolean;
  canonical?: string;
  videoId?: string;
  start?: number;
  meta?: {
    title: string;
    author: string;
  };
  checks?: {
    safety: 'pass' | 'fail';
    faith: 'pass' | 'fail';
  };
  code?: string;
  reason?: string;
}

/**
 * Parse and validate a YouTube URL
 * @param url - The URL to parse
 * @returns Parsed result with video ID, start time, and canonical URL
 */
export function parseYouTube(url: string): YouTubeParseResult {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();
    
    // Check if host is allowed
    if (!EMBEDS.allowedHosts.includes(hostname as AllowedHost)) {
      return {
        ok: false,
        reason: 'Only YouTube links are allowed'
      };
    }
    
    let videoId: string | undefined;
    let start: number | undefined;
    
    if (hostname === 'youtu.be') {
      // Format: https://youtu.be/VIDEOID?t=123
      videoId = urlObj.pathname.slice(1); // Remove leading slash
      const tParam = urlObj.searchParams.get('t');
      if (tParam) {
        start = parseTimeParam(tParam);
      }
    } else if (hostname === 'youtube.com' || hostname === 'www.youtube.com') {
      // Format: https://www.youtube.com/watch?v=VIDEOID&t=123
      videoId = urlObj.searchParams.get('v') || undefined;
      const tParam = urlObj.searchParams.get('t') || urlObj.searchParams.get('start');
      if (tParam) {
        start = parseTimeParam(tParam);
      }
    }
    
    if (!videoId || videoId.length !== 11) {
      return {
        ok: false,
        reason: 'Invalid YouTube video ID'
      };
    }
    
    // Build canonical URL
    let canonical = `https://www.youtube.com/watch?v=${videoId}`;
    if (start) {
      canonical += `&t=${start}`;
    }
    
    return {
      ok: true,
      videoId,
      start,
      canonical
    };
  } catch (error) {
    return {
      ok: false,
      reason: 'Invalid URL format'
    };
  }
}

/**
 * Parse time parameter to seconds
 * Supports formats: 123, 123s, 2m3s, 1h2m3s
 */
function parseTimeParam(timeStr: string): number {
  if (!timeStr) return 0;
  
  // Remove any non-alphanumeric characters except 'h', 'm', 's'
  const cleanTime = timeStr.toLowerCase().replace(/[^0-9hms]/g, '');
  
  if (/^\d+$/.test(cleanTime)) {
    // Just a number, assume seconds
    return parseInt(cleanTime, 10);
  }
  
  let totalSeconds = 0;
  
  // Parse hours
  const hourMatch = cleanTime.match(/(\d+)h/);
  if (hourMatch) {
    totalSeconds += parseInt(hourMatch[1], 10) * 3600;
  }
  
  // Parse minutes
  const minuteMatch = cleanTime.match(/(\d+)m/);
  if (minuteMatch) {
    totalSeconds += parseInt(minuteMatch[1], 10) * 60;
  }
  
  // Parse seconds
  const secondMatch = cleanTime.match(/(\d+)s/);
  if (secondMatch) {
    totalSeconds += parseInt(secondMatch[1], 10);
  }
  
  return totalSeconds;
}

/**
 * Get YouTube thumbnail URL
 */
export function getYouTubeThumbnail(videoId: string, quality: 'maxres' | 'hq' = 'maxres'): string {
  const qualityPath = quality === 'maxres' ? 'maxresdefault' : 'hqdefault';
  return `https://img.youtube.com/vi/${videoId}/${qualityPath}.jpg`;
}

/**
 * Convert YouTube watch URL to embed URL for iframe
 */
export function getYouTubeEmbedUrl(videoId: string, start?: number): string {
  const baseUrl = EMBEDS.useNoCookie 
    ? 'https://www.youtube-nocookie.com/embed' 
    : 'https://www.youtube.com/embed';
  
  let embedUrl = `${baseUrl}/${videoId}`;
  
  if (start) {
    embedUrl += `?start=${start}`;
  }
  
  return embedUrl;
}