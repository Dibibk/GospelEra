import { supabase } from './supabaseClient';
import { getApiBaseUrl } from './posts';

// Check if push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Get current notification permission state
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

// Request notification permission
export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!('Notification' in window)) {
    console.log('[Push] Notifications not supported');
    return 'denied';
  }
  
  const permission = await Notification.requestPermission();
  console.log('[Push] Permission result:', permission);
  return permission;
}

// Get VAPID public key from server
async function getVapidPublicKey(): Promise<string | null> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const baseUrl = getApiBaseUrl();
    
    const response = await fetch(`${baseUrl}/api/push/vapid-key`, {
      headers: session ? {
        'Authorization': `Bearer ${session.access_token}`
      } : {}
    });
    
    if (!response.ok) {
      console.error('[Push] Failed to get VAPID key:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.publicKey;
  } catch (error) {
    console.error('[Push] Error getting VAPID key:', error);
    return null;
  }
}

// Convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Subscribe to push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported');
    return null;
  }
  
  try {
    // Get service worker registration
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service worker ready');
    
    // Check for existing subscription
    let subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      console.log('[Push] Already subscribed');
      await registerSubscriptionWithServer(subscription);
      return subscription;
    }
    
    // Get VAPID public key
    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.error('[Push] VAPID public key not available');
      return null;
    }
    
    // Subscribe
    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });
    
    console.log('[Push] Subscribed successfully');
    
    // Register with server
    await registerSubscriptionWithServer(subscription);
    
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

// Register subscription with backend
async function registerSubscriptionWithServer(subscription: PushSubscription): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('[Push] No session, skipping registration');
      return;
    }
    
    const baseUrl = getApiBaseUrl();
    
    const response = await fetch(`${baseUrl}/api/push/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      },
      body: JSON.stringify({
        subscription: subscription.toJSON(),
        platform: 'web'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
    
    console.log('[Push] Registered with server');
  } catch (error) {
    console.error('[Push] Server registration failed:', error);
  }
}

// Unsubscribe from push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) {
    return false;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      console.log('[Push] No subscription to unsubscribe');
      return true;
    }
    
    // Unregister from server
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/push/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({
          subscription: subscription.toJSON()
        })
      });
    }
    
    // Unsubscribe from browser
    await subscription.unsubscribe();
    console.log('[Push] Unsubscribed successfully');
    
    return true;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

// Initialize push notifications (call on app load when user is logged in)
export async function initPushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported on this device');
    return;
  }
  
  const permission = getNotificationPermission();
  
  if (permission === 'granted') {
    // Already have permission, subscribe
    await subscribeToPush();
  } else if (permission === 'default') {
    // Haven't asked yet - will ask when user enables in settings
    console.log('[Push] Permission not yet requested');
  } else {
    console.log('[Push] Permission denied');
  }
}
