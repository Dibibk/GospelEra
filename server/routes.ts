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

      // Import database and schema
      const { db } = await import("../client/src/lib/db");
      const { profiles } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Build update object (only include defined fields)
      const updateData: any = { updated_at: new Date() };
      if (display_name !== undefined) updateData.display_name = display_name;
      if (bio !== undefined) updateData.bio = bio;
      if (avatar_url !== undefined) updateData.avatar_url = avatar_url;
      if (show_name_on_prayers !== undefined) updateData.show_name_on_prayers = show_name_on_prayers;
      if (private_profile !== undefined) updateData.private_profile = private_profile;
      if (settings !== undefined) updateData.settings = settings;

      // Update profile via Drizzle (server-side with DATABASE_URL)
      const result = await db
        .update(profiles)
        .set(updateData)
        .where(eq(profiles.id, req.user.id))
        .returning();

      if (!result || result.length === 0) {
        return res.status(404).json({ error: "Profile not found" });
      }

      res.json(result[0]);
    } catch (error) {
      console.error("Error updating profile:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  // Posts API Routes
  app.get("/api/posts", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { posts } = await import("@shared/schema");
      const { desc, eq, lt } = await import("drizzle-orm");
      
      const limit = parseInt(req.query.limit as string) || 20;
      const fromId = req.query.fromId as string;
      const authorId = req.query.authorId as string;
      
      // Build where conditions
      const { and } = await import("drizzle-orm");
      let whereConditions = [eq(posts.hidden, false)];  // Only show non-hidden posts
      
      // Add author filter if provided
      if (authorId) {
        whereConditions.push(eq(posts.author_id, authorId));
      }
      
      // Add keyset pagination if fromId is provided
      if (fromId) {
        // Get the created_at timestamp of the fromId post for keyset pagination
        const [fromPost] = await db.select({ created_at: posts.created_at })
          .from(posts)
          .where(eq(posts.id, parseInt(fromId)));
        
        if (fromPost) {
          whereConditions.push(lt(posts.created_at, fromPost.created_at));
        }
      }
      
      const query = db.select().from(posts)
        .where(and(...whereConditions))
        .orderBy(desc(posts.created_at))
        .limit(limit);
      
      const allPosts = await query;
      res.json(allPosts);
    } catch (error) {
      console.error("Error fetching posts:", error);
      res.status(500).json({ error: "Failed to fetch posts" });
    }
  });

  // OPTIMIZED FEED ENDPOINT - Combines posts + authors + engagement in ONE query
  app.get("/api/feed", optionalAuth, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { posts, profiles, reactions, comments } = await import("@shared/schema");
      const { desc, eq, lt, and, or, count, inArray } = await import("drizzle-orm");
      
      const limit = parseInt(req.query.limit as string) || 20;
      const fromId = req.query.fromId as string;
      const currentUserId = req.user?.id;
      
      let whereConditions = [eq(posts.hidden, false)];
      
      // Add keyset pagination if fromId is provided (using created_at, id for proper cursor)
      if (fromId) {
        const [fromPost] = await db.select({ created_at: posts.created_at, id: posts.id })
          .from(posts)
          .where(eq(posts.id, parseInt(fromId)));
        
        if (fromPost) {
          // Proper keyset pagination: (created_at < fromPost.created_at) OR (created_at = fromPost.created_at AND id < fromPost.id)
          whereConditions.push(
            or(
              lt(posts.created_at, fromPost.created_at),
              and(
                eq(posts.created_at, fromPost.created_at),
                lt(posts.id, fromPost.id)
              )
            )!
          );
        }
      }
      
      // Fetch posts
      const feedPosts = await db.select().from(posts)
        .where(and(...whereConditions))
        .orderBy(desc(posts.created_at), desc(posts.id))
        .limit(limit);
      
      if (feedPosts.length === 0) {
        return res.json({ posts: [], profiles: {}, engagement: {}, nextCursor: null });
      }
      
      const postIds = feedPosts.map(p => p.id);
      const authorIds = Array.from(new Set(feedPosts.map(p => p.author_id)));
      
      // Fetch all author profiles in ONE query using inArray (select only essential columns)
      const authorProfiles = await db.select({
        id: profiles.id,
        email: profiles.email,
        display_name: profiles.display_name,
        bio: profiles.bio,
        avatar_url: profiles.avatar_url,
        role: profiles.role,
      }).from(profiles)
        .where(inArray(profiles.id, authorIds));
      
      // Fetch all reactions counts + user's reactions in ONE query using inArray
      const reactionRows = await db.select({
        post_id: reactions.post_id,
        user_id: reactions.user_id
      }).from(reactions)
        .where(and(
          inArray(reactions.post_id, postIds),
          eq(reactions.kind, 'amen')
        ));
      
      // Fetch all comment counts in ONE query using inArray
      const commentCounts = await db.select({
        post_id: comments.post_id,
        count: count()
      }).from(comments)
        .where(and(
          inArray(comments.post_id, postIds),
          eq(comments.deleted, false),
          eq(comments.hidden, false)
        ))
        .groupBy(comments.post_id);
      
      // Build profiles map
      const profilesMap: Record<string, any> = {};
      authorProfiles.forEach(profile => {
        profilesMap[profile.id] = profile;
      });
      
      // Build engagement map
      const engagementMap: Record<number, any> = {};
      postIds.forEach(postId => {
        engagementMap[postId] = { amenCount: 0, userAmened: false, commentCount: 0 };
      });
      
      // Count reactions and check user's reactions
      reactionRows.forEach((row: any) => {
        if (engagementMap[row.post_id]) {
          engagementMap[row.post_id].amenCount++;
          if (currentUserId && row.user_id === currentUserId) {
            engagementMap[row.post_id].userAmened = true;
          }
        }
      });
      
      // Add comment counts
      commentCounts.forEach((row: any) => {
        if (engagementMap[row.post_id]) {
          engagementMap[row.post_id].commentCount = row.count;
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

  app.post("/api/posts", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { posts, insertPostSchema } = await import("@shared/schema");
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

      const postData = {
        title: result.data.title,
        content: result.data.content,
        tags: result.data.tags || [],
        embed_url: result.data.embed_url || null,
        author_id: req.user.id  // Use authenticated user ID
      };
      
      const [newPost] = await db.insert(posts).values(postData).returning();
      res.status(201).json(newPost);
    } catch (error) {
      console.error("Error creating post:", error);
      res.status(500).json({ error: "Failed to create post" });
    }
  });

  app.put("/api/posts/:id", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { posts, insertPostSchema } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const postId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const result = insertPostSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid post data", issues: result.error.issues });
      }
      
      // First, check if the post exists and belongs to the user
      const [existingPost] = await db.select()
        .from(posts)
        .where(eq(posts.id, postId));
      
      if (!existingPost) {
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
        updated_at: new Date()
      };
      
      // Update the post
      const [updatedPost] = await db.update(posts)
        .set(postData)
        .where(eq(posts.id, postId))
        .returning();
      
      res.json({ success: true, data: updatedPost });
    } catch (error) {
      console.error("Error updating post:", error);
      res.status(500).json({ error: "Failed to update post" });
    }
  });

  app.delete("/api/posts/:id", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { posts } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      const postId = parseInt(req.params.id);
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      // First, check if the post exists
      const [existingPost] = await db.select()
        .from(posts)
        .where(eq(posts.id, postId));
      
      if (!existingPost) {
        return res.status(404).json({ error: "Post not found" });
      }

      // Check if user can delete: post author or admin
      const isAdmin = req.user.role === 'admin';
      const isOwner = existingPost.author_id === req.user.id;
      
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ error: "You don't have permission to delete this post" });
      }
      
      // Soft delete by setting hidden = true (preserves data for admin review)
      const [deletedPost] = await db.update(posts)
        .set({ 
          hidden: true,
          title: "[Deleted]",
          content: "[This post has been deleted by the author]",
          embed_url: null,  // Clear the YouTube link
          media_urls: []    // Clear any media URLs
        })
        .where(eq(posts.id, postId))
        .returning();
      
      res.json({ success: true, data: deletedPost });
    } catch (error) {
      console.error("Error deleting post:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Comments API Routes
  app.post("/api/comments", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { comments, insertCommentSchema } = await import("@shared/schema");
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

      const commentData = {
        content: result.data.content,
        post_id: result.data.post_id,
        author_id: req.user.id  // Use authenticated user ID
      };
      
      const [newComment] = await db.insert(comments).values(commentData).returning();
      
      // Create notification for post author (if not commenting on own post)
      try {
        const { posts, notifications, profiles } = await import("@shared/schema");
        const { eq } = await import("drizzle-orm");
        
        const [post] = await db.select({ author_id: posts.author_id, title: posts.title })
          .from(posts)
          .where(eq(posts.id, result.data.post_id));
        
        if (post && post.author_id !== req.user.id) {
          // Get commenter's display name
          const [commenterProfile] = await db.select({ display_name: profiles.display_name })
            .from(profiles)
            .where(eq(profiles.id, req.user.id));
          
          const commenterName = commenterProfile?.display_name || 'Someone';
          const postTitle = post.title?.slice(0, 30) || 'your post';
          const message = `${commenterName} commented on "${postTitle}${post.title?.length > 30 ? '...' : ''}"`;
          
          await db.insert(notifications).values({
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
        // Don't fail the comment creation if notification fails
      }
      
      res.status(201).json(newComment);
    } catch (error) {
      console.error("Error creating comment:", error);
      res.status(500).json({ error: "Failed to create comment" });
    }
  });

  // Prayer Request Routes
  app.get("/api/prayer-requests", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { prayerRequests } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      
      const requests = await db.select().from(prayerRequests).orderBy(desc(prayerRequests.created_at));
      res.json(requests);
    } catch (error) {
      console.error("Error fetching prayer requests:", error);
      res.status(500).json({ error: "Failed to fetch prayer requests" });
    }
  });

  app.post("/api/prayer-requests", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { prayerRequests, insertPrayerRequestSchema } = await import("@shared/schema");
      const { validateFaithContent } = await import("../shared/moderation");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const result = insertPrayerRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", issues: result.error.issues });
      }

      // Server-side faith validation (backup/enforcement)
      const titleValidation = validateFaithContent(result.data.title?.trim() || '');
      const detailsValidation = validateFaithContent(result.data.details?.trim() || '');
      
      if (!titleValidation.isValid && !detailsValidation.isValid) {
        return res.status(400).json({ 
          error: "Content must be Christ-centered", 
          reason: titleValidation.reason || 'Please keep your prayer request centered on Jesus or Scripture.'
        });
      }

      const [newRequest] = await db.insert(prayerRequests).values(result.data).returning();
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating prayer request:", error);
      res.status(500).json({ error: "Failed to create prayer request" });
    }
  });

  app.post("/api/prayer-requests/:id/pray", authenticateUser, checkNotBanned, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { prayerRequests, prayerActivity } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const requestId = req.params.id;
      const userId = req.user.id;
      
      // Insert prayer activity
      await db.insert(prayerActivity).values({
        request_id: parseInt(requestId),
        kind: 'prayed',
        actor: userId
      });

      // Get updated request (no update needed, just fetch)
      // Prayer requests table doesn't have updated_at field

      // Get updated request
      const [updatedRequest] = await db.select()
        .from(prayerRequests)
        .where(eq(prayerRequests.id, parseInt(requestId)));

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error recording prayer:", error);
      res.status(500).json({ error: "Failed to record prayer" });
    }
  });

  // Donations API Routes
  app.post("/api/donations", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { donations, insertDonationSchema } = await import("@shared/schema");
      
      const result = insertDonationSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid donation data", issues: result.error.issues });
      }

      const [newDonation] = await db.insert(donations).values(result.data).returning();
      res.status(201).json(newDonation);
    } catch (error) {
      console.error("Error creating donation:", error);
      res.status(500).json({ error: "Failed to create donation" });
    }
  });

  app.get("/api/donations", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { donations } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");
      
      const userId = req.query.userId as string;
      
      let query = db.select().from(donations).orderBy(desc(donations.created_at));
      
      // Filter by user if userId provided
      if (userId) {
        query = query.where(eq(donations.user_id, userId)) as any;
      }

      const userDonations = await query;
      res.json(userDonations);
    } catch (error) {
      console.error("Error fetching donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // Admin endpoint to get all donations
  app.get("/api/admin/donations", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { donations } = await import("@shared/schema");
      const { desc } = await import("drizzle-orm");
      
      const allDonations = await db.select().from(donations).orderBy(desc(donations.created_at));
      res.json(allDonations);
    } catch (error) {
      console.error("Error fetching all donations:", error);
      res.status(500).json({ error: "Failed to fetch donations" });
    }
  });

  // Media Requests API Routes
  // POST /api/media-requests - Submit a media access request
  app.post("/api/media-requests", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { mediaRequests } = await import("@shared/schema");
      
      const { reason } = req.body;
      
      if (!reason || !reason.trim()) {
        return res.status(400).json({ error: "Reason is required" });
      }
      
      // Get user ID from headers (set by frontend auth)
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      
      const [newRequest] = await db.insert(mediaRequests).values({
        user_id: userId,
        reason: reason.trim(),
        status: 'pending'
      }).returning();
      
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating media request:", error);
      res.status(500).json({ error: "Failed to create media request" });
    }
  });

  // GET /api/media-requests/my - Get current user's requests
  app.get("/api/media-requests/my", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { mediaRequests } = await import("@shared/schema");
      const { eq, desc } = await import("drizzle-orm");
      
      // Get user ID from headers (set by frontend auth)  
      const userId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!userId) {
        return res.status(401).json({ error: "User authentication required" });
      }
      
      const userRequests = await db.select()
        .from(mediaRequests)
        .where(eq(mediaRequests.user_id, userId))
        .orderBy(desc(mediaRequests.created_at));
      
      res.json(userRequests);
    } catch (error) {
      console.error("Error fetching user media requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // GET /api/admin/media-requests - Get all media requests (admin only)
  app.get("/api/admin/media-requests", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { mediaRequests, profiles } = await import("@shared/schema");
      const { desc, eq } = await import("drizzle-orm");
      
      // TODO: Add admin authentication check
      
      const allRequests = await db
        .select({
          id: mediaRequests.id,
          user_id: mediaRequests.user_id,
          status: mediaRequests.status,
          reason: mediaRequests.reason,
          admin_id: mediaRequests.admin_id,
          created_at: mediaRequests.created_at,
          updated_at: mediaRequests.updated_at,
          user: {
            id: profiles.id,
            display_name: profiles.display_name,
            email: profiles.email
          }
        })
        .from(mediaRequests)
        .leftJoin(profiles, eq(mediaRequests.user_id, profiles.id))
        .orderBy(desc(mediaRequests.created_at));
      
      res.json(allRequests);
    } catch (error) {
      console.error("Error fetching all media requests:", error);
      res.status(500).json({ error: "Failed to fetch requests" });
    }
  });

  // PUT /api/admin/media-requests/:id/approve - Approve a media request (admin only)
  app.put("/api/admin/media-requests/:id/approve", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { mediaRequests, profiles } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const requestId = parseInt(req.params.id);
      if (!requestId) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      // Get admin ID from authentication headers
      const adminId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!adminId) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      
      // Get the request to find the user
      const [request] = await db.select()
        .from(mediaRequests)
        .where(eq(mediaRequests.id, requestId));
      
      if (!request) {
        return res.status(404).json({ error: "Request not found" });
      }
      
      // Update request status
      await db.update(mediaRequests)
        .set({
          status: 'approved',
          admin_id: adminId,
          updated_at: new Date()
        })
        .where(eq(mediaRequests.id, requestId));
      
      // Enable media uploads for the user  
      await db.update(profiles)
        .set({
          media_enabled: true,
          updated_at: new Date()
        })
        .where(eq(profiles.id, request.user_id));
      
      res.json({ success: true, message: "Request approved successfully" });
    } catch (error) {
      console.error("Error approving media request:", error);
      res.status(500).json({ error: "Failed to approve request" });
    }
  });

  // PUT /api/admin/media-requests/:id/deny - Deny a media request (admin only)
  app.put("/api/admin/media-requests/:id/deny", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { mediaRequests } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      const requestId = parseInt(req.params.id);
      if (!requestId) {
        return res.status(400).json({ error: "Invalid request ID" });
      }
      
      // Get admin ID from authentication headers
      const adminId = req.headers['x-user-id'] as string || req.headers['user-id'] as string;
      
      if (!adminId) {
        return res.status(401).json({ error: "Admin authentication required" });
      }
      
      await db.update(mediaRequests)
        .set({
          status: 'denied',
          admin_id: adminId,
          updated_at: new Date()
        })
        .where(eq(mediaRequests.id, requestId));
      
      res.json({ success: true, message: "Request denied successfully" });
    } catch (error) {
      console.error("Error denying media request:", error);
      res.status(500).json({ error: "Failed to deny request" });
    }
  });

  // GET /api/media-permission/:userId - Check if user has media permission
  app.get("/api/media-permission/:userId?", async (req, res) => {
    try {
      // Set shorter timeout for this specific request
      req.setTimeout(10000); // 10 seconds instead of 30
      
      const { db } = await import("../client/src/lib/db");
      const { profiles } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      // Use provided userId or get from auth
      const userId = req.params.userId || (req.headers['user-id'] as string) || req.headers['x-user-id'] as string;
      
      // Add timeout promise to race against database query
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database query timeout')), 8000)
      );
      
      const queryPromise = db.select({ 
        media_enabled: profiles.media_enabled,
        role: profiles.role 
      })
        .from(profiles)
        .where(eq(profiles.id, userId));
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const [profile] = result as any[];
      
      if (!profile) {
        // If database is unreachable, assume no permission for security
        return res.json({ hasPermission: false, error: "Database unavailable - assuming no permission" });
      }
      
      // Admins always have media permission
      const hasPermission = profile.role === 'admin' || profile.media_enabled;
      
      res.json({ hasPermission });
    } catch (error) {
      console.error("Error checking media permission:", error);
      // If database connection fails, default to no permission for security
      res.json({ hasPermission: false, error: "Database connection failed - check DATABASE_URL format" });
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
      const { db } = await import("../client/src/lib/db");
      const { notifications, profiles } = await import("@shared/schema");
      const { desc, eq, and, lt } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const limit = parseInt(req.query.limit as string) || 20;
      const fromId = req.query.fromId as string;
      const unreadOnly = req.query.unread === 'true';
      
      // Build conditions
      const conditions = [eq(notifications.recipient_id, req.user.id)];
      
      if (fromId) {
        conditions.push(lt(notifications.id, parseInt(fromId)));
      }
      
      if (unreadOnly) {
        conditions.push(eq(notifications.is_read, false));
      }
      
      // Fetch notifications with actor profile info
      const notificationList = await db.select({
        id: notifications.id,
        recipient_id: notifications.recipient_id,
        actor_id: notifications.actor_id,
        event_type: notifications.event_type,
        post_id: notifications.post_id,
        comment_id: notifications.comment_id,
        prayer_request_id: notifications.prayer_request_id,
        commitment_id: notifications.commitment_id,
        message: notifications.message,
        is_read: notifications.is_read,
        read_at: notifications.read_at,
        created_at: notifications.created_at,
      })
        .from(notifications)
        .where(and(...conditions))
        .orderBy(desc(notifications.created_at))
        .limit(limit);
      
      // Get unread count
      const { count: countFn } = await import("drizzle-orm");
      const [unreadCountResult] = await db.select({ count: countFn() })
        .from(notifications)
        .where(and(
          eq(notifications.recipient_id, req.user.id),
          eq(notifications.is_read, false)
        ));
      
      const unreadCount = unreadCountResult?.count || 0;
      
      // Get actor profiles for notifications with actors
      const actorIds = Array.from(new Set(notificationList.map(n => n.actor_id).filter(Boolean)));
      let actorProfiles: Record<string, any> = {};
      
      if (actorIds.length > 0) {
        const { inArray } = await import("drizzle-orm");
        const profileList = await db.select({
          id: profiles.id,
          display_name: profiles.display_name,
          avatar_url: profiles.avatar_url,
        })
          .from(profiles)
          .where(inArray(profiles.id, actorIds as string[]));
        
        profileList.forEach(p => {
          actorProfiles[p.id] = p;
        });
      }
      
      // Enrich notifications with actor info
      const enrichedNotifications = notificationList.map(n => ({
        ...n,
        actor: n.actor_id ? actorProfiles[n.actor_id] : null,
      }));
      
      res.json({
        notifications: enrichedNotifications,
        unreadCount,
        nextCursor: notificationList.length === limit ? notificationList[notificationList.length - 1].id : null,
      });
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ error: "Failed to fetch notifications" });
    }
  });
  
  // Get unread notification count only
  app.get("/api/notifications/unread-count", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { notifications } = await import("@shared/schema");
      const { eq, and, count } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const [result] = await db.select({ count: count() })
        .from(notifications)
        .where(and(
          eq(notifications.recipient_id, req.user.id),
          eq(notifications.is_read, false)
        ));
      
      res.json({ count: result?.count || 0 });
    } catch (error) {
      console.error("Error fetching unread count:", error);
      res.status(500).json({ error: "Failed to fetch unread count" });
    }
  });
  
  // Mark notification as read
  app.patch("/api/notifications/:id/read", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { notifications } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      const notificationId = parseInt(req.params.id);
      
      const [updated] = await db.update(notifications)
        .set({ is_read: true, read_at: new Date() })
        .where(and(
          eq(notifications.id, notificationId),
          eq(notifications.recipient_id, req.user.id)
        ))
        .returning();
      
      if (!updated) {
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
      const { db } = await import("../client/src/lib/db");
      const { notifications } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      
      await db.update(notifications)
        .set({ is_read: true, read_at: new Date() })
        .where(and(
          eq(notifications.recipient_id, req.user.id),
          eq(notifications.is_read, false)
        ));
      
      res.json({ success: true });
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });
  
  // Create notification (for prayer commitments, etc.)
  app.post("/api/notifications", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { notifications } = await import("@shared/schema");
      
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
      
      const [notification] = await db.insert(notifications)
        .values({
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
        .returning();
      
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
      const { db } = await import("../client/src/lib/db");
      const { pushTokens } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { subscription, platform = 'web' } = req.body;
      
      if (!subscription) {
        return res.status(400).json({ error: "Subscription data is required" });
      }
      
      const tokenString = JSON.stringify(subscription);
      
      // Check if token already exists for this user
      const existing = await db.select()
        .from(pushTokens)
        .where(and(
          eq(pushTokens.user_id, req.user.id),
          eq(pushTokens.token, tokenString)
        ))
        .limit(1);
      
      if (existing.length > 0) {
        // Update existing token
        await db.update(pushTokens)
          .set({ updated_at: new Date() })
          .where(eq(pushTokens.id, existing[0].id));
        return res.json({ success: true, message: "Token already registered" });
      }
      
      // Insert new token
      const [token] = await db.insert(pushTokens)
        .values({
          user_id: req.user.id,
          token: tokenString,
          platform,
        })
        .returning();
      
      res.json({ success: true, token });
    } catch (error) {
      console.error("Error registering push token:", error);
      res.status(500).json({ error: "Failed to register push token" });
    }
  });
  
  // Unregister push notification token
  app.post("/api/push/unregister", authenticateUser, async (req: AuthenticatedRequest, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { pushTokens } = await import("@shared/schema");
      const { eq, and } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const { subscription } = req.body;
      
      if (!subscription) {
        return res.status(400).json({ error: "Subscription data is required" });
      }
      
      const tokenString = JSON.stringify(subscription);
      
      await db.delete(pushTokens)
        .where(and(
          eq(pushTokens.user_id, req.user.id),
          eq(pushTokens.token, tokenString)
        ));
      
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
      const { db } = await import("../client/src/lib/db");
      const { pushTokens } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");
      
      if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      
      const tokens = await db.select({ daily_verse_enabled: pushTokens.daily_verse_enabled })
        .from(pushTokens)
        .where(eq(pushTokens.user_id, req.user.id))
        .limit(1);
      
      res.json({ 
        enabled: tokens.length > 0 ? tokens[0].daily_verse_enabled : false,
        hasToken: tokens.length > 0
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
        prayerCommitments, reports, notifications, pushTokens, profiles 
      } = await import("@shared/schema");
      const { eq } = await import("drizzle-orm");

      // Delete in order respecting foreign key constraints
      // 1. Delete push tokens
      await db.delete(pushTokens).where(eq(pushTokens.user_id, userId));
      
      // 2. Delete notifications (both received and sent)
      await db.delete(notifications).where(eq(notifications.recipient_id, userId));
      
      // 3. Delete prayer commitments
      await db.delete(prayerCommitments).where(eq(prayerCommitments.warrior, userId));
      
      // 4. Delete reports
      await db.delete(reports).where(eq(reports.reporter_id, userId));
      
      // 5. Delete reactions
      await db.delete(reactions).where(eq(reactions.user_id, userId));
      
      // 6. Delete bookmarks
      await db.delete(bookmarks).where(eq(bookmarks.user_id, userId));
      
      // 7. Delete comments
      await db.delete(comments).where(eq(comments.author_id, userId));
      
      // 8. Delete posts
      await db.delete(posts).where(eq(posts.author_id, userId));
      
      // 9. Delete profile (this should cascade other data with onDelete: 'cascade')
      await db.delete(profiles).where(eq(profiles.id, userId));

      console.log(`Account deleted for user: ${userId}`);
      res.json({ success: true, message: "Account deleted successfully" });
    } catch (error) {
      console.error("Error deleting account:", error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
