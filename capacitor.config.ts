import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gospelera.app',
  appName: 'Gospel Era',
  webDir: 'dist/public',
  server: {
    androidScheme: 'https',
    allowNavigation: [
      '*.youtube.com',
      '*.ytimg.com',
      '*.googlevideo.com',
      '*.youtube-nocookie.com',
      '*.googleapis.com',
      '*.replit.app',
      '*.replit.dev',
      'gospel-era.replit.app'
    ],
    cleartext: true,
    iosScheme: 'https'
  }
};

export default config;
