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
      const { db } = await import("@/lib/db");
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
      const { db } = await import("@/lib/db");
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
      const { db } = await import("@/lib/db");
      const { prayerRequests, prayerResponses } = await import("@shared/schema");
      const { eq, sql } = await import("drizzle-orm");
      
      const requestId = req.params.id;
      const userId = req.body.userId || 'anonymous'; // Allow anonymous prayers
      
      // Insert prayer response
      await db.insert(prayerResponses).values({
        prayer_request_id: requestId,
        user_id: userId
      });

      // Increment prayed count
      await db.update(prayerRequests)
        .set({ prayed_count: sql`${prayerRequests.prayed_count} + 1` })
        .where(eq(prayerRequests.id, requestId));

      // Get updated request
      const [updatedRequest] = await db.select()
        .from(prayerRequests)
        .where(eq(prayerRequests.id, requestId));

      res.json(updatedRequest);
    } catch (error) {
      console.error("Error recording prayer:", error);
      res.status(500).json({ error: "Failed to record prayer" });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
