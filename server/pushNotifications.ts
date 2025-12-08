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

// Daily verses for push notifications (synced with client/src/lib/scripture.ts)
const dailyVerses = [
  { reference: "Psalm 119:105", text: "Your word is a lamp for my feet, a light on my path." },
  { reference: "Jeremiah 29:11", text: "For I know the plans I have for you, declares the Lord, plans to prosper you and not to harm you, to give you hope and a future." },
  { reference: "Philippians 4:13", text: "I can do all this through him who gives me strength." },
  { reference: "Romans 8:28", text: "And we know that in all things God works for the good of those who love him, who have been called according to his purpose." },
  { reference: "Proverbs 3:5-6", text: "Trust in the Lord with all your heart and lean not on your own understanding; in all your ways submit to him, and he will make your paths straight." },
  { reference: "Isaiah 40:31", text: "But those who hope in the Lord will renew their strength. They will soar on wings like eagles; they will run and not grow weary, they will walk and not be faint." },
  { reference: "Matthew 6:26", text: "Look at the birds of the air; they do not sow or reap or store away in barns, and yet your heavenly Father feeds them. Are you not much more valuable than they?" },
  { reference: "2 Corinthians 5:17", text: "Therefore, if anyone is in Christ, the new creation has come: The old has gone, the new is here!" },
  { reference: "Psalm 23:1", text: "The Lord is my shepherd, I lack nothing." },
  { reference: "John 3:16", text: "For God so loved the world that he gave his one and only Son, that whoever believes in him shall not perish but have eternal life." },
  { reference: "Psalm 46:10", text: "Be still, and know that I am God; I will be exalted among the nations, I will be exalted in the earth." },
  { reference: "Matthew 11:28", text: "Come to me, all you who are weary and burdened, and I will give you rest." },
  { reference: "1 Corinthians 10:13", text: "No temptation has overtaken you except what is common to mankind. And God is faithful; he will not let you be tempted beyond what you can bear." },
  { reference: "Ephesians 2:8-9", text: "For it is by grace you have been saved, through faith—and this is not from yourselves, it is the gift of God—not by works, so that no one can boast." },
  { reference: "Psalm 37:4", text: "Take delight in the Lord, and he will give you the desires of your heart." },
];

function getTodaysVerse(): { reference: string; text: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  const verseIndex = dayOfYear % dailyVerses.length;
  return dailyVerses[verseIndex];
}

/**
 * Send daily verse push notification to all subscribed users
 */
export async function sendDailyVerseReminders(): Promise<{ sent: number; failed: number }> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('[Push] Skipping daily verse - VAPID keys not configured');
    return { sent: 0, failed: 0 };
  }
  
  try {
    const { db } = await import("../client/src/lib/db");
    const { pushTokens } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    // Get all tokens with daily verse enabled
    const tokens = await db.select()
      .from(pushTokens)
      .where(eq(pushTokens.daily_verse_enabled, true));
    
    if (tokens.length === 0) {
      console.log('[Push] No users subscribed to daily verse reminders');
      return { sent: 0, failed: 0 };
    }
    
    const verse = getTodaysVerse();
    console.log(`[Push] Sending daily verse to ${tokens.length} device(s): ${verse.reference}`);
    
    const notificationPayload = JSON.stringify({
      title: `Daily Verse - ${verse.reference}`,
      body: verse.text,
      icon: '/icon-192.png',
      url: '/',
      tag: 'daily-verse',
    });
    
    let sent = 0;
    let failed = 0;
    
    // Send to all subscribed devices
    const sendPromises = tokens.map(async (tokenRecord) => {
      try {
        const subscription = JSON.parse(tokenRecord.token);
        await webPush.sendNotification(subscription, notificationPayload);
        console.log(`[Push] Daily verse sent to device ${tokenRecord.id}`);
        sent++;
      } catch (error: any) {
        console.error(`[Push] Failed daily verse to device ${tokenRecord.id}:`, error.message);
        failed++;
        
        // Remove invalid/expired tokens
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`[Push] Removing invalid token ${tokenRecord.id}`);
          await db.delete(pushTokens).where(eq(pushTokens.id, tokenRecord.id));
        }
      }
    });
    
    await Promise.allSettled(sendPromises);
    return { sent, failed };
  } catch (error) {
    console.error('[Push] Error sending daily verse reminders:', error);
    return { sent: 0, failed: 0 };
  }
}

/**
 * Update daily verse preference for a user's push tokens
 */
export async function updateDailyVersePreference(userId: string, enabled: boolean): Promise<void> {
  try {
    const { db } = await import("../client/src/lib/db");
    const { pushTokens } = await import("@shared/schema");
    const { eq } = await import("drizzle-orm");
    
    await db.update(pushTokens)
      .set({ daily_verse_enabled: enabled, updated_at: new Date() })
      .where(eq(pushTokens.user_id, userId));
    
    console.log(`[Push] Updated daily verse preference for user ${userId}: ${enabled}`);
  } catch (error) {
    console.error('[Push] Error updating daily verse preference:', error);
    throw error;
  }
}
