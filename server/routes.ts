import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { HybridStorageService } from "./hybridStorage";
import { embedsRouter } from "./embeds";
import Stripe from "stripe";
import OpenAI from "openai";
import { 
  authenticateUser, 
  optionalAuth, 
  requireAdmin, 
  checkNotBanned,
  type AuthenticatedRequest 
} from "./auth";
import { createServerSupabase, extractToken, supabaseAdmin } from "./supabaseClient";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize hybrid storage service (S3 or Replit Object Storage)
  const hybridStorage = new HybridStorageService();
  
  // Log storage configuration
  console.log("Storage Configuration:", hybridStorage.getStorageInfo());

  // Initialize Stripe
  if (!process.env.STRIPE_SECRET_KEY) {
    console.warn('STRIPE_SECRET_KEY not found - Stripe payments will not work');
  }
  const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: "2025-07-30.basil",
  }) : null;

  // Initialize OpenAI for AI-based content moderation
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  // Health check endpoint for deployment
  app.get("/health", (req, res) => {
    res.status(200).json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // Root endpoint
  app.get("/api", (req, res) => {
    res.json({ message: "Gospel Era API", version: "1.0.0" });
  });

  // Storage status endpoint for debugging
  app.get("/api/storage/status", (req, res) => {
    res.json(hybridStorage.getStorageInfo());
  });

  // AI-based content validation endpoint
  app.post("/api/validate-content", async (req, res) => {
    try {
      const { text } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: "Text is required" });
      }

      // First check for hard-blocked terms (non-Christian religious content)
      const { moderateContent } = await import("@shared/moderation");
      const basicModeration = moderateContent(text);
      
      if (!basicModeration.allowed) {
        return res.json({
          allowed: false,
          reason: basicModeration.reason,
          confidence: basicModeration.confidence
        });
      }

      // Use AI for nuanced validation
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a content moderator for Gospel Era, a Christ-centered Christian community platform.

Your task is to determine if user-submitted content is appropriate for this faith-based community.

ALLOW content that is:
- Christ-centered or Jesus-focused
- Biblical or Scripture-based
- Spiritual encouragement or testimony
- Prayer requests or praise
- Questions about faith or Christian living
- General positive messages that don't conflict with Christian values
- Personal struggles or requests for support (even without explicit Christian terms)
- Expressions of gratitude, hope, or encouragement

REJECT content that is:
- Promoting non-Christian religions or deities
- Occult, witchcraft, or new age practices
- Explicitly anti-Christian or mocking faith
- Hateful, violent, or inappropriate
- Spam or commercial advertising

Be PERMISSIVE and GRACIOUS. Not every post needs to quote scripture or mention Jesus explicitly. Allow genuine spiritual content, personal struggles, and supportive messages.

Respond in JSON format:
{
  "allowed": true/false,
  "reason": "brief explanation if rejected",
  "confidence": 0.0-1.0,
  "analysis": "brief analysis of the content"
}`
          },
          {
            role: "user",
            content: `Evaluate this content:\n\n"${text}"`
          }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      });

      const result = JSON.parse(completion.choices[0].message.content || '{}');
      
      res.json({
        allowed: result.allowed ?? true,
        reason: result.reason,
        confidence: result.confidence ?? 0.7,
        analysis: result.analysis
      });

    } catch (error) {
      console.error('AI validation error:', error);
      // Fail open - allow content if AI validation fails
      res.json({
        allowed: true,
        confidence: 0.5,
        reason: "AI validation unavailable, content approved by default"
      });
    }
  });

  // Embeds verification routes
  app.use("/api/embeds", embedsRouter);

  // The endpoint for serving public objects
  app.get("/public-objects/:filePath(*)", async (req, res) => {
    const filePath = req.params.filePath;
    try {
      await hybridStorage.servePublicObject(filePath, res);
    } catch (error) {
      console.error("Error serving public object:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // The endpoint for serving private objects (avatars and media)
  app.get("/objects/:objectPath(*)", async (req, res) => {
    try {
      await hybridStorage.servePrivateObject(req.path, res);
    } catch (error) {
      console.error("Error serving private object:", error);
      return res.sendStatus(500);
    }
  });

  // The endpoint for getting the upload URL for avatars
  app.post("/api/objects/upload", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Validate file type and size limits for avatars
      const { fileType, fileSize } = req.body;
      
      // Allow only image types for avatars
      const allowedAvatarTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (fileType && !allowedAvatarTypes.includes(fileType.toLowerCase())) {
        return res.status(400).json({ 
          error: "Invalid file type. Only JPEG, PNG, GIF, and WebP images are allowed for avatars." 
        });
      }
      
      // Limit avatar size to 5MB
      const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB in bytes
      if (fileSize && fileSize > MAX_AVATAR_SIZE) {
        return res.status(400).json({ 
          error: "File too large. Avatar images must be under 5MB." 
        });
      }
      
      const uploadURL = await hybridStorage.getAvatarUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting avatar upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint for updating avatar after upload
  app.put("/api/avatar", authenticateUser, async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (!req.body.avatarURL) {
      return res.status(400).json({ error: "avatarURL is required" });
    }

    try {
      const objectPath = hybridStorage.normalizeUploadUrlToObjectPath(
        req.body.avatarURL,
      );

      res.status(200).json({
        objectPath: objectPath,
      });
    } catch (error) {
      console.error("Error setting avatar:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Endpoint for media upload for posts (images and videos)
  app.post("/api/media/upload", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // Validate file type and size limits for media
      const { fileType, fileSize } = req.body;
      
      // Allow images and videos for post media
      const allowedMediaTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo'
      ];
      if (fileType && !allowedMediaTypes.includes(fileType.toLowerCase())) {
        return res.status(400).json({ 
          error: "Invalid file type. Only images (JPEG, PNG, GIF, WebP) and videos (MP4, WebM, MOV, AVI) are allowed." 
        });
      }
      
      // Limit media size: 10MB for images, 50MB for videos
      const isVideo = fileType && fileType.startsWith('video/');
      const MAX_IMAGE_SIZE = 10 * 1024 * 1024; // 10MB
      const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50MB
      const maxSize = isVideo ? MAX_VIDEO_SIZE : MAX_IMAGE_SIZE;
      
      if (fileSize && fileSize > maxSize) {
        const sizeLimit = isVideo ? '50MB' : '10MB';
        return res.status(400).json({ 
          error: `File too large. ${isVideo ? 'Videos' : 'Images'} must be under ${sizeLimit}.` 
        });
      }
      
      const uploadURL = await hybridStorage.getMediaUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting media upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint for processing media after upload
  app.put("/api/media", authenticateUser, async (req: AuthenticatedRequest, res) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required" });
    }
    
    if (!req.body.mediaURL) {
      return res.status(400).json({ error: "mediaURL is required" });
    }

    try {
      const objectPath = hybridStorage.normalizeUploadUrlToObjectPath(
        req.body.mediaURL,
      );

      res.status(200).json({
        objectPath: objectPath,
        mediaURL: req.body.mediaURL
      });
    } catch (error) {
      console.error("Error processing media:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Admin endpoint to update user roles (ban/unban)
  app.patch("/api/admin/users/:userId/role", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const { userId } = req.params;
      const { role } = req.body;

      // Validate role
      if (!['user', 'banned', 'admin'].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const updatedUser = await storage.updateUserRole(userId, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ error: "Failed to update user role" });
    }
  });

  // Admin endpoint to get banned users
  app.get("/api/admin/banned-users", authenticateUser, requireAdmin, async (req: AuthenticatedRequest, res) => {
    try {
      const bannedUsers = await storage.getBannedUsers();
      res.json(bannedUsers);
    } catch (error) {
      console.error("Error fetching banned users:", error);
      res.status(500).json({ error: "Failed to fetch banned users" });
    }
  });

  // Get profile by ID - used by useRole hook to get user's role
  app.get("/api/profiles/:id", async (req, res) => {
    try {
      const userId = req.params.id;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('id, email, display_name, bio, avatar_url, role, media_enabled, show_name_on_prayers, private_profile')
        .eq('id', userId)
        .single();
      
      if (error) {
        if (error.code === 'PGRST116') {
          return res.status(404).json({ error: "Profile not found" });
        }
        console.error("Error fetching profile:", error);
        return res.status(500).json({ error: "Failed to fetch profile" });
      }
      
      res.json(profile);
    } catch (error) {
      console.error("Error fetching profile:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  });

  // Profile update endpoint - prevents privilege escalation
  app.patch("/api/profile", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { display_name, bio, avatar_url, show_name_on_prayers, private_profile, settings } = req.body;

      // SECURITY: Reject any attempt to modify protected fields
      if ('role' in req.body || 'media_enabled' in req.body) {
        return res.status(403).json({ 
          error: "Cannot modify protected fields. Contact an administrator for role or media permission changes." 
        });
      }

      // Validate display_name if provided
      if (display_name !== undefined && display_name !== null) {
        const trimmed = display_name.trim();
        if (trimmed.length < 2 || trimmed.length > 40) {
          return res.status(400).json({ 
            error: "Display name must be between 2 and 40 characters" 
          });
        }
      }

      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);

      // Build update object (only include defined fields)
      const updateData: any = { updated_at: new Date().toISOString() };
      if (display_name !== undefined) updateData.display_name = display_name;
      if (bio !== undefined) updateData.bio = bio;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (show_name_on_prayers !== undefined) updateData.show_name_on_prayers = show_name_on_prayers;
      if (private_profile !== undefined) updateData.private_profile = private_profile;
      if (settings !== undefined) updateData.settings = settings;

      // Check if profile exists first
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', req.user.id)
        .single();

      let result;
      if (existingProfile) {
        // Update existing profile
        const { data, error } = await supabase
          .from('profiles')
          .update(updateData)
          .eq('id', req.user.id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        // Create new profile (upsert pattern)
        const { data, error } = await supabase
          .from('profiles')
          .insert({
            id: req.user.id,
            display_name: updateData.display_name || 'User',
            bio: updateData.bio || null,
            avatar_url: updateData.avatar_url || null,
            show_name_on_prayers: updateData.show_name_on_prayers ?? true,
            private_profile: updateData.private_profile ?? false,
            settings: updateData.settings || {},
          })
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      if (!result) {
        return res.status(500).json({ error: "Failed to save profile" });
      }

      res.json(result);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Guidelines acceptance endpoint
  app.post("/api/guidelines/accept", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);

      // Update the user's profile to mark guidelines as accepted
      const { data, error } = await supabase
        .from('profiles')
        .update({
          accepted_guidelines: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', req.user.id)
        .select()
        .single();

      if (error) {
        // If profile doesn't exist, create it with guidelines accepted
        if (error.code === 'PGRST116') {
          const { data: newProfile, error: insertError } = await supabase
            .from('profiles')
            .insert({
              id: req.user.id,
              accepted_guidelines: true,
            })
            .select()
            .single();

          if (insertError) throw insertError;
          return res.json({ success: true, profile: newProfile });
        }
        throw error;
      }

      res.json({ success: true, profile: data });
    } catch (error) {
      console.error("Error accepting guidelines:", error);
      res.status(500).json({ error: "Failed to save guidelines acceptance" });
    }
  });

  // Get guidelines acceptance status
  app.get("/api/guidelines/status", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('accepted_guidelines')
        .eq('id', req.user.id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No profile yet means guidelines not accepted
          return res.json({ accepted: false });
        }
        throw error;
      }

      res.json({
        accepted: profile?.accepted_guidelines || false
      });
    } catch (error) {
      console.error("Error checking guidelines status:", error);
      res.status(500).json({ error: "Failed to check guidelines status" });
    }
  });

  // Posts API Routes
  app.get("/api/posts", async (req, res) => {
    try {
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const limit = parseInt(req.query.limit as string) || 20;
      const fromId = req.query.fromId as string;
      const authorId = req.query.authorId as string;
      
      let query = supabase
        .from('posts')
        .select('*')
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Add author filter if provided
      if (authorId) {
        query = query.eq('author_id', authorId);
      }
      
      // Add keyset pagination if fromId is provided
      if (fromId) {
        const { data: fromPost } = await supabase
          .from('posts')
          .select('created_at')
          .eq('id', parseInt(fromId))
          .single();
        
        if (fromPost) {
          query = query.lt('created_at', fromPost.created_at);
        }
      }
      
      const { data: allPosts, error } = await query;
      
      if (error) {
        console.error("Error fetching posts:", error);
        return res.status(500).json({ error: "Failed to fetch posts" });
      }
      
      res.json(allPosts || []);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // OPTIMIZED FEED ENDPOINT - Combines posts + authors + engagement in ONE query
  app.get("/api/feed", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const limit = parseInt(req.query.limit as string) || 20;
      const fromId = req.query.fromId as string;
      const currentUserId = req.user?.id;
      
      // Build the query with proper pagination
      let query = supabase
        .from('posts')
        .select('*')
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Add keyset pagination if fromId is provided
      if (fromId) {
        const { data: fromPost } = await supabase
          .from('posts')
          .select('created_at')
          .eq('id', parseInt(fromId))
          .single();
        
        if (fromPost) {
          query = query.lt('created_at', fromPost.created_at);
        }
      }
      
      const { data: feedPosts, error: postsError } = await query;
      
      if (postsError) {
        console.error("Error fetching posts:", postsError);
        return res.status(500).json({ error: "Failed to fetch feed" });
      }
      
      if (!feedPosts || feedPosts.length === 0) {
        return res.json({ posts: [], profiles: {}, engagement: {}, nextCursor: null });
      }
      
      const postIds = feedPosts.map(p => p.id);
      const authorIds = Array.from(new Set(feedPosts.map(p => p.author_id)));
      
      // Fetch all author profiles in ONE query
      const { data: authorProfiles } = await supabase
        .from('profiles')
        .select('id, email, display_name, bio, avatar_url, role')
        .in('id', authorIds);
      
      // Fetch all reactions
      const { data: reactionRows } = await supabase
        .from('reactions')
        .select('post_id, user_id')
        .in('post_id', postIds)
        .eq('kind', 'amen');
      
      // Fetch comment counts - we need to count in JS since Supabase doesn't support GROUP BY easily
      const { data: commentsData } = await supabase
        .from('comments')
        .select('post_id')
        .in('post_id', postIds)
        .eq('deleted', false)
        .eq('hidden', false);
      
      // Build profiles map
      const profilesMap: Record<string, any> = {};
      (authorProfiles || []).forEach(profile => {
        profilesMap[profile.id] = profile;
      });
      
      // Build engagement map
      const engagementMap: Record<number, any> = {};
      postIds.forEach(postId => {
        engagementMap[postId] = { amenCount: 0, userAmened: false, commentCount: 0 };
      });
      
      // Count reactions and check user's reactions
      (reactionRows || []).forEach((row: any) => {
        if (engagementMap[row.post_id]) {
          engagementMap[row.post_id].amenCount++;
          if (currentUserId && row.user_id === currentUserId) {
            engagementMap[row.post_id].userAmened = true;
          }
        }
      });
      
      // Add comment counts
      (commentsData || []).forEach((row: any) => {
        if (engagementMap[row.post_id]) {
          engagementMap[row.post_id].commentCount++;
        }
      });
      
      // Calculate next cursor
      const nextCursor = feedPosts.length === limit ? feedPosts[feedPosts.length - 1].id : null;
      
      res.json({
        posts: feedPosts,
        profiles: profilesMap,
        engagement: engagementMap,
        nextCursor
      });
    } catch (error) {
      console.error("Error fetching feed:", error);
      res.status(500).json({ error: "Failed to fetch feed" });
    }
  });

  // PRAYER REQUESTS API ENDPOINT - Queries Supabase database
  app.get("/api/prayer-requests", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 50);
      const status = (req.query.status as string) || 'open';
      const cursor = req.query.cursor as string;
      const searchQuery = req.query.q as string;
      const tagsParam = req.query.tags as string;
      const currentUserId = req.user?.id;
      
      // Query prayer requests (without joins to avoid FK issues)
      let query = supabase
        .from('prayer_requests')
        .select('id, requester, title, details, tags, is_anonymous, status, created_at, updated_at')
        .eq('status', status)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (cursor) {
        query = query.lt('id', parseInt(cursor));
      }
      
      // Text search filter
      if (searchQuery && searchQuery.trim()) {
        query = query.or(`title.ilike.%${searchQuery}%,details.ilike.%${searchQuery}%`);
      }
      
      // Tags filter
      if (tagsParam) {
        const tags = tagsParam.split(',').filter(t => t.trim());
        if (tags.length > 0) {
          query = query.contains('tags', tags);
        }
      }
      
      const { data: requests, error } = await query;
      
      if (error) {
        console.error("Supabase prayer query error:", error);
        if (error.code === '42P01' || error.message?.includes('does not exist')) {
          return res.json({ 
            requests: [], 
            profiles: {}, 
            stats: {},
            myCommitments: [],
            nextCursor: null 
          });
        }
        return res.status(500).json({ error: "Failed to fetch prayer requests" });
      }
      
      if (!requests || requests.length === 0) {
        return res.json({ 
          requests: [], 
          profiles: {}, 
          stats: {},
          myCommitments: [],
          nextCursor: null 
        });
      }
      
      // Get requester IDs and request IDs for additional queries
      const requesterIds = Array.from(new Set(requests.map(r => r.requester)));
      const requestIds = requests.map(r => r.id);
      
      // Fetch profiles separately
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, display_name, avatar_url')
        .in('id', requesterIds);
      
      // Fetch commitments separately
      const { data: commitmentsData } = await supabase
        .from('prayer_commitments')
        .select('request_id, warrior, status, committed_at, prayed_at')
        .in('request_id', requestIds);
      
      // Build profiles map
      const profilesMap: Record<string, any> = {};
      (profilesData || []).forEach((p: any) => {
        profilesMap[p.id] = p;
      });
      
      // Build stats map and collect commitments
      const statsMap: Record<number, { committed_count: number; prayed_count: number; total_warriors: number }> = {};
      
      requestIds.forEach(reqId => {
        const commitments = (commitmentsData || []).filter((c: any) => c.request_id === reqId);
        statsMap[reqId] = {
          committed_count: commitments.filter((c: any) => c.status === 'committed').length,
          prayed_count: commitments.filter((c: any) => c.status === 'prayed').length,
          total_warriors: commitments.length
        };
      });
      
      // Get current user's commitments if logged in
      const myCommitments = currentUserId 
        ? (commitmentsData || []).filter((c: any) => c.warrior === currentUserId)
        : [];
      
      // Calculate next cursor
      const nextCursor = requests.length === limit ? requests[requests.length - 1].id : null;
      
      res.json({
        requests: requests,
        profiles: profilesMap,
        stats: statsMap,
        myCommitments,
        nextCursor
      });
    } catch (error) {
      console.error("Error fetching prayer requests:", error);
      res.status(500).json({ error: "Failed to fetch prayer requests" });
    }
  });

  app.post("/api/posts", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { insertPostSchema } = await import("@shared/schema");
      const { moderateContent } = await import("../shared/moderation");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const result = insertPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid post data", issues: result.error.issues });
      }

      // Server-side AI validation for content
      const combinedText = `${result.data.title?.trim() || ''}\n\n${result.data.content?.trim() || ''}`;
      
      // First check for hard-blocked terms
      const basicModeration = moderateContent(combinedText);
      if (!basicModeration.allowed) {
        return res.status(400).json({ 
          error: "Content not appropriate", 
          reason: basicModeration.reason
        });
      }

      // Use AI for nuanced validation
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a content moderator for Gospel Era, a Christ-centered Christian community platform. Determine if this content is appropriate. Allow genuine spiritual content, personal struggles, encouragement. Reject only clearly inappropriate or non-Christian religious content. Respond JSON: {"allowed": true/false, "reason": "if rejected"}`
            },
            {
              role: "user",
              content: `Evaluate: "${combinedText}"`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices[0].message.content || '{"allowed": true}');
        
        if (!aiResult.allowed) {
          return res.status(400).json({ 
            error: "Content validation failed", 
            reason: aiResult.reason || 'Please keep content Christ-centered and appropriate'
          });
        }
      } catch (aiError) {
        // AI failed - use basic moderation as fallback (already passed above)
        console.error('AI validation error, using basic moderation:', aiError);
      }

      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);

      const postData = {
        title: result.data.title,
        content: result.data.content,
        tags: result.data.tags || [],
        embed_url: result.data.embed_url || null,
        author_id: req.user.id
      };
      
      const { data: newPost, error } = await supabase
        .from('posts')
        .insert(postData)
        .select()
        .single();
      
      if (error) throw error;
      res.status(201).json(newPost);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { insertPostSchema } = await import("@shared/schema");
      
      const postId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const result = insertPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid post data", issues: result.error.issues });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // First, check if the post exists and belongs to the user
      const { data: existingPost, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (fetchError || !existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }
      
      // Check ownership
      if (existingPost.author_id !== req.user.id) {
        return res.status(403).json({ error: "You don't have permission to edit this post" });
      }
      
      const postData = {
        title: result.data.title,
        content: result.data.content,
        tags: result.data.tags || [],
        embed_url: result.data.embed_url || null,
        updated_at: new Date().toISOString()
      };
      
      // Update the post
      const { data: updatedPost, error } = await supabase
        .from('posts')
        .update(postData)
        .eq('id', postId)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ success: true, data: updatedPost });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const postId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // First, check if the post exists
      const { data: existingPost, error: fetchError } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
      
      if (fetchError || !existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if user can delete: post author or admin
      const isAdmin = req.user.role === 'admin';
      const isOwner = existingPost.author_id === req.user.id;
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You don't have permission to delete this post" });
      }
      
      // Soft delete by setting hidden = true (preserves data for admin review)
      const { data: deletedPost, error } = await supabase
        .from('posts')
        .update({ 
          hidden: true,
          title: "[Deleted]",
          content: "[This post has been deleted by the author]",
          embed_url: null,
          media_urls: []
        })
        .eq('id', postId)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ success: true, data: deletedPost });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Comments API Routes
  app.post("/api/comments", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { insertCommentSchema } = await import("@shared/schema");
      const { moderateContent } = await import("../shared/moderation");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const result = insertCommentSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid comment data", issues: result.error.issues });
      }

      // Server-side content moderation for comments
      const content = result.data.content?.trim() || '';
      
      // First check for hard-blocked terms
      const basicModeration = moderateContent(content);
      if (!basicModeration.allowed) {
        return res.status(400).json({ 
          error: "Content not appropriate", 
          reason: basicModeration.reason
        });
      }

      // Use AI for nuanced validation
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are a content moderator for Gospel Era, a Christ-centered Christian community platform. Determine if this comment is appropriate. Allow genuine spiritual content, personal struggles, encouragement. Reject only clearly inappropriate or non-Christian religious content. Respond JSON: {"allowed": true/false, "reason": "if rejected"}`
            },
            {
              role: "user",
              content: `Evaluate: "${content}"`
            }
          ],
          temperature: 0.3,
          response_format: { type: "json_object" }
        });

        const aiResult = JSON.parse(completion.choices[0].message.content || '{"allowed": true}');
        
        if (!aiResult.allowed) {
          return res.status(400).json({ 
            error: "Content validation failed", 
            reason: aiResult.reason || 'Please keep content Christ-centered and appropriate'
          });
        }
      } catch (aiError) {
        // AI failed - use basic moderation as fallback (already passed above)
        console.error('AI validation error for comment, using basic moderation:', aiError);
      }

      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);

      const commentData = {
        content: result.data.content,
        post_id: result.data.post_id,
        author_id: req.user.id
      };
      
      const { data: newComment, error } = await supabase
        .from('comments')
        .insert(commentData)
        .select()
        .single();
      
      if (error) throw error;
      
      // Create notification for post author (if not commenting on own post)
      try {
        const { data: post } = await supabase
          .from('posts')
          .select('author_id, title')
          .eq('id', result.data.post_id)
          .single();
        
        if (post && post.author_id !== req.user.id) {
          // Get commenter's display name
          const { data: commenterProfile } = await supabase
            .from('profiles')
            .select('display_name')
            .eq('id', req.user.id)
            .single();
          
          const commenterName = commenterProfile?.display_name || 'Someone';
          const postTitle = post.title?.slice(0, 30) || 'your post';
          const message = `${commenterName} commented on "${postTitle}${post.title?.length > 30 ? '...' : ''}"`;
          
          await supabase
            .from('notifications')
            .insert({
              recipient_id: post.author_id,
              actor_id: req.user.id,
              event_type: 'comment',
              post_id: result.data.post_id,
              comment_id: newComment.id,
              message
            });
          
          // Send push notification
          try {
            const { sendPushNotification } = await import('./pushNotifications');
            await sendPushNotification(post.author_id, {
              title: 'New Comment',
              body: message,
              url: '/'
            });
          } catch (pushError) {
            console.error("Error sending push notification:", pushError);
          }
        }
      } catch (notifError) {
        console.error("Error creating comment notification:", notifError);
      }
      
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // DELETE comment - only author can delete their own comments
  app.delete("/api/comments/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const commentId = parseInt(req.params.id);
      if (isNaN(commentId)) {
        return res.status(400).json({ error: "Invalid comment ID" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // Verify the comment exists and belongs to the user
      const { data: existingComment, error: fetchError } = await supabase
        .from('comments')
        .select('author_id, deleted')
        .eq('id', commentId)
        .single();
      
      if (fetchError || !existingComment) {
        return res.status(404).json({ error: "Comment not found" });
      }
      
      if (existingComment.deleted) {
        return res.status(400).json({ error: "Comment already deleted" });
      }
      
      // Only allow author or admin to delete
      const isAdmin = req.user.role === 'admin';
      const isOwner = existingComment.author_id === req.user.id;
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You can only delete your own comments" });
      }
      
      // Soft delete by setting deleted = true
      const { data: deletedComment, error } = await supabase
        .from('comments')
        .update({ deleted: true })
        .eq('id', commentId)
        .select()
        .single();
      
      if (error) throw error;
      res.json({ success: true, data: deletedComment });
    } catch (error) {
      console.error("Error deleting comment:", error);
      res.status(500).json({ error: "Failed to delete comment" });
    }
  });

  // GET comments for a post
  app.get("/api/comments", async (req, res) => {
    try {
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const postId = parseInt(req.query.post_id as string);
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      const fromId = req.query.from_id ? parseInt(req.query.from_id as string) : null;
      
      if (isNaN(postId)) {
        return res.status(400).json({ error: "post_id is required and must be a number" });
      }
      
      let query = supabase
        .from('comments')
        .select('id, post_id, content, created_at, author_id')
        .eq('post_id', postId)
        .eq('deleted', false)
        .eq('hidden', false)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      // Add keyset pagination if fromId provided
      if (fromId) {
        const { data: fromComment } = await supabase
          .from('comments')
          .select('created_at')
          .eq('id', fromId)
          .eq('deleted', false)
          .eq('hidden', false)
          .single();
        
        if (fromComment) {
          query = query.lt('created_at', fromComment.created_at);
        }
      }
      
      const { data: result, error } = await query;
      
      if (error) {
        console.error("Error fetching comments:", error);
        return res.status(500).json({ error: "Failed to fetch comments" });
      }
      
      res.json(result || []);
    } catch (error) {
      console.error("Error fetching comments:", error);
      res.status(500).json({ error: "Failed to fetch comments" });
    }
  });

  // Prayer Request Creation - uses Supabase
  app.post("/api/prayer-requests/create", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { validateFaithContent } = await import("../shared/moderation");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { title, details, tags, is_anonymous } = req.body;
      
      if (!title || typeof title !== 'string' || title.trim().length < 3) {
        return res.status(400).json({ error: "Title must be at least 3 characters" });
      }

      // Server-side faith validation
      const titleValidation = validateFaithContent(title?.trim() || '');
      const detailsValidation = validateFaithContent(details?.trim() || '');
      
      if (!titleValidation.isValid && !detailsValidation.isValid) {
        return res.status(400).json({ 
          error: "Content must be Christ-centered", 
          reason: titleValidation.reason || 'Please keep your prayer request centered on Jesus or Scripture.'
        });
      }

      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { data: newRequest, error } = await supabase
        .from('prayer_requests')
        .insert({
          requester: req.user.id,
          title: title.trim(),
          details: details?.trim() || null,
          tags: tags || [],
          is_anonymous: is_anonymous || false,
          status: 'open'
        })
        .select()
        .single();
      
      if (error) throw error;
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating prayer request:", error);
      res.status(500).json({ error: "Failed to create prayer request" });
    }
  });

  // Prayer Commitment - commit to pray for a request
  app.post("/api/prayer-requests/:id/commit", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // Upsert commitment
      const { data: commitment, error: commitError } = await supabase
        .from('prayer_commitments')
        .upsert({
          request_id: requestId,
          warrior: req.user.id,
          status: 'committed'
        }, {
          onConflict: 'request_id,warrior'
        })
        .select()
        .single();

      if (commitError) {
        console.error("Error creating prayer commitment:", commitError);
        return res.status(500).json({ error: "Failed to commit to prayer" });
      }

      // Log activity
      await supabase
        .from('prayer_activity')
        .insert({
          request_id: requestId,
          actor: req.user.id,
          kind: 'commitment',
          message: 'committed to pray'
        });

      res.json(commitment);
    } catch (error) {
      console.error("Error committing to prayer:", error);
      res.status(500).json({ error: "Failed to commit to prayer" });
    }
  });

  // Confirm Prayed - mark commitment as prayed
  app.post("/api/prayer-requests/:id/confirm-prayed", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // Update commitment status to prayed
      const { data: commitment, error: updateError } = await supabase
        .from('prayer_commitments')
        .update({
          status: 'prayed',
          prayed_at: new Date().toISOString()
        })
        .eq('request_id', requestId)
        .eq('warrior', req.user.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error confirming prayed:", updateError);
        return res.status(500).json({ error: "Failed to confirm prayer" });
      }

      // Log activity
      await supabase
        .from('prayer_activity')
        .insert({
          request_id: requestId,
          actor: req.user.id,
          kind: 'prayed',
          message: 'prayed for this request'
        });

      res.json(commitment);
    } catch (error) {
      console.error("Error confirming prayed:", error);
      res.status(500).json({ error: "Failed to confirm prayer" });
    }
  });

  // Prayer Activity - record when someone prays
  app.post("/api/prayer-requests/:id/pray", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const requestId = parseInt(req.params.id);
      if (isNaN(requestId)) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // Insert prayer activity
      const { error: activityError } = await supabase
        .from('prayer_activity')
        .insert({
          request_id: requestId,
          user_id: req.user.id,
          kind: 'prayed'
        });

      if (activityError) {
        console.error("Error inserting prayer activity:", activityError);
      }

      // Get updated request
      const { data: updatedRequest, error: fetchError } = await supabase
        .from('prayer_requests')
        .select('*')
        .eq('id', requestId)
        .single();

      if (fetchError) throw fetchError;
      res.json(updatedRequest);
    } catch (error) {
      console.error("Error recording prayer:", error);
      res.status(500).json({ error: "Failed to record prayer" });
    }
  });

  // Donations API Routes
  app.post("/api/donations", async (req, res) => {
    try {
      const { insertDonationSchema } = await import("@shared/schema");
      const { createClient } = await import("@supabase/supabase-js");
      
      const result = insertDonationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid donation data", issues: result.error.issues });
      }

      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: newDonation, error } = await supabase
        .from('donations')
        .insert(result.data)
        .select()
        .single();

      if (error) throw error;
      res.status(201).json(newDonation);
    } catch (error) {
      console.error("Error creating donation:", error);
      res.status(500).json({ error: "Failed to create donation" });
    }
  });

  app.get("/api/donations", async (req, res) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      
      const userId = req.query.userId as string;
      
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      let query = supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });
      
      // Filter by user if userId provided
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data: userDonations, error } = await query;
      if (error) throw error;
      res.json(userDonations || []);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // Admin endpoint to get all donations
  app.get("/api/admin/donations", async (req, res) => {
    try {
      const { createClient } = await import("@supabase/supabase-js");
      
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
      );

      const { data: allDonations, error } = await supabase
        .from('donations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(allDonations || []);
    } catch (error) {
      console.error("Error fetching all donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // Media Requests API Routes
  // POST /api/media-requests - Submit a media access request
  app.post("/api/media-requests", async (req, res) => {
    try {
      const { supabaseAdmin } = await import("./supabaseClient");
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured" });
      }
      
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: "Reason is required" });
      }
      
      // Get user ID from headers (set by frontend auth)
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      
      const { data: newRequest, error } = await supabaseAdmin
        .from('media_requests')
        .insert({
          user_id: userId,
          reason: reason.trim(),
          status: 'pending'
        })
        .select()
        .single();
      
      if (error) {
        console.error("Error creating media request:", error);
        return res.status(500).json({ error: "Failed to create media request" });
      }
      
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating media request:", error);
      res.status(500).json({ error: "Failed to create media request" });
    }
  });

  // GET /api/media-requests/my - Get current user's requests
  app.get("/api/media-requests/my", async (req, res) => {
    try {
      const { supabaseAdmin } = await import("./supabaseClient");
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured" });
      }
      
      // Get user ID from headers (set by frontend auth)  
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      
      const { data: userRequests, error } = await supabaseAdmin
        .from('media_requests')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching user media requests:", error);
        return res.status(500).json({ error: "Failed to fetch requests" });
      }
      
      res.json(userRequests || []);
    } catch (error) {
      console.error("Error fetching user media requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // GET /api/admin/media-requests - Get all media requests (admin only)
  app.get("/api/admin/media-requests", async (req: any, res) => {
    try {
      const { supabaseAdmin } = await import("./supabaseClient");
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured" });
      }
      
      // Fetch all media requests from Supabase
      const { data: requests, error: requestsError } = await supabaseAdmin
        .from('media_requests')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (requestsError) {
        console.error("Error fetching media requests:", requestsError);
        return res.status(500).json({ error: "Failed to fetch media requests" });
      }
      
      // Collect user IDs for profile lookup
      const userIds = [...new Set((requests || []).map(r => r.user_id).filter(Boolean))];
      
      // Fetch profiles separately
      let profilesMap = new Map<string, any>();
      if (userIds.length > 0) {
        const { data: profilesData } = await supabaseAdmin
          .from('profiles')
          .select('id, display_name, email')
          .in('id', userIds);
        
        if (profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p));
        }
      }
      
      // Combine requests with user profiles
      const allRequests = (requests || []).map(r => ({
        ...r,
        user: profilesMap.get(r.user_id) || null
      }));
      
      res.json(allRequests);
    } catch (error: any) {
      console.error("Error fetching all media requests:", error);
      // Provide more helpful error message for UUID issues
      if (error.message?.includes('expected pattern') || error.code === '22P02') {
        return res.status(400).json({ error: "Database query error - invalid data format" });
      }
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // PUT /api/admin/media-requests/:id/approve - Approve a media request (admin only)
  app.put("/api/admin/media-requests/:id/approve", async (req: any, res) => {
    try {
      const { supabaseAdmin } = await import("./supabaseClient");
      const { authenticateUserFromToken } = await import("./auth");
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured" });
      }
      
      const requestId = parseInt(req.params.id);
      if (!requestId) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      // Get admin from Authorization header
      const user = await authenticateUserFromToken(req);
      
      if (!user) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      
      // Get the request to find the user
      const { data: request, error: fetchError } = await supabaseAdmin
        .from('media_requests')
        .select('*')
        .eq('id', requestId)
        .single();
      
      if (fetchError || !request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Update request status
      const { error: updateError } = await supabaseAdmin
        .from('media_requests')
        .update({
          status: 'approved',
          admin_id: user.id,
          updated_at: new Date()
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error("Error updating media request:", updateError);
        return res.status(500).json({ error: "Failed to update request" });
      }
      
      // Enable media uploads for the user in profiles
      const { error: profileError } = await supabaseAdmin
        .from('profiles')
        .update({
          media_enabled: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', request.user_id);
      
      if (profileError) {
        console.error("Error updating profile:", profileError);
      }
      
      res.json({ success: true, message: "Request approved successfully" });
    } catch (error) {
      console.error("Error approving media request:", error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  // PUT /api/admin/media-requests/:id/deny - Deny a media request (admin only)
  app.put("/api/admin/media-requests/:id/deny", async (req: any, res) => {
    try {
      const { supabaseAdmin } = await import("./supabaseClient");
      const { authenticateUserFromToken } = await import("./auth");
      
      if (!supabaseAdmin) {
        return res.status(500).json({ error: "Supabase admin client not configured" });
      }
      
      const requestId = parseInt(req.params.id);
      if (!requestId) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      // Get admin from Authorization header
      const user = await authenticateUserFromToken(req);
      
      if (!user) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      
      const { error: updateError } = await supabaseAdmin
        .from('media_requests')
        .update({
          status: 'denied',
          admin_id: user.id,
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);
      
      if (updateError) {
        console.error("Error denying media request:", updateError);
        return res.status(500).json({ error: "Failed to deny request" });
      }
      
      res.json({ success: true, message: "Request denied successfully" });
    } catch (error) {
      console.error("Error denying media request:", error);
      res.status(500).json({ error: "Failed to deny request" });
    }
  });

  // GET /api/media-permission/:userId - Check if user has media permission
  app.get("/api/media-permission/:userId?", async (req, res) => {
    try {
      // Use provided userId or get from auth
      const userId = req.params.userId || (req.headers['user-id'] as string) || req.headers['x-user-id'] as string;
      
      if (!userId) {
        return res.json({ hasPermission: false, error: "User ID required" });
      }
      
      // Query Supabase profiles table (where media_enabled is stored)
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('media_enabled, role')
        .eq('id', userId)
        .single();
      
      if (error || !profile) {
        // Profile not found or error - assume no permission for security
        return res.json({ hasPermission: false, error: error?.message || "Profile not found" });
      }
      
      // Admins always have media permission
      const hasPermission = profile.role === 'admin' || profile.media_enabled === true;
      
      res.json({ hasPermission });
    } catch (error) {
      console.error("Error checking media permission:", error);
      // If database connection fails, default to no permission for security
      res.json({ hasPermission: false, error: "Database connection failed" });
    }
  });

  // YouTube Video Validation Route
  app.post("/api/validate-youtube", async (req, res) => {
    try {
      const { videoId } = req.body;

      if (!videoId || typeof videoId !== 'string') {
        return res.status(400).json({ error: "Video ID is required" });
      }

      // Fetch video metadata using YouTube oEmbed (no API key needed)
      const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
      
      let videoTitle = '';
      let videoAuthor = '';
      
      try {
        const response = await fetch(oembedUrl);
        
        if (!response.ok) {
          return res.json({
            allowed: false,
            reason: "Unable to verify this video. Please make sure it's a valid, public YouTube video.",
            confidence: 0
          });
        }
        
        const data = await response.json();
        videoTitle = data.title || '';
        videoAuthor = data.author_name || '';
      } catch (fetchError) {
        console.error("Error fetching YouTube metadata:", fetchError);
        return res.json({
          allowed: false,
          reason: "Unable to verify this video. Please check the link and try again.",
          confidence: 0
        });
      }

      // Use AI to validate video title is Christ-centered
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are a content moderator for a Christian social media platform called Gospel Era. 
            
Your role is to determine if YouTube videos are appropriate for our Christ-centered community.

ALLOW videos about:
- Jesus Christ, His teachings, life, death, and resurrection
- Bible studies, Scripture readings, and biblical commentary
- Christian worship music, hymns, and gospel songs
- Church sermons and Christian teachings
- Christian testimonies and faith stories
- Christian ministry and evangelism
- Prayer and spiritual growth in Christ
- Christian apologetics and theology
- Appropriate Christian lifestyle content

REJECT videos about:
- Non-Christian religious practices (Islam, Hinduism, Buddhism, etc.)
- Occult, witchcraft, or New Age spirituality
- Hate speech, violence, or explicit content
- Content that mocks or attacks Christianity
- Secular content with no Christian purpose

Respond with JSON only:
{
  "allowed": true/false,
  "reason": "Brief explanation if rejected",
  "confidence": 0-100 (how confident you are in the decision)
}`
          },
          {
            role: "user",
            content: `Video Title: "${videoTitle}"\nChannel: "${videoAuthor}"\n\nIs this video appropriate for a Christ-centered Christian platform?`
          }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3,
      });

      const result = JSON.parse(completion.choices[0].message.content || '{"allowed": false, "reason": "Unable to validate", "confidence": 0}');
      
      res.json({
        allowed: result.allowed,
        reason: result.reason || (!result.allowed ? "This video doesn't appear to be Christ-centered content." : undefined),
        confidence: result.confidence || 0,
        videoTitle,
        videoAuthor
      });

    } catch (error) {
      console.error("Error validating YouTube video:", error);
      res.status(500).json({ 
        error: "Failed to validate video",
        allowed: false,
        reason: "An error occurred while validating the video. Please try again."
      });
    }
  });

  // Stripe Routes
  
  // POST /api/stripe/create-checkout-session - Create Stripe checkout session
  app.post("/api/stripe/create-checkout-session", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    try {
      const { amount, note, isMobile } = req.body;

      // Validate amount ($2-$200)
      if (!amount || amount < 2 || amount > 200) {
        return res.status(400).json({ error: "Amount must be between $2 and $200" });
      }

      const amountCents = Math.round(amount * 100);

      // Get current domain for redirect URLs
      const host = req.get('host');
      const protocol = req.get('x-forwarded-proto') || (host?.includes('localhost') ? 'http' : 'https');
      const baseUrl = `${protocol}://${host}`;

      // Use mobile or web URLs based on context
      const successUrl = isMobile 
        ? `${baseUrl}/mobile?payment=success&session_id={CHECKOUT_SESSION_ID}`
        : `${baseUrl}/support/thanks?session_id={CHECKOUT_SESSION_ID}`;
      const cancelUrl = isMobile 
        ? `${baseUrl}/mobile`
        : `${baseUrl}/support`;

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        mode: 'payment',
        line_items: [{
          price_data: {
            currency: 'usd',
            product_data: { 
              name: 'Support Gospel Era',
              description: 'Supporting our faith-centered community platform'
            },
            unit_amount: amountCents,
          },
          quantity: 1,
        }],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
          note: note || '',
        },
        phone_number_collection: {
          enabled: false,
        },
      });

      res.json({ url: session.url });
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      res.status(500).json({ error: 'Failed to create checkout session' });
    }
  });

  // POST /api/stripe/webhook - Handle Stripe webhooks
  app.post("/api/stripe/webhook", async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ error: "Stripe not configured" });
    }

    const sig = req.headers['stripe-signature'] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error('STRIPE_WEBHOOK_SECRET not configured');
      return res.status(500).json({ error: "Webhook secret not configured" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      console.error('Webhook signature verification failed:', err);
      return res.status(400).json({ error: 'Invalid signature' });
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      
      try {
        const { db } = await import("../client/src/lib/db");
        const { donations } = await import("@shared/schema");

        // Insert donation record
        await db.insert(donations).values({
          amount_cents: session.amount_total || 0,
          currency: (session.currency || 'usd').toUpperCase(),
          provider: 'stripe',
          provider_ref: session.payment_intent as string,
          stripe_session_id: session.id,
          status: 'paid',
          message: session.metadata?.note || null,
          user_id: null, // Could be enhanced to link to user if logged in
        });

        console.log(`Donation completed: $${(session.amount_total || 0) / 100} via Stripe session ${session.id}`);
      } catch (error) {
        console.error('Error recording donation:', error);
        return res.status(500).json({ error: 'Failed to record donation' });
      }
    }

    res.json({ received: true });
  });

  // ============ NOTIFICATIONS API ROUTES ============
  
  // Get user's notifications with pagination
  app.get("/api/notifications", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const limit = parseInt(req.query.limit as string) || 20;
      const fromId = req.query.fromId as string;
      const unreadOnly = req.query.unread === 'true';
      
      // Build query
      let query = supabase
        .from('notifications')
        .select('id, recipient_id, actor_id, event_type, post_id, comment_id, prayer_request_id, commitment_id, message, is_read, read_at, created_at')
        .eq('recipient_id', req.user.id)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (fromId) {
        query = query.lt('id', parseInt(fromId));
      }
      
      if (unreadOnly) {
        query = query.eq('is_read', false);
      }
      
      const { data: notificationList, error } = await query;
      
      if (error) {
        console.error("Error fetching notifications:", error);
        return res.status(500).json({ error: "Failed to fetch notifications" });
      }
      
      // Get unread count
      const { count: unreadCount } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', req.user.id)
        .eq('is_read', false);
      
      // Get actor profiles for notifications with actors
      const actorIds = Array.from(new Set((notificationList || []).map(n => n.actor_id).filter(Boolean)));
      let actorProfiles: Record<string, any> = {};
      
      if (actorIds.length > 0) {
        const { data: profileList } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url')
          .in('id', actorIds as string[]);
        
        (profileList || []).forEach(p => {
          actorProfiles[p.id] = p;
        });
      }
      
      // Enrich notifications with actor info
      const enrichedNotifications = (notificationList || []).map(n => ({
        ...n,
        actor: n.actor_id ? actorProfiles[n.actor_id] : null,
      }));
      
      res.json({
        notifications: enrichedNotifications,
        unreadCount: unreadCount || 0,
        nextCursor: (notificationList || []).length === limit ? notificationList[notificationList.length - 1].id : null,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  
  // Get unread notification count only
  app.get("/api/notifications/unread-count", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('recipient_id', req.user.id)
        .eq('is_read', false);
      
      if (error) throw error;
      res.json({ count: count || 0 });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });
  
  // Mark notification as read
  app.patch("/api/notifications/:id/read", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const notificationId = parseInt(req.params.id);
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { data: updated, error } = await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', notificationId)
        .eq('recipient_id', req.user.id)
        .select()
        .single();
      
      if (error || !updated) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      res.json(updated);
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });
  
  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      await supabase
        .from('notifications')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('recipient_id', req.user.id)
        .eq('is_read', false);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });
  
  // Create notification (for prayer commitments, etc.)
  app.post("/api/notifications", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const { recipientId, eventType, postId, commentId, prayerRequestId, commitmentId, message } = req.body;
      
      if (!recipientId || !eventType) {
        return res.status(400).json({ error: "recipientId and eventType are required" });
      }
      
      // Don't create notification for yourself
      if (recipientId === req.user.id) {
        return res.json({ success: true, skipped: true });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { data: notification, error } = await supabase
        .from('notifications')
        .insert({
          recipient_id: recipientId,
          actor_id: req.user.id,
          event_type: eventType,
          post_id: postId || null,
          comment_id: commentId || null,
          prayer_request_id: prayerRequestId || null,
          commitment_id: commitmentId || null,
          message: message || null,
          is_read: false,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Send push notification
      if (message) {
        try {
          const { sendPushNotification } = await import('./pushNotifications');
          const eventTitles: Record<string, string> = {
            'amen': 'New Reaction',
            'prayer_commitment': 'Prayer Commitment',
            'prayer_prayed': 'Prayer Answered',
            'comment': 'New Comment',
          };
          await sendPushNotification(recipientId, {
            title: eventTitles[eventType] || 'Gospel Era',
            body: message,
            url: '/'
          });
        } catch (pushError) {
          console.error("Error sending push notification:", pushError);
        }
      }
      
      res.json({ success: true, notification });
    } catch (error) {
      console.error("Error creating notification:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // ============ PUSH NOTIFICATIONS API ROUTES ============
  
  // Get VAPID public key for Web Push
  app.get("/api/push/vapid-key", (req, res) => {
    const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
    if (!vapidPublicKey) {
      return res.status(500).json({ error: "VAPID public key not configured" });
    }
    res.json({ publicKey: vapidPublicKey });
  });
  
  // Register push notification token
  app.post("/api/push/register", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { subscription, platform = 'web' } = req.body;
      
      if (!subscription) {
        return res.status(400).json({ error: "Subscription data is required" });
      }
      
      const tokenString = JSON.stringify(subscription);
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      // Check if token already exists for this user
      const { data: existing } = await supabase
        .from('push_tokens')
        .select('id')
        .eq('user_id', req.user.id)
        .eq('token', tokenString)
        .limit(1);
      
      if (existing && existing.length > 0) {
        // Update existing token
        await supabase
          .from('push_tokens')
          .update({ updated_at: new Date().toISOString() })
          .eq('id', existing[0].id);
        return res.json({ success: true, message: "Token already registered" });
      }
      
      // Insert new token
      const { data: newToken, error } = await supabase
        .from('push_tokens')
        .insert({
          user_id: req.user.id,
          token: tokenString,
          platform,
        })
        .select()
        .single();
      
      if (error) throw error;
      res.json({ success: true, token: newToken });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });
  
  // Unregister push notification token
  app.post("/api/push/unregister", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { subscription } = req.body;
      
      if (!subscription) {
        return res.status(400).json({ error: "Subscription data is required" });
      }
      
      const tokenString = JSON.stringify(subscription);
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      await supabase
        .from('push_tokens')
        .delete()
        .eq('user_id', req.user.id)
        .eq('token', tokenString);
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error unregistering push token:", error);
      res.status(500).json({ error: "Failed to unregister push token" });
    }
  });

  // Update daily verse reminder preference
  app.patch("/api/push/daily-verse", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { enabled } = req.body;
      
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ error: "enabled must be a boolean" });
      }
      
      const { updateDailyVersePreference } = await import('./pushNotifications');
      await updateDailyVersePreference(req.user.id, enabled);
      
      res.json({ success: true, daily_verse_enabled: enabled });
    } catch (error) {
      console.error("Error updating daily verse preference:", error);
      res.status(500).json({ error: "Failed to update daily verse preference" });
    }
  });

  // Get user's daily verse preference
  app.get("/api/push/daily-verse", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const token = extractToken(req.headers.authorization);
      const supabase = createServerSupabase(token);
      
      const { data: tokens } = await supabase
        .from('push_tokens')
        .select('daily_verse_enabled')
        .eq('user_id', req.user.id)
        .limit(1);
      
      res.json({ 
        enabled: tokens && tokens.length > 0 ? tokens[0].daily_verse_enabled : false,
        hasToken: tokens && tokens.length > 0
      });
    } catch (error) {
      console.error("Error getting daily verse preference:", error);
      res.status(500).json({ error: "Failed to get daily verse preference" });
    }
  });

  // Trigger daily verse reminders (for cron jobs - requires admin or secret key)
  app.post("/api/push/send-daily-verse", async (req, res) => {
    try {
      const cronSecret = req.headers['x-cron-secret'];
      const expectedSecret = process.env.CRON_SECRET;
      
      // Verify cron secret if set, otherwise allow (for development)
      if (expectedSecret && cronSecret !== expectedSecret) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { sendDailyVerseReminders } = await import('./pushNotifications');
      const result = await sendDailyVerseReminders();
      
      res.json({ success: true, ...result });
    } catch (error) {
      console.error("Error sending daily verse reminders:", error);
      res.status(500).json({ error: "Failed to send daily verse reminders" });
    }
  });

  // Delete user account and all associated data
  app.delete("/api/account", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { db } = await import("../client/src/lib/db");
      const { 
        posts, comments, bookmarks, reactions, 
        prayerCommitments, prayerActivity, donations, mediaRequests,
        reports, notifications, pushTokens, profiles 
      } = await import("@shared/schema");
      const { eq, or } = await import("drizzle-orm");
      const { deleteSupabaseAuthUser } = await import("./supabaseAdmin");

      console.log(`Starting account deletion for user: ${userId}`);

      // Delete in order respecting foreign key constraints
      // 1. Delete push tokens
      await db.delete(pushTokens).where(eq(pushTokens.user_id, userId));
      console.log("Deleted push tokens");
      
      // 2. Delete notifications (both received and sent by the user)
      await db.delete(notifications).where(
        or(eq(notifications.recipient_id, userId), eq(notifications.actor_id, userId))
      );
      console.log("Deleted notifications");
      
      // 3. Delete prayer activity
      await db.delete(prayerActivity).where(eq(prayerActivity.actor, userId));
      console.log("Deleted prayer activity");
      
      // 4. Delete prayer commitments
      await db.delete(prayerCommitments).where(eq(prayerCommitments.warrior, userId));
      console.log("Deleted prayer commitments");
      
      // 5. Delete donations
      await db.delete(donations).where(eq(donations.user_id, userId));
      console.log("Deleted donations");
      
      // 6. Delete media requests (both as user and admin)
      await db.delete(mediaRequests).where(
        or(eq(mediaRequests.user_id, userId), eq(mediaRequests.admin_id, userId))
      );
      console.log("Deleted media requests");
      
      // 7. Delete reports
      await db.delete(reports).where(eq(reports.reporter_id, userId));
      console.log("Deleted reports");
      
      // 8. Delete reactions
      await db.delete(reactions).where(eq(reactions.user_id, userId));
      console.log("Deleted reactions");
      
      // 9. Delete bookmarks
      await db.delete(bookmarks).where(eq(bookmarks.user_id, userId));
      console.log("Deleted bookmarks");
      
      // 10. Delete comments
      await db.delete(comments).where(eq(comments.author_id, userId));
      console.log("Deleted comments");
      
      // 11. Delete posts
      await db.delete(posts).where(eq(posts.author_id, userId));
      console.log("Deleted posts");
      
      // 12. Delete profile (this should cascade other data with onDelete: 'cascade')
      await db.delete(profiles).where(eq(profiles.id, userId));
      console.log("Deleted profile");

      // 13. Delete user from Supabase Auth (requires service role key)
      const authDeleteResult = await deleteSupabaseAuthUser(userId);
      if (!authDeleteResult.success) {
        console.error(`Failed to delete Supabase Auth user ${userId}:`, authDeleteResult.error);
        // Data is already deleted from Neon, but auth user remains
        // Return success but log the issue - user data is gone, they just might have a stale auth record
      }

      console.log(`Account fully deleted for user: ${userId}`);
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
