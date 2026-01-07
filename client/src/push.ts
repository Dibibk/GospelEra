import { Capacitor } from '@capacitor/core';
import {
  initNativePushListeners,
  registerNativePush,
} from './lib/pushNotifications';

/**
 * Native push bootstrap called from main.tsx.
 * This version keeps the iOS permission popup behavior
 * and uses the single source of truth in lib/pushNotifications.ts
 * (so tokens are saved + sent to backend).
 */
export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  // Always attach listeners BEFORE registering so we never miss the token
  initNativePushListeners();

  // This requests permission (shows popup on fresh install) + calls register()
  const result = await registerNativePush();
  console.log('[push.ts] registerNativePush result:', result);
}
