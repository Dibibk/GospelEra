import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/mobile-native.css";

// Native push init (only on iOS/Android)
import('@capacitor/core').then(({ Capacitor }) => {
  if (Capacitor.isNativePlatform()) {
    import('./push').then(({ initPushNotifications }) => {
      initPushNotifications();
    });
  }
});
import('./lib/pushNotifications').then(({ initNativeFCMTokenBridge }) => {
  initNativeFCMTokenBridge();
});

import('./push').then(({ initPushNotifications }) => {
  initPushNotifications();
});


// PWA Service Worker Registration (production only)
if (!import.meta.env.DEV) {
  import("./pwa/swRegistration").then(({ registerServiceWorker, checkForUpdates }) => {
    registerServiceWorker().then((result) => {
      if (result.success && result.registration) {
        console.log("✅ Gospel Era is now available offline!");
        checkForUpdates(result.registration);
      }
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);
