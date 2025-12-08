import webPush from 'web-push';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@gospelera.com';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log('[Push] VAPID keys configured');
} else {
  console.warn('[Push] VAPID keys not configured - push notifications disabled');
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Send push notification to a specific user
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('[Push] Skipping - VAPID keys not configured');
    return;
  }
  
  try {
    const { db } = await import("../client/src/lib/db");
    const { pushTokens } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // Get all push tokens for this user
    const tokens = await db.select()
      .from(pushTokens)
      .where(eq(pushTokens.user_id, userId));
    
    if (tokens.length === 0) {
      console.log(`[Push] No tokens for user ${userId}`);
      return;
    }
    
    console.log(`[Push] Sending to ${tokens.length} device(s) for user ${userId}`);
    
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      url: payload.url || '/',
      tag: payload.tag || 'gospel-era-notification',
    });
    
    // Send to all user's devices
    const sendPromises = tokens.map(async (tokenRecord) => {
      try {
        const subscription = JSON.parse(tokenRecord.token);
        await webPush.sendNotification(subscription, notificationPayload);
        console.log(`[Push] Sent to device ${tokenRecord.id}`);
      } catch (error: any) {
        console.error(`[Push] Failed to send to device ${tokenRecord.id}:`, error.message);
        
        // Remove invalid/expired tokens (410 Gone or 404 Not Found)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Removing invalid token ${tokenRecord.id}`);
          await db.delete(pushTokens).where(eq(pushTokens.id, tokenRecord.id));
        }
      }
    });
    
    await Promise.allSettled(sendPromises);
  } catch (error) {
    console.error('[Push] Error sending notification:', error);
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushNotificationToUsers(userIds: string[], payload: PushPayload): Promise<void> {
  await Promise.allSettled(
    userIds.map(userId => sendPushNotification(userId, payload))
  );
}
