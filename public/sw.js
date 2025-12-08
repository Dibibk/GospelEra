// Gospel Era Service Worker
const APP_VERSION = 'v2';
const CACHE_NAME = `app-${APP_VERSION}`;
const STATIC_CACHE_NAME = `static-${APP_VERSION}`;
const DYNAMIC_CACHE_NAME = `dynamic-${APP_VERSION}`;

// Files to cache immediately (critical app shell)
const STATIC_FILES = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.webmanifest',
  '/icon-192.png',
  '/icon-512.png',
  '/apple-touch-icon.png'
];

// Install event - cache critical files
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching app shell');
        return cache.addAll(STATIC_FILES);
      })
      .then(() => {
        console.log('[SW] App shell cached successfully');
        return self.skipWaiting(); // Force activation
      })
      .catch((error) => {
        console.error('[SW] Failed to cache app shell:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            // Delete caches that don't match current version
            if (!cacheName.includes(APP_VERSION)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim(); // Take control immediately
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip cross-origin requests (external APIs, fonts, etc.)
  if (url.origin !== location.origin) {
    return;
  }
  
  // Handle different types of requests
  if (isNavigationRequest(request)) {
    // HTML navigation - network first with offline fallback
    event.respondWith(networkFirstWithOfflineFallback(request));
  } else if (isAPIRequest(request)) {
    // API calls - network first strategy
    event.respondWith(networkFirst(request));
  } else if (isStaticAsset(request)) {
    // Static assets (JS/CSS/images) - stale while revalidate
    event.respondWith(staleWhileRevalidate(request));
  } else {
    // Default - stale while revalidate for other resources
    event.respondWith(staleWhileRevalidate(request));
  }
});

// Check if request is for HTML navigation
function isNavigationRequest(request) {
  return request.mode === 'navigate' || 
         request.destination === 'document' ||
         (request.method === 'GET' && request.headers.get('accept')?.includes('text/html'));
}

// Check if request is for API
function isAPIRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

// Check if request is for static assets (JS/CSS/images)
function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|webp|avif)$/);
}

// Network first with offline fallback - for HTML navigation
async function networkFirstWithOfflineFallback(request) {
  try {
    console.log('[SW] Trying network for navigation:', request.url);
    const networkResponse = await fetch(request);
    
    // Cache successful HTML responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed for navigation, trying cache:', request.url);
    
    // Try cache first
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving cached navigation:', request.url);
      return cachedResponse;
    }
    
    // Fallback to offline page
    console.log('[SW] Serving offline page');
    const offlineResponse = await caches.match('/offline.html');
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

// Network first strategy - for API calls
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    
    // Fallback to cache
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // If it's a navigation request, return app shell
    if (request.mode === 'navigate') {
      return await caches.match('/index.html');
    }
    
    throw error;
  }
}

// Stale while revalidate strategy - for static assets (JS/CSS/images)
async function staleWhileRevalidate(request) {
  const cache = await caches.open(STATIC_CACHE_NAME);
  const cachedResponse = await cache.match(request);
  
  // Fetch in background to update cache (don't await)
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      console.log('[SW] Updating cache for static asset:', request.url);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Background fetch failed for:', request.url, error.message);
  });
  
  // Return cached version immediately if available
  if (cachedResponse) {
    console.log('[SW] Serving stale static asset:', request.url);
    return cachedResponse;
  }
  
  // If no cached version, wait for network
  console.log('[SW] No cache, waiting for network:', request.url);
  return await fetchPromise;
}

// Listen for messages from main thread
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    console.log('[SW] Received skip waiting message');
    self.skipWaiting();
  }
});

// Background sync for offline actions (future enhancement)
self.addEventListener('sync', (event) => {
  if (event.tag === 'background-sync') {
    console.log('[SW] Background sync triggered');
    // Handle offline actions when back online
  }
});

// Push notification event handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let data = {
    title: 'Gospel Era',
    body: 'You have a new notification',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    url: '/'
  };
  
  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || 'Gospel Era',
        body: payload.body || 'You have a new notification',
        icon: payload.icon || '/icon-192.png',
        badge: '/icon-192.png',
        url: payload.url || '/',
        tag: payload.tag || 'gospel-era-notification'
      };
    }
  } catch (e) {
    console.error('[SW] Error parsing push data:', e);
  }
  
  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    data: { url: data.url },
    vibrate: [100, 50, 100],
    requireInteraction: false
  };
  
  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Notification click handler - open the app when clicked
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked');
  
  event.notification.close();
  
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
        // Open new window if none exists
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

console.log('[SW] Service worker script loaded');