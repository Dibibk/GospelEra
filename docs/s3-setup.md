# AWS S3 Storage Setup Guide

This guide will help you set up AWS S3 cloud storage for your Gospel Era Web application.

## Current Setup

Your application currently uses a **Hybrid Storage System** that automatically detects and uses:
- **AWS S3** (if configured) - for production
- **Replit Object Storage** (fallback) - for development

## Setting Up AWS S3

### Step 1: Create AWS Account & S3 Bucket

1. **Sign up for AWS**: Go to [aws.amazon.com](https://aws.amazon.com) and create an account
2. **Navigate to S3**: In AWS Console, search for "S3" and click on it
3. **Create bucket**:
   - Click "Create bucket"
   - Choose a unique bucket name (e.g., `gospel-era-web-storage`)
   - Select your preferred region (e.g., `us-east-1`)
   - Keep default settings for now
   - Click "Create bucket"

### Step 2: Create IAM User for API Access

1. **Navigate to IAM**: In AWS Console, search for "IAM"
2. **Create user**:
   - Click "Users" → "Create user"
   - Username: `gospel-era-web-user`
   - Select "Programmatic access"
3. **Set permissions**:
   - Choose "Attach policies directly"
   - Search and select: `AmazonS3FullAccess`
   - Click "Next" → "Create user"
4. **Save credentials**:
   - Copy the **Access Key ID**
   - Copy the **Secret Access Key**
   - ⚠️ **Important**: Save these securely - you won't see the secret again!

### Step 3: Configure Environment Variables

Add these environment variables to your Replit Secrets:

```bash
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=your-access-key-here
AWS_SECRET_ACCESS_KEY=your-secret-access-key-here
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=your-bucket-name-here

# S3 Directory Structure (optional)
S3_PUBLIC_PREFIX=public
S3_PRIVATE_PREFIX=private
```

## How to Add Secrets in Replit

1. In your Replit workspace, click the lock icon (🔒) in the sidebar
2. Click "Add Secret"
3. Add each environment variable:
   - Name: `AWS_ACCESS_KEY_ID`
   - Value: Your AWS access key
   - Click "Add Secret"
4. Repeat for all AWS variables above

## Directory Structure

Your S3 bucket will automatically organize files like this:

```
your-bucket-name/
├── public/           # Public assets (manually uploaded)
├── private/
│   ├── uploads/      # User post images/videos
│   └── avatars/      # User profile pictures
```

## Cost Estimation

**AWS S3 Pricing** (us-east-1 region):
- **Storage**: $0.023 per GB/month
- **Requests**: $0.0004 per 1,000 PUT requests
- **Data Transfer**: First 1 GB/month free, then $0.09/GB

**Example monthly costs**:
- 1 GB storage + 10,000 uploads = ~$0.03
- 10 GB storage + 100,000 uploads = ~$0.27
- 100 GB storage + 1M uploads = ~$2.70

## Testing the Setup

1. **Add your secrets** to Replit
2. **Restart your application** (it will automatically detect S3)
3. **Check the console** - you should see: `Storage mode: AWS S3`
4. **Test upload**: Try uploading an avatar or post image

## Troubleshooting

### "S3 not configured" Error
- Double-check all environment variable names
- Ensure no extra spaces in secret values
- Verify bucket name is correct

### "Access Denied" Error
- Check IAM user has S3 permissions
- Verify bucket name matches exactly
- Ensure region is correct

### Upload Fails
- Check bucket exists in specified region
- Verify AWS credentials are valid
- Check internet connectivity

## Production Considerations

### Security
- Create separate buckets for staging/production
- Use least-privilege IAM policies
- Enable bucket versioning for important data
- Consider enabling MFA delete for extra security

### Performance
- Choose region closest to your users
- Enable CloudFront CDN for faster global delivery
- Configure appropriate cache headers

### Backup
- Enable S3 Cross-Region Replication
- Set up lifecycle policies for cost optimization
- Monitor usage with AWS CloudWatch

## Migration from Replit Object Storage

When you're ready to migrate existing data:

1. **Set up S3** following this guide
2. **Test thoroughly** with new uploads
3. **Export existing data** from Replit Object Storage
4. **Upload to S3** using AWS CLI or console
5. **Update database** references if needed

Your application will automatically start using S3 once configured - no code changes needed!