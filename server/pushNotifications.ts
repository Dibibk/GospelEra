import webPush from 'web-push';
import admin from 'firebase-admin';

// Initialize web-push with VAPID keys
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;
const vapidEmail = process.env.VAPID_EMAIL || 'mailto:support@gospelera.com';

if (vapidPublicKey && vapidPrivateKey) {
  webPush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);
  console.log('[Push] VAPID keys configured for web push');
} else {
  console.warn('[Push] VAPID keys not configured - web push notifications disabled');
}

// Initialize Firebase Admin SDK for FCM (iOS/Android)
let fcmInitialized = false;
let fcmInitError: string | null = null;
try {
  const firebaseCredentials = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (firebaseCredentials) {
    const serviceAccount = JSON.parse(firebaseCredentials);
    
    // Fix private_key if it has escaped newlines
    if (serviceAccount.private_key?.includes('\\n')) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    }
    fcmInitialized = true;
    console.log('[Push] Firebase initialized - project:', serviceAccount.project_id);
  } else {
    fcmInitError = 'FIREBASE_SERVICE_ACCOUNT_KEY not configured';
    console.warn('[Push] Firebase not configured');
  }
} catch (error: any) {
  fcmInitError = error.message || 'Unknown initialization error';
  console.error('[Push] Firebase init failed:', error.message);
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  url?: string;
  tag?: string;
}

/**
 * Get or create a named Firebase app with fresh credentials
 * This ensures we always use properly formatted credentials
 */
function getFirebaseApp(): admin.app.App | null {
  const APP_NAME = 'fcm-sender';
  
  try {
    return admin.app(APP_NAME);
  } catch (_e) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!raw) return null;
    
    try {
      const serviceAccount = JSON.parse(raw);
      if (serviceAccount.private_key?.includes('\\n')) {
        serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
      }
      
      return admin.initializeApp(
        {
          credential: admin.credential.cert(serviceAccount),
          projectId: serviceAccount.project_id,
        },
        APP_NAME
      );
    } catch (e: any) {
      console.error('[FCM] Init failed:', e.message);
      return null;
    }
  }
}

/**
 * Send push notification via FCM to native iOS/Android devices
 */
async function sendFcmNotification(token: string, payload: PushPayload): Promise<boolean> {
  console.log('[FCM] Sending to token:', token.substring(0, 40) + '... (len=' + token.length + ')');

  const firebaseApp = getFirebaseApp();
  if (!firebaseApp) {
    console.log('[FCM] ❌ No Firebase app');
    return false;
  }

  try {
    const message: admin.messaging.Message = {
      token: token,
      notification: {
        title: payload.title,
        body: payload.body,
      },
      data: {
        url: payload.url || '/',
        tag: payload.tag || 'gospel-era-notification',
      },
      apns: {
        headers: {
          'apns-priority': '10',
          'apns-push-type': 'alert',
        },
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            sound: 'default',
            badge: 1,
            'mutable-content': 1,
          },
        },
      },
      android: {
        priority: 'high',
        notification: {
          sound: 'default',
          channelId: 'gospel-era-notifications',
        },
      },
    };

    const response = await firebaseApp.messaging().send(message);
    console.log('[FCM] ✅ Sent! Response:', response);
    return true;
  } catch (error: any) {
    console.error('[FCM] ❌ Error:', error.code, '-', error.message);
    return false;
  }
}

/**
 * Send push notification via Web Push to browsers
 */
async function sendWebPushNotification(subscription: any, payload: PushPayload): Promise<boolean> {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.log('[WebPush] VAPID keys not configured, skipping');
    return false;
  }

  try {
    const notificationPayload = JSON.stringify({
      title: payload.title,
      body: payload.body,
      icon: payload.icon || '/icon-192.png',
      url: payload.url || '/',
      tag: payload.tag || 'gospel-era-notification',
    });

    await webPush.sendNotification(subscription, notificationPayload);
    return true;
  } catch (error: any) {
    console.error('[WebPush] Error sending notification:', error.message);
    throw error;
  }
}

/**
 * Send push notification to a specific user (handles both web and native)
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
  try {
    const { supabaseAdmin } = await import('./supabaseAdmin');
    
    if (!supabaseAdmin) {
      console.log('[Push] Supabase admin not configured');
      return;
    }
    
    // Get all push tokens for this user from Supabase
    const { data: tokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('*')
      .eq('user_id', userId);
    
    if (error) {
      console.error('[Push] Error fetching tokens:', error);
      return;
    }
    
    if (!tokens || tokens.length === 0) {
      console.log(`[Push] No tokens for user ${userId}`);
      return;
    }
    
    console.log(`[Push] Sending to ${tokens.length} device(s) for user ${userId}`);
    
    // Send to all user's devices
    const sendPromises = tokens.map(async (tokenRecord: any) => {
      try {
        const platform = tokenRecord.platform || 'web';
        
        if (platform === 'ios' || platform === 'android') {
          // Native platform - use FCM
          const success = await sendFcmNotification(tokenRecord.token, payload);
          if (success) {
            console.log(`[Push] FCM sent to ${platform} device ${tokenRecord.id}`);
          }
        } else {
          // Web platform - use Web Push
          const subscription = JSON.parse(tokenRecord.token);
          await sendWebPushNotification(subscription, payload);
          console.log(`[Push] Web Push sent to device ${tokenRecord.id}`);
        }
      } catch (error: any) {
        console.error(`[Push] Failed to send to device ${tokenRecord.id}:`, error.message);
        
        // Remove invalid/expired tokens
        if (error.statusCode === 410 || error.statusCode === 404 || 
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          console.log(`[Push] Removing invalid token ${tokenRecord.id}`);
          await supabaseAdmin.from('push_tokens').delete().eq('id', tokenRecord.id);
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
  try {
    const { supabaseAdmin } = await import('./supabaseAdmin');
    
    if (!supabaseAdmin) {
      console.log('[Push] Supabase admin not configured');
      return { sent: 0, failed: 0 };
    }
    
    // Get all tokens with daily verse enabled
    const { data: tokens, error } = await supabaseAdmin
      .from('push_tokens')
      .select('*')
      .eq('daily_verse_enabled', true);
    
    if (error) {
      console.error('[Push] Error fetching tokens:', error);
      return { sent: 0, failed: 0 };
    }
    
    if (!tokens || tokens.length === 0) {
      console.log('[Push] No users subscribed to daily verse reminders');
      return { sent: 0, failed: 0 };
    }
    
    const verse = getTodaysVerse();
    console.log(`[Push] Sending daily verse to ${tokens.length} device(s): ${verse.reference}`);
    
    const payload: PushPayload = {
      title: `Daily Verse - ${verse.reference}`,
      body: verse.text,
      icon: '/icon-192.png',
      url: '/',
      tag: 'daily-verse',
    };
    
    let sent = 0;
    let failed = 0;
    
    // Send to all subscribed devices
    const sendPromises = tokens.map(async (tokenRecord: any) => {
      try {
        const platform = tokenRecord.platform || 'web';
        
        if (platform === 'ios' || platform === 'android') {
          const success = await sendFcmNotification(tokenRecord.token, payload);
          if (success) {
            sent++;
            console.log(`[Push] Daily verse sent to ${platform} device ${tokenRecord.id}`);
          } else {
            failed++;
          }
        } else {
          const subscription = JSON.parse(tokenRecord.token);
          await sendWebPushNotification(subscription, payload);
          sent++;
          console.log(`[Push] Daily verse sent to web device ${tokenRecord.id}`);
        }
      } catch (error: any) {
        console.error(`[Push] Failed daily verse to device ${tokenRecord.id}:`, error.message);
        failed++;
        
        // Remove invalid/expired tokens
        if (error.statusCode === 410 || error.statusCode === 404 ||
            error.code === 'messaging/invalid-registration-token' ||
            error.code === 'messaging/registration-token-not-registered') {
          console.log(`[Push] Removing invalid token ${tokenRecord.id}`);
          await supabaseAdmin.from('push_tokens').delete().eq('id', tokenRecord.id);
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
    const { supabaseAdmin } = await import('./supabaseAdmin');
    
    if (!supabaseAdmin) {
      throw new Error('Supabase admin client not configured');
    }
    
    const { error } = await supabaseAdmin
      .from('push_tokens')
      .update({ daily_verse_enabled: enabled, updated_at: new Date().toISOString() })
      .eq('user_id', userId);
    
    if (error) {
      throw error;
    }
    
    console.log(`[Push] Updated daily verse preference for user ${userId}: ${enabled}`);
  } catch (error) {
    console.error('[Push] Error updating daily verse preference:', error);
    throw error;
  }
}
