// Service Worker Registration for Gospel Era Web
// Only registers in production builds

interface ServiceWorkerRegistrationResult {
  success: boolean;
  registration?: ServiceWorkerRegistration;
  error?: Error;
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistrationResult> {
  // Only register in production and if service workers are supported
  if (import.meta.env?.DEV || !('serviceWorker' in navigator)) {
    console.log('[SW] Service worker registration skipped - development mode or not supported');
    return { success: false };
  }

  try {
    console.log('[SW] Registering service worker...');
    
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none' // Always check for updates
    });

    console.log('[SW] Service worker registered successfully:', registration);

    // Handle service worker updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        console.log('[SW] New service worker installing...');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            console.log('[SW] New service worker installed, prompting update...');
            showUpdatePrompt(registration);
          }
        });
      }
    });

    // Listen for waiting service worker
    if (registration.waiting) {
      showUpdatePrompt(registration);
    }

    return { success: true, registration };
  } catch (error) {
    console.error('[SW] Service worker registration failed:', error);
    return { success: false, error: error as Error };
  }
}

function showUpdatePrompt(registration: ServiceWorkerRegistration) {
  // Create a simple update prompt
  const updatePrompt = document.createElement('div');
  updatePrompt.innerHTML = `
    <div style="
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #7c3aed;
      color: white;
      padding: 16px 24px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(124, 58, 237, 0.3);
      z-index: 10000;
      display: flex;
      align-items: center;
      gap: 12px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      max-width: 90vw;
      animation: slideUp 0.3s ease-out;
    ">
      <div>New version available!</div>
      <button onclick="this.parentElement.parentElement.updateApp()" style="
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 8px 16px;
        border-radius: 8px;
        cursor: pointer;
        font-weight: 600;
        transition: background-color 0.2s;
      " onmouseover="this.style.backgroundColor='rgba(255, 255, 255, 0.3)'" 
         onmouseout="this.style.backgroundColor='rgba(255, 255, 255, 0.2)'">
        Update
      </button>
      <button onclick="this.parentElement.parentElement.remove()" style="
        background: transparent;
        border: none;
        color: white;
        padding: 8px;
        cursor: pointer;
        opacity: 0.7;
        font-size: 18px;
        line-height: 1;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.7'">
        ×
      </button>
    </div>
    <style>
      @keyframes slideUp {
        from { transform: translate(-50%, 100px); opacity: 0; }
        to { transform: translate(-50%, 0); opacity: 1; }
      }
    </style>
  `;

  // Add update functionality
  (updatePrompt as any).updateApp = () => {
    if (registration.waiting) {
      registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      registration.waiting.addEventListener('statechange', (e) => {
        if ((e.target as ServiceWorker).state === 'activated') {
          window.location.reload();
        }
      });
    }
    updatePrompt.remove();
  };

  document.body.appendChild(updatePrompt);

  // Auto-remove after 10 seconds if not interacted with
  setTimeout(() => {
    if (document.body.contains(updatePrompt)) {
      updatePrompt.remove();
    }
  }, 10000);
}

// Check for service worker updates periodically
export function checkForUpdates(registration: ServiceWorkerRegistration) {
  if (registration) {
    setInterval(() => {
      registration.update().catch((error) => {
        console.log('[SW] Update check failed:', error);
      });
    }, 60000); // Check every minute
  }
}

// Unregister service worker (for cleanup if needed)
export async function unregisterServiceWorker(): Promise<boolean> {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration) {
        const result = await registration.unregister();
        console.log('[SW] Service worker unregistered:', result);
        return result;
      }
    } catch (error) {
      console.error('[SW] Service worker unregistration failed:', error);
    }
  }
  return false;
}

// Get service worker registration status
export async function getServiceWorkerStatus(): Promise<{
  supported: boolean;
  registered: boolean;
  active: boolean;
}> {
  const supported = 'serviceWorker' in navigator;
  
  if (!supported) {
    return { supported: false, registered: false, active: false };
  }

  try {
    const registration = await navigator.serviceWorker.getRegistration();
    const registered = !!registration;
    const active = !!(registration?.active);
    
    return { supported, registered, active };
  } catch (error) {
    console.error('[SW] Failed to get service worker status:', error);
    return { supported, registered: false, active: false };
  }
}