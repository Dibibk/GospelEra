import { PushNotifications } from '@capacitor/push-notifications';
import { Capacitor } from '@capacitor/core';

export async function initPushNotifications() {
  if (!Capacitor.isNativePlatform()) return;

  const permStatus = await PushNotifications.requestPermissions();
  if (permStatus.receive !== 'granted') {
    console.log('Push permission not granted');
    return;
  }

  // Registers with APNs on iOS
  await PushNotifications.register();

  // APNs device token
  PushNotifications.addListener('registration', (token) => {
    console.log('APNs token:', token.value);
  });

  PushNotifications.addListener('registrationError', (error) => {
    console.error('Push registration error:', error);
  });

  PushNotifications.addListener('pushNotificationReceived', (notification) => {
    console.log('Push received:', notification);
  });

  PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
    console.log('Push action performed:', action);
  });
}
