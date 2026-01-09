import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.gospelera.app',
  appName: 'Gospel Era App',
  webDir: 'dist/public',

  server: {
    androidScheme: 'https',

    // ❗ keep https for normal web content
    iosScheme: 'https',

    allowNavigation: [
      '*.youtube.com',
      '*.ytimg.com',
      '*.googlevideo.com',
      '*.youtube-nocookie.com',
      '*.googleapis.com'
    ],

    cleartext: true
  }
};

export default config;
