import { Router } from 'express';
import { parseYouTube, getYouTubeThumbnail, type EmbedVerificationResult } from '../src/lib/embeds';
import { EMBEDS } from '../src/config/embeds';
import { moderateContent } from '../shared/moderation';

const router = Router();

// In-memory cache for verified embeds (30 minutes TTL)
const embedCache = new Map<string, { result: EmbedVerificationResult; expires: number }>();

interface OEmbedResponse {
  title: string;
  author_name: string;
  author_url: string;
  type: string;
  html: string;
}

interface VerifyEmbedRequest {
  url: string;
  caption?: string;
}

/**
 * Verify YouTube embed with safety and faith checks
 */
router.post('/verify', async (req, res) => {
  try {
    const { url, caption }: VerifyEmbedRequest = req.body;
    
    if (!url) {
      return res.status(400).json({ 
        ok: false, 
        code: 'MISSING_URL',
        reason: 'URL is required' 
      });
    }
    
    // Check cache first
    const cached = embedCache.get(url);
    if (cached && cached.expires > Date.now()) {
      return res.json(cached.result);
    }
    
    // Parse and validate URL
    const parseResult = parseYouTube(url);
    if (!parseResult.ok) {
      return res.status(400).json({
        ok: false,
        code: 'INVALID_URL',
        reason: parseResult.reason || 'Invalid YouTube URL'
      });
    }
    
    const { videoId, canonical, start } = parseResult;
    
    // Check oEmbed for video existence and metadata
    let oembedData: OEmbedResponse | null = null;
    try {
      const oembedUrl = `${EMBEDS.oembed}?url=${encodeURIComponent(canonical!)}&format=json`;
      const oembedResponse = await fetch(oembedUrl);
      
      if (oembedResponse.status === 404 || oembedResponse.status === 401 || oembedResponse.status === 403) {
        return res.status(422).json({
          ok: false,
          code: 'NOT_EMBEDDABLE',
          reason: 'This video cannot be embedded'
        });
      }
      
      if (oembedResponse.ok) {
        oembedData = await oembedResponse.json();
      }
    } catch (error) {
      console.error('oEmbed fetch error:', error);
      return res.status(500).json({
        ok: false,
        code: 'OEMBED_ERROR',
        reason: 'Failed to verify video'
      });
    }
    
    // Safety and faith checks
    let safetyCheck: 'pass' | 'fail' = 'pass';
    let faithCheck: 'pass' | 'fail' = 'fail';
    
    // Caption validation (required)
    if (EMBEDS.requireCaption) {
      if (!caption || caption.trim().length < 6) {
        return res.status(400).json({
          ok: false,
          code: 'CAPTION_REQUIRED',
          reason: 'Please add a short Christ-centered caption'
        });
      }
      
      // Faith check on caption
      const captionModeration = moderateContent(caption);
      if (captionModeration.allowed) {
        faithCheck = 'pass';
      }
    }
    
    // Thumbnail safety check (basic implementation)
    try {
      // Try maxres first, fallback to hq
      let thumbnailUrl = getYouTubeThumbnail(videoId!, 'maxres');
      const thumbnailResponse = await fetch(thumbnailUrl, { method: 'HEAD' });
      
      if (!thumbnailResponse.ok) {
        thumbnailUrl = getYouTubeThumbnail(videoId!, 'hq');
      }
      
      // Here you would implement image safety detection
      // For now, we'll assume thumbnails are safe
      safetyCheck = 'pass';
    } catch (error) {
      console.error('Thumbnail check error:', error);
      // Continue without failing - thumbnail check is not critical
    }
    
    // Final decision
    if (safetyCheck === 'pass' && faithCheck === 'pass') {
      const result: EmbedVerificationResult = {
        ok: true,
        canonical: canonical!,
        videoId: videoId!,
        start,
        meta: oembedData ? {
          title: oembedData.title,
          author: oembedData.author_name
        } : undefined,
        checks: {
          safety: safetyCheck,
          faith: faithCheck
        }
      };
      
      // Cache the positive result for 30 minutes
      embedCache.set(url, {
        result,
        expires: Date.now() + 30 * 60 * 1000
      });
      
      return res.json(result);
    } else {
      return res.status(422).json({
        ok: false,
        code: 'FAITH_OR_SAFETY_FAIL',
        reason: 'Please ensure your caption honors Jesus and our community guidelines'
      });
    }
    
  } catch (error) {
    console.error('Embed verification error:', error);
    return res.status(500).json({
      ok: false,
      code: 'INTERNAL_ERROR',
      reason: 'Internal server error'
    });
  }
});

// Clean up expired cache entries periodically
setInterval(() => {
  const now = Date.now();
  const entries = Array.from(embedCache.entries());
  for (const [key, value] of entries) {
    if (value.expires <= now) {
      embedCache.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean every 5 minutes

export { router as embedsRouter };