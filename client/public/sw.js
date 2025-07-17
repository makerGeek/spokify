const CACHE_NAME = 'spokify-v4';
const STATIC_CACHE = 'spokify-static-v4';
const DYNAMIC_CACHE = 'spokify-dynamic-v4';

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('SW: Install event');
  event.waitUntil(
    (async () => {
      try {
        const staticCache = await caches.open(STATIC_CACHE);
        console.log('SW: Static cache opened');
        
        // Get the main HTML page first
        const response = await fetch('/');
        if (!response.ok) {
          throw new Error('Failed to fetch main page');
        }
        
        // Cache the main page
        await staticCache.put('/', response.clone());
        console.log('SW: Cached main page');
        
        // Parse the HTML to find assets
        const html = await response.text();
        const assetUrls = new Set();
        
        // Extract CSS and JS assets from the HTML
        const cssRegex = /href="(\/assets\/[^"]+\.css)"/g;
        const jsRegex = /src="(\/assets\/[^"]+\.js)"/g;
        
        let match;
        while ((match = cssRegex.exec(html)) !== null) {
          assetUrls.add(match[1]);
        }
        while ((match = jsRegex.exec(html)) !== null) {
          assetUrls.add(match[1]);
        }
        
        // Add essential resources
        assetUrls.add('/manifest.json');
        
        console.log('SW: Assets found:', Array.from(assetUrls));
        
        // Cache each asset
        for (const url of assetUrls) {
          try {
            const assetResponse = await fetch(url);
            if (assetResponse.ok) {
              await staticCache.put(url, assetResponse);
              console.log('SW: Cached asset:', url);
            }
          } catch (error) {
            console.warn('SW: Failed to cache asset:', url, error);
          }
        }
        
        // Cache commonly used flag images
        const commonFlags = ['en', 'es', 'fr', 'de', 'it', 'pt', 'jp', 'kr', 'cn'];
        for (const flag of commonFlags) {
          try {
            const flagUrl = `/flags/${flag}.png`;
            const flagResponse = await fetch(flagUrl);
            if (flagResponse.ok) {
              await staticCache.put(flagUrl, flagResponse);
              console.log('SW: Cached flag:', flagUrl);
            }
          } catch (error) {
            console.warn('SW: Failed to cache flag:', flagUrl, error);
          }
        }
        
        console.log('SW: All assets cached');
      } catch (error) {
        console.error('SW: Install failed:', error);
      }
    })()
  );
  
  // Take control immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('SW: Activate event');
  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
            console.log('SW: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
      
      // Take control of all clients
      await self.clients.claim();
      console.log('SW: Activated and claiming clients');
    })()
  );
});

// Helper function to check if the app is offline
async function isOffline() {
  // Check navigator.onLine first for immediate result
  if (!navigator.onLine) {
    return true;
  }
  
  // Try a quick network test with a timeout
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch('/', {
      method: 'HEAD',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    return !response.ok;
  } catch (error) {
    // Network error or timeout means we're offline
    return true;
  }
}

// Fetch event - serve from cache when offline, network when online
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        const offline = await isOffline();
        console.log('SW: Navigation request for:', url.pathname, 'Offline:', offline);
        
        if (offline) {
          // We're offline, serve from cache only
          const staticCache = await caches.open(STATIC_CACHE);
          let cachedResponse = await staticCache.match('/');
          
          if (cachedResponse) {
            console.log('SW: Serving main page from cache (offline mode)');
            return cachedResponse;
          }
          
          // No cached version available, show offline page
          console.log('SW: No cached content, serving offline page');
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Spokify - Offline</title>
              <meta name="viewport" content="width=device-width, initial-scale=1">
              <style>
                body { 
                  font-family: -apple-system, BlinkMacSystemFont, sans-serif; 
                  background: #121212; 
                  color: #fff; 
                  display: flex; 
                  align-items: center; 
                  justify-content: center; 
                  min-height: 100vh; 
                  margin: 0; 
                  text-align: center; 
                }
                .container { max-width: 400px; padding: 20px; }
                h1 { color: #1DB954; margin-bottom: 20px; }
                p { color: #b3b3b3; line-height: 1.5; }
                button { 
                  background: #1DB954; 
                  color: white; 
                  border: none; 
                  padding: 12px 24px; 
                  border-radius: 24px; 
                  margin-top: 20px;
                  cursor: pointer;
                }
              </style>
            </head>
            <body>
              <div class="container">
                <h1>You're Offline</h1>
                <p>Spokify needs an internet connection to work properly. Please check your connection and try again.</p>
                <button onclick="window.location.reload()">Try Again</button>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        } else {
          // We're online, fetch from network
          try {
            const networkResponse = await fetch('/');
            if (networkResponse.ok) {
              // Cache the response for future offline use
              const staticCache = await caches.open(STATIC_CACHE);
              await staticCache.put('/', networkResponse.clone());
              console.log('SW: Fetched and cached main page from network (online mode)');
              return networkResponse;
            }
            throw new Error('Network response not ok');
          } catch (error) {
            // Network failed, fall back to cache
            console.log('SW: Network failed, falling back to cache');
            const staticCache = await caches.open(STATIC_CACHE);
            const cachedResponse = await staticCache.match('/');
            
            if (cachedResponse) {
              console.log('SW: Serving main page from cache (network failed)');
              return cachedResponse;
            }
            
            // No cache available, return error response
            return new Response('Network Error', { status: 503 });
          }
        }
      })()
    );
    return;
  }

  // Handle static asset requests
  event.respondWith(
    (async () => {
      const offline = await isOffline();
      console.log('SW: Asset request for:', url.pathname, 'Offline:', offline);
      
      if (offline) {
        // We're offline, serve from cache only
        const staticCache = await caches.open(STATIC_CACHE);
        let cachedResponse = await staticCache.match(event.request);
        
        if (cachedResponse) {
          console.log('SW: Serving from static cache (offline mode):', url.pathname);
          return cachedResponse;
        }
        
        // Check dynamic cache
        const dynamicCache = await caches.open(DYNAMIC_CACHE);
        cachedResponse = await dynamicCache.match(event.request);
        
        if (cachedResponse) {
          console.log('SW: Serving from dynamic cache (offline mode):', url.pathname);
          return cachedResponse;
        }
        
        // No cached version available, return appropriate fallback
        if (event.request.destination === 'image' || url.pathname.includes('/flags/')) {
          // Create a simple fallback flag SVG
          const fallbackSvg = `
            <svg width="32" height="24" viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
              <rect width="32" height="24" fill="#ccc"/>
              <text x="16" y="14" text-anchor="middle" font-size="8" fill="#666">Flag</text>
            </svg>
          `;
          return new Response(fallbackSvg, {
            headers: { 'Content-Type': 'image/svg+xml' }
          });
        }
        
        return new Response('Offline - Resource not cached', { status: 503 });
      } else {
        // We're online, fetch from network
        try {
          const networkResponse = await fetch(event.request);
          
          if (networkResponse.ok) {
            // Cache the response for future offline use
            if (url.pathname.includes('/assets/') || 
                url.pathname.includes('/flags/') || 
                url.pathname.includes('/manifest.json') ||
                url.pathname.endsWith('.png') ||
                url.pathname.endsWith('.jpg') ||
                url.pathname.endsWith('.svg')) {
              const staticCache = await caches.open(STATIC_CACHE);
              await staticCache.put(event.request, networkResponse.clone());
              console.log('SW: Cached static asset from network (online mode):', url.pathname);
            } else {
              const dynamicCache = await caches.open(DYNAMIC_CACHE);
              await dynamicCache.put(event.request, networkResponse.clone());
              console.log('SW: Cached dynamic content from network (online mode):', url.pathname);
            }
          }
          
          return networkResponse;
        } catch (error) {
          // Network failed, fall back to cache
          console.log('SW: Network failed, falling back to cache for:', url.pathname);
          
          const staticCache = await caches.open(STATIC_CACHE);
          let cachedResponse = await staticCache.match(event.request);
          
          if (cachedResponse) {
            console.log('SW: Serving from static cache (network failed):', url.pathname);
            return cachedResponse;
          }
          
          // Check dynamic cache
          const dynamicCache = await caches.open(DYNAMIC_CACHE);
          cachedResponse = await dynamicCache.match(event.request);
          
          if (cachedResponse) {
            console.log('SW: Serving from dynamic cache (network failed):', url.pathname);
            return cachedResponse;
          }
          
          // No cache available, return appropriate fallback
          if (event.request.destination === 'image' || url.pathname.includes('/flags/')) {
            const fallbackSvg = `
              <svg width="32" height="24" viewBox="0 0 32 24" xmlns="http://www.w3.org/2000/svg">
                <rect width="32" height="24" fill="#ccc"/>
                <text x="16" y="14" text-anchor="middle" font-size="8" fill="#666">Flag</text>
              </svg>
            `;
            return new Response(fallbackSvg, {
              headers: { 'Content-Type': 'image/svg+xml' }
            });
          }
          
          return new Response('Network Error', { status: 503 });
        }
      }
    })()
  );
});

// Background sync for offline vocabulary learning
self.addEventListener('sync', (event) => {
  if (event.tag === 'vocabulary-sync') {
    event.waitUntil(syncVocabulary());
  }
});

async function syncVocabulary() {
  try {
    // Sync offline vocabulary data when back online
    const offlineVocabulary = await getOfflineVocabulary();
    if (offlineVocabulary.length > 0) {
      await syncToServer(offlineVocabulary);
      await clearOfflineVocabulary();
    }
  } catch (error) {
    console.error('Vocabulary sync failed:', error);
  }
}

async function getOfflineVocabulary() {
  // Get vocabulary stored while offline
  const cache = await caches.open(DYNAMIC_CACHE);
  const offlineData = await cache.match('/offline-vocabulary');
  return offlineData ? await offlineData.json() : [];
}

async function syncToServer(vocabulary) {
  // Sync vocabulary to server
  await fetch('/api/vocabulary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(vocabulary),
  });
}

async function clearOfflineVocabulary() {
  // Clear offline vocabulary after sync
  const cache = await caches.open(DYNAMIC_CACHE);
  await cache.delete('/offline-vocabulary');
}
