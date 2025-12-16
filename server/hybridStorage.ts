import { ObjectStorageService, ObjectNotFoundError } from "./objectStorage";
import { S3StorageService, S3NotFoundError } from "./s3Storage";
import { Response } from "express";

/**
 * Hybrid storage service that can use either S3 or Replit Object Storage
 * Automatically falls back to Replit Object Storage if S3 is not configured
 */
export class HybridStorageService {
  private s3Service: S3StorageService;
  private objectStorageService: ObjectStorageService;
  private useS3: boolean;

  constructor() {
    this.s3Service = new S3StorageService();
    this.objectStorageService = new ObjectStorageService();
    this.useS3 = this.s3Service.isConfigured();

    console.log(`Storage mode: ${this.useS3 ? 'AWS S3' : 'Replit Object Storage'}`);
    if (this.useS3) {
      console.log('S3 Bucket Info:', this.s3Service.getBucketInfo());
    }
  }

  /**
   * Get upload URL for media files (posts)
   */
  async getMediaUploadURL(): Promise<string> {
    if (this.useS3) {
      return this.s3Service.getMediaUploadURL();
    } else {
      return this.objectStorageService.getObjectEntityUploadURL();
    }
  }

  /**
   * Get upload URL for avatar files
   */
  async getAvatarUploadURL(): Promise<string> {
    if (this.useS3) {
      return this.s3Service.getAvatarUploadURL();
    } else {
      return this.objectStorageService.getObjectEntityUploadURL();
    }
  }

  /**
   * Search for and serve a public object
   */
  async servePublicObject(filePath: string, res: Response): Promise<void> {
    if (this.useS3) {
      const result = await this.s3Service.getPublicObject(filePath);
      if (result.exists && result.key) {
        await this.s3Service.streamObjectToResponse(result.key, res);
      } else {
        res.status(404).json({ error: "File not found" });
      }
    } else {
      const file = await this.objectStorageService.searchPublicObject(filePath);
      if (file) {
        this.objectStorageService.downloadObject(file, res);
      } else {
        res.status(404).json({ error: "File not found" });
      }
    }
  }

  /**
   * Serve a private object (user uploads)
   */
  async servePrivateObject(objectPath: string, res: Response): Promise<void> {
    try {
      if (this.useS3) {
        const result = await this.s3Service.getPrivateObject(objectPath);
        if (result.exists && result.key) {
          await this.s3Service.streamObjectToResponse(result.key, res);
        } else {
          res.sendStatus(404);
        }
      } else {
        const objectFile = await this.objectStorageService.getObjectEntityFile(objectPath);
        this.objectStorageService.downloadObject(objectFile, res);
      }
    } catch (error) {
      console.error("Error serving private object:", error);
      if (error instanceof ObjectNotFoundError || error instanceof S3NotFoundError) {
        res.sendStatus(404);
      } else {
        res.sendStatus(500);
      }
    }
  }

  /**
   * Normalize upload URL to object path
   */
  normalizeUploadUrlToObjectPath(url: string): string {
    if (this.useS3) {
      return this.s3Service.normalizeS3UrlToObjectPath(url);
    } else {
      return this.objectStorageService.normalizeObjectEntityPath(url);
    }
  }

  /**
   * Get storage information for debugging
   */
  getStorageInfo() {
    return {
      activeStorage: this.useS3 ? 'AWS S3' : 'Replit Object Storage',
      s3Configured: this.s3Service.isConfigured(),
      ...(this.useS3 ? { s3Info: this.s3Service.getBucketInfo() } : {}),
    };
  }

  /**
   * Check if using S3 storage
   */
  isUsingS3(): boolean {
    return this.useS3;
  }
}