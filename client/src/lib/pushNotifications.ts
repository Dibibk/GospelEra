import { supabase } from './supabaseClient';
import { getApiBaseUrl } from './posts';
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { Preferences } from '@capacitor/preferences';


// =====================================================
// Shared helpers (Native token storage)
// =====================================================
const NATIVE_PUSH_TOKEN_KEY = 'native_push_token';
const NATIVE_PUSH_PLATFORM_KEY = 'native_push_platform';
const NATIVE_PUSH_ERROR_KEY = 'native_push_error';
export function initNativeFCMTokenBridge(): void {
  if (!isNativePlatform()) return;

  // @ts-ignore
  const bridge = (window as any).Capacitor?.Plugins?.FCMTokenBridge;
  if (!bridge) {
    console.log('[NativePushBridge] FCMTokenBridge plugin not found');
    return;
  }

  bridge.addListener('fcmToken', async (data: { token?: string }) => {
    const token = data?.token;
    if (!token) return;

    console.log('[NativePushBridge] ✅ Got FCM token from native:', token.substring(0, 25) + '...');
    await saveNativePushToken(token, 'ios');
    console.log('[NativePushBridge] ✅ Saved token to Preferences');
  });

  console.log('[NativePushBridge] ✅ Listener registered');
}

export function listenForNativeFCMTokenBridge(): void {
  if (!Capacitor.isNativePlatform()) return;

  // @ts-ignore - Capacitor global is available in native runtime
  window.addEventListener('FCMToken', async (event: any) => {
    const token = event?.detail?.token;
    if (!token) return;

    console.log('[NativePushBridge] ✅ Received token from AppDelegate');
    await saveNativePushToken(token, 'ios');
    console.log('[NativePushBridge] ✅ Saved token to Preferences');
  });
}


export async function saveNativePushToken(token: string, platform: string) {
  await Preferences.set({ key: NATIVE_PUSH_TOKEN_KEY, value: token });
  await Preferences.set({ key: NATIVE_PUSH_PLATFORM_KEY, value: platform });
}

export async function getNativePushToken(): Promise<string | null> {
  const { value } = await Preferences.get({ key: NATIVE_PUSH_TOKEN_KEY });
  return value ?? null;
}

export async function clearNativePushToken(): Promise<void> {
  await Preferences.remove({ key: NATIVE_PUSH_TOKEN_KEY });
  await Preferences.remove({ key: NATIVE_PUSH_PLATFORM_KEY });
  await Preferences.remove({ key: NATIVE_PUSH_ERROR_KEY });
}

// =====================================================
// Web push helpers
// =====================================================

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

// Get current web notification permission state
export function getNotificationPermission(): NotificationPermission {
  if (!('Notification' in window)) return 'denied';
  return Notification.permission;
}

// Request web notification permission
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
      headers: session ? { 'Authorization': `Bearer ${session.access_token}` } : {}
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
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

// Subscribe to web push notifications
export async function subscribeToPush(): Promise<PushSubscription | null> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    console.log('[Push] Service worker ready');

    let subscription = await registration.pushManager.getSubscription();

    if (subscription) {
      console.log('[Push] Already subscribed');
      await registerSubscriptionWithServer(subscription);
      return subscription;
    }

    const vapidPublicKey = await getVapidPublicKey();
    if (!vapidPublicKey) {
      console.error('[Push] VAPID public key not available');
      return null;
    }

    subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
    });

    console.log('[Push] Subscribed successfully');
    await registerSubscriptionWithServer(subscription);
    return subscription;
  } catch (error) {
    console.error('[Push] Subscription failed:', error);
    return null;
  }
}

// Register web subscription with backend
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
      body: JSON.stringify({ subscription: subscription.toJSON(), platform: 'web' })
    });

    if (!response.ok) throw new Error(`Registration failed: ${response.status}`);

    console.log('[Push] Registered with server');
  } catch (error) {
    console.error('[Push] Server registration failed:', error);
  }
}

// Unsubscribe from web push notifications
export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false;

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();

    if (!subscription) {
      console.log('[Push] No subscription to unsubscribe');
      return true;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/push/unregister`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ subscription: subscription.toJSON() })
      });
    }

    await subscription.unsubscribe();
    console.log('[Push] Unsubscribed successfully');
    return true;
  } catch (error) {
    console.error('[Push] Unsubscribe failed:', error);
    return false;
  }
}

// Initialize web push (call on app load when user is logged in)
export async function initPushNotifications(): Promise<void> {
  if (!isPushSupported()) {
    console.log('[Push] Push notifications not supported on this device');
    return;
  }

  const permission = getNotificationPermission();

  if (permission === 'granted') {
    await subscribeToPush();
  } else if (permission === 'default') {
    console.log('[Push] Permission not yet requested');
  } else {
    console.log('[Push] Permission denied');
  }
}

// =====================================================
// Native push (iOS/Android)
// =====================================================

// Request native push permission
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

// Check native push permission
export async function checkNativePushPermission(): Promise<'granted' | 'denied' | 'prompt'> {
  if (!isNativePlatform()) return 'denied';

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
      body: JSON.stringify({ token, platform })
    });

    if (!response.ok) throw new Error(`Registration failed: ${response.status}`);

    console.log(`[NativePush] Registered ${platform} token with server`);
  } catch (error) {
    console.error('[NativePush] Server registration failed:', error);
  }
}

// Unsubscribe from native push notifications
export async function unsubscribeFromNativePush(): Promise<boolean> {
  if (!isNativePlatform()) return false;

  try {
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

    // ✅ clear local token
    await clearNativePushToken();

    console.log('[NativePush] Unsubscribed successfully (token cleared)');
    return true;
  } catch (error) {
    console.error('[NativePush] Unsubscribe failed:', error);
    return false;
  }
}

// Track if listeners are already initialized to prevent duplicates
let nativeListenersInitialized = false;

// Initialize native push listeners (must be called BEFORE register())
export function initNativePushListeners(): void {
  if (!isNativePlatform()) {
    console.log('[NativePush] initNativePushListeners: Not native platform, skipping');
    return;
  }

  if (nativeListenersInitialized) {
    console.log('[NativePush] Listeners already initialized, skipping');
    return;
  }

  nativeListenersInitialized = true;
  console.log('[NativePush] Setting up listeners...');

  // ✅ registration token from Capacitor plugin
  PushNotifications.addListener('registration', async (token) => {
    console.log('[NativePush] ✅ Registration successful!');
    console.log('[NativePush] Token preview:', token.value.substring(0, 30) + '...');
    console.log('[NativePush] Token length:', token.value.length);

    const platform = Capacitor.getPlatform() as 'ios' | 'android';
    console.log('[NativePush] Platform:', platform);

    try {
      await saveNativePushToken(token.value, platform);
      console.log('[NativePush] Token saved via Preferences');
    } catch (e) {
      console.log('[NativePush] Could not save token');
      try {
        await Preferences.set({ key: NATIVE_PUSH_ERROR_KEY, value: String(e) });
      } catch (_) {}
    }

    console.log('[NativePush] Sending token to backend...');
    await registerNativeTokenWithServer(token.value, platform);
  });

  // registration error
  PushNotifications.addListener('registrationError', async (error) => {
    console.error('[NativePush] ❌ Registration error:', JSON.stringify(error));
    try {
      await Preferences.set({ key: NATIVE_PUSH_ERROR_KEY, value: JSON.stringify(error) });
    } catch (_) {}
  });

  // foreground notification
  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('[NativePush] 📬 Notification received in foreground:', JSON.stringify(notification));
  });

  // user tapped notification
  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('[NativePush] 👆 Notification tapped:', JSON.stringify(action));
    const data = action.notification.data;
    if (data?.url) window.location.href = data.url;
  });

  console.log('[NativePush] ✅ All listeners initialized');
}

// Initialize native push on app load
export async function initNativePushNotifications(): Promise<void> {
  console.log('[NativePush] initNativePushNotifications called');
  console.log('[NativePush] isNativePlatform:', isNativePlatform());
  console.log('[NativePush] Capacitor.getPlatform:', Capacitor.getPlatform());

  if (!isNativePlatform()) {
    console.log('[NativePush] Not a native platform, skipping');
    return;
  }

  initNativePushListeners();

  const permission = await checkNativePushPermission();
  console.log('[NativePush] Current permission:', permission);

  if (permission === 'granted') {
    console.log('[NativePush] Permission granted, calling PushNotifications.register()...');
    try {
      await PushNotifications.register();
      console.log('[NativePush] register() called successfully');
    } catch (error) {
      console.error('[NativePush] register() failed:', error);
    }
  } else if (permission === 'prompt') {
    console.log('[NativePush] Permission not yet requested - will request when user enables in settings');
  } else {
    console.log('[NativePush] Permission denied - user must enable in iOS Settings');
  }
}

// Full native registration flow (used by your settings toggle)
export async function registerNativePush(): Promise<{ success: boolean; error?: string }> {
  console.log('[NativePush] registerNativePush called');

  if (!isNativePlatform()) {
    return { success: false, error: 'Not a native platform' };
  }

  // Ensure listeners exist before register()
  initNativePushListeners();

  try {
    console.log('[NativePush] Requesting permission...');
    const permResult = await PushNotifications.requestPermissions();
    console.log('[NativePush] Permission result:', permResult.receive);

    if (permResult.receive !== 'granted') {
      return { success: false, error: 'Permission denied' };
    }

    console.log('[NativePush] Calling register()...');
    await PushNotifications.register();
    console.log('[NativePush] register() completed - token will arrive via listener');

    return { success: true };
  } catch (error) {
    console.error('[NativePush] Registration failed:', error);
    return { success: false, error: String(error) };
  }
}
