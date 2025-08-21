import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  ObjectStorageService,
  ObjectNotFoundError,
} from "./objectStorage";
import { HybridStorageService } from "./hybridStorage";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize hybrid storage service (S3 or Replit Object Storage)
  const hybridStorage = new HybridStorageService();
  
  // Log storage configuration
  console.log("Storage Configuration:", hybridStorage.getStorageInfo());

  // Storage status endpoint for debugging
  app.get("/api/storage/status", (req, res) => {
    res.json(hybridStorage.getStorageInfo());
  });

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
  app.post("/api/objects/upload", async (req, res) => {
    try {
      const uploadURL = await hybridStorage.getAvatarUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting avatar upload URL:", error);
      res.status(500).json({ error: "Failed to get upload URL" });
    }
  });

  // Endpoint for updating avatar after upload
  app.put("/api/avatar", async (req, res) => {
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
  app.post("/api/media/upload", async (req, res) => {
    try {
      const uploadURL = await hybridStorage.getMediaUploadURL();
      res.json({ uploadURL });
    } catch (error) {
      console.error("Error getting media upload URL:", error);
      res.status(500).json({ error: "Failed to get media upload URL" });
    }
  });

  // Endpoint for processing media after upload
  app.put("/api/media", async (req, res) => {
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
  app.patch("/api/admin/users/:userId/role", async (req, res) => {
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
  app.get("/api/admin/banned-users", async (req, res) => {
    try {
      const bannedUsers = await storage.getBannedUsers();
      res.json(bannedUsers);
    } catch (error) {
      console.error("Error fetching banned users:", error);
      res.status(500).json({ error: "Failed to fetch banned users" });
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

  app.post("/api/prayer-requests", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { prayerRequests, insertPrayerRequestSchema } = await import("@shared/schema");
      
      const result = insertPrayerRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ error: "Invalid request data", issues: result.error.issues });
      }

      const [newRequest] = await db.insert(prayerRequests).values(result.data).returning();
      res.status(201).json(newRequest);
    } catch (error) {
      console.error("Error creating prayer request:", error);
      res.status(500).json({ error: "Failed to create prayer request" });
    }
  });

  app.post("/api/prayer-requests/:id/pray", async (req, res) => {
    try {
      const { db } = await import("../client/src/lib/db");
      const { prayerRequests, prayerActivity } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      const requestId = req.params.id;
      const userId = req.body.userId || 'anonymous'; // Allow anonymous prayers
      
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
      
      const queryPromise = db.select({ media_enabled: profiles.media_enabled })
        .from(profiles)
        .where(eq(profiles.id, userId));
      
      const result = await Promise.race([queryPromise, timeoutPromise]);
      const [profile] = result as any[];
      
      if (!profile) {
        // If database is unreachable, assume no permission for security
        return res.json({ hasPermission: false, error: "Database unavailable - assuming no permission" });
      }
      
      res.json({ hasPermission: profile.media_enabled });
    } catch (error) {
      console.error("Error checking media permission:", error);
      // If database connection fails, default to no permission for security
      res.json({ hasPermission: false, error: "Database connection failed - check DATABASE_URL format" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
