import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { Response } from "express";
import { randomUUID } from "crypto";

export class S3NotFoundError extends Error {
  constructor() {
    super("S3 object not found");
    this.name = "S3NotFoundError";
    Object.setPrototypeOf(this, S3NotFoundError.prototype);
  }
}

export class S3StorageService {
  private s3Client: S3Client;
  private bucketName: string;
  private publicPrefix: string;
  private privatePrefix: string;

  constructor() {
    // Initialize S3 client with environment variables
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
      },
    });

    this.bucketName = process.env.AWS_S3_BUCKET_NAME || "";
    this.publicPrefix = process.env.S3_PUBLIC_PREFIX || "public";
    this.privatePrefix = process.env.S3_PRIVATE_PREFIX || "private";

    if (!this.bucketName) {
      console.warn("AWS_S3_BUCKET_NAME not configured - S3 storage will not work");
    }
  }

  /**
   * Check if S3 is properly configured
   */
  isConfigured(): boolean {
    return !!(
      process.env.AWS_ACCESS_KEY_ID &&
      process.env.AWS_SECRET_ACCESS_KEY &&
      process.env.AWS_S3_BUCKET_NAME
    );
  }

  /**
   * Generate presigned URL for uploading media files
   */
  async getMediaUploadURL(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("S3 not configured - missing AWS credentials or bucket name");
    }

    const objectId = randomUUID();
    const key = `${this.privatePrefix}/uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: "application/octet-stream", // Will be overridden by client
    });

    // Generate presigned URL valid for 15 minutes
    const presignedUrl = await getSignedUrl(this.s3Client, command, { 
      expiresIn: 900 
    });

    return presignedUrl;
  }

  /**
   * Generate presigned URL for uploading avatar files
   */
  async getAvatarUploadURL(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error("S3 not configured - missing AWS credentials or bucket name");
    }

    const objectId = randomUUID();
    const key = `${this.privatePrefix}/avatars/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucketName,
      Key: key,
      ContentType: "image/*",
    });

    const presignedUrl = await getSignedUrl(this.s3Client, command, { 
      expiresIn: 900 
    });

    return presignedUrl;
  }

  /**
   * Get a public object by searching in public directories
   */
  async getPublicObject(filePath: string): Promise<{ exists: boolean; key?: string }> {
    if (!this.isConfigured()) {
      return { exists: false };
    }

    const key = `${this.publicPrefix}/${filePath}`;

    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      return { exists: true, key };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Get a private object by path
   */
  async getPrivateObject(objectPath: string): Promise<{ exists: boolean; key?: string }> {
    if (!this.isConfigured()) {
      return { exists: false };
    }

    // Remove /objects/ prefix if present
    const cleanPath = objectPath.startsWith("/objects/") 
      ? objectPath.slice(9) 
      : objectPath;

    const key = `${this.privatePrefix}/${cleanPath}`;

    try {
      await this.s3Client.send(new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      }));
      return { exists: true, key };
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return { exists: false };
      }
      throw error;
    }
  }

  /**
   * Stream an S3 object to HTTP response
   */
  async streamObjectToResponse(key: string, res: Response, cacheTtlSec: number = 3600): Promise<void> {
    if (!this.isConfigured()) {
      throw new Error("S3 not configured");
    }

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      const response = await this.s3Client.send(command);

      if (!response.Body) {
        throw new S3NotFoundError();
      }

      // Set appropriate headers
      res.set({
        "Content-Type": response.ContentType || "application/octet-stream",
        "Content-Length": response.ContentLength?.toString() || "",
        "Cache-Control": `public, max-age=${cacheTtlSec}`,
        "ETag": response.ETag || "",
        "Last-Modified": response.LastModified?.toUTCString() || "",
      });

      // Stream the response body
      const stream = response.Body as NodeJS.ReadableStream;
      
      stream.on("error", (err) => {
        console.error("S3 stream error:", err);
        if (!res.headersSent) {
          res.status(500).json({ error: "Error streaming file from S3" });
        }
      });

      stream.pipe(res);
    } catch (error: any) {
      console.error("Error streaming S3 object:", error);
      if (error.name === "NoSuchKey" || error.$metadata?.httpStatusCode === 404) {
        throw new S3NotFoundError();
      }
      throw error;
    }
  }

  /**
   * Normalize S3 URL to object path
   */
  normalizeS3UrlToObjectPath(url: string): string {
    if (!url) return "";

    // Handle S3 URLs (https://bucket.s3.region.amazonaws.com/key or https://s3.region.amazonaws.com/bucket/key)
    if (url.includes("amazonaws.com")) {
      try {
        const urlObj = new URL(url);
        let key = urlObj.pathname.slice(1); // Remove leading slash

        // If using virtual-hosted-style URLs (bucket.s3.region.amazonaws.com)
        if (urlObj.hostname.includes(this.bucketName)) {
          // Key is the full pathname
        } else {
          // If using path-style URLs (s3.region.amazonaws.com/bucket/key)
          const pathParts = urlObj.pathname.split("/");
          if (pathParts[1] === this.bucketName) {
            key = pathParts.slice(2).join("/");
          }
        }

        // Remove private prefix and return as object path
        if (key.startsWith(`${this.privatePrefix}/`)) {
          const objectKey = key.slice(`${this.privatePrefix}/`.length);
          return `/objects/${objectKey}`;
        }
      } catch (error) {
        console.error("Error parsing S3 URL:", error);
      }
    }

    return url;
  }

  /**
   * Get bucket information for debugging
   */
  getBucketInfo() {
    return {
      bucketName: this.bucketName,
      publicPrefix: this.publicPrefix,
      privatePrefix: this.privatePrefix,
      configured: this.isConfigured(),
    };
  }
}