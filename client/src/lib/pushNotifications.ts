import { supabase } from './supabaseClient';
import { getApiBaseUrl } from './posts';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';

// Check if running on native platform (iOS/Android)
export function isNativePlatform(): boolean {
  return Capacitor.isNativePlatform();
}

// Check if web push notifications are supported
export function isPushSupported(): boolean {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

// Check if native push notifications are supported
export function isNativePushSupported(): boolean {
  return isNativePlatform();
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

// ============================================
// NATIVE PUSH NOTIFICATIONS (iOS/Android)
// ============================================

// Request native push notification permission
export async function requestNativePushPermission(): Promise<'granted' | 'denied'> {
  if (!isNativePlatform()) {
    console.log('[NativePush] Not a native platform');
    return 'denied';
  }
  
  try {
    const result = await PushNotifications.requestPermissions();
    console.log('[NativePush] Permission result:', result.receive);
    return result.receive === 'granted' ? 'granted' : 'denied';
  } catch (error) {
    console.error('[NativePush] Permission request failed:', error);
    return 'denied';
  }
}

// Check current native push permission status
export async function checkNativePushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNativePlatform()) {
    return 'denied';
  }
  
  try {
    const result = await PushNotifications.checkPermissions();
    if (result.receive === 'granted') return 'granted';
    if (result.receive === 'denied') return 'denied';
    return 'prompt';
  } catch (error) {
    console.error('[NativePush] Check permission failed:', error);
    return 'denied';
  }
}

// Register for native push notifications
export async function subscribeToNativePush(): Promise<boolean> {
  if (!isNativePlatform()) {
    console.log('[NativePush] Not a native platform');
    return false;
  }
  
  try {
    // Request permission first
    const permission = await requestNativePushPermission();
    if (permission !== 'granted') {
      console.log('[NativePush] Permission not granted');
      return false;
    }
    
    // Register to get a token
    await PushNotifications.register();
    console.log('[NativePush] Registration initiated');
    
    return true;
  } catch (error) {
    console.error('[NativePush] Registration failed:', error);
    return false;
  }
}

// Register native token with backend
async function registerNativeTokenWithServer(token: string, platform: 'ios' | 'android'): Promise<void> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log('[NativePush] No session, skipping registration');
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
        token: token,
        platform: platform
      })
    });
    
    if (!response.ok) {
      throw new Error(`Registration failed: ${response.status}`);
    }
    
    console.log(`[NativePush] Registered ${platform} token with server`);
  } catch (error) {
    console.error('[NativePush] Server registration failed:', error);
  }
}

// Unsubscribe from native push notifications
export async function unsubscribeFromNativePush(): Promise<boolean> {
  if (!isNativePlatform()) {
    return false;
  }
  
  try {
    // Unregister from server
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/push/unregister-native`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
    }
    
    console.log('[NativePush] Unsubscribed successfully');
    return true;
  } catch (error) {
    console.error('[NativePush] Unsubscribe failed:', error);
    return false;
  }
}

// Initialize native push notification listeners
export function initNativePushListeners(): void {
  if (!isNativePlatform()) {
    return;
  }
  
  // Listener for successful registration - receive the FCM/APNs token
  PushNotifications.addListener('registration', async (token) => {
    console.log('[NativePush] Registration successful, token:', token.value.substring(0, 20) + '...');
    
    // Determine platform
    const platform = Capacitor.getPlatform() as 'ios' | 'android';
    
    // Register token with backend
    await registerNativeTokenWithServer(token.value, platform);
  });
  
  // Listener for registration errors
  PushNotifications.addListener('registrationError', (error) => {
    console.error('[NativePush] Registration error:', error);
  });
  
  // Listener for incoming notifications when app is in foreground
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[NativePush] Notification received:', notification);
  });
  
  // Listener for when user taps on a notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[NativePush] Notification action performed:', action);
    // Navigate to appropriate screen based on notification data
    const data = action.notification.data;
    if (data?.url) {
      window.location.href = data.url;
    }
  });
  
  console.log('[NativePush] Listeners initialized');
}

// Initialize native push notifications (call on app load when user is logged in)
export async function initNativePushNotifications(): Promise<void> {
  if (!isNativePlatform()) {
    console.log('[NativePush] Not a native platform, skipping');
    return;
  }
  
  // Set up listeners first
  initNativePushListeners();
  
  // Check current permission
  const permission = await checkNativePushPermission();
  
  if (permission === 'granted') {
    // Already have permission, register for token
    await PushNotifications.register();
  } else if (permission === 'prompt') {
    console.log('[NativePush] Permission not yet requested');
  } else {
    console.log('[NativePush] Permission denied');
  }
}
