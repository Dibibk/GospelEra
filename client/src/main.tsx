import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import "./styles/professional-design.css";

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
