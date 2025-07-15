const CACHE_NAME = 'lyriclingo-v3';
const STATIC_CACHE = 'lyriclingo-static-v3';
const DYNAMIC_CACHE = 'lyriclingo-dynamic-v3';

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

// Fetch event - serve from cache when offline
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
        try {
          console.log('SW: Navigation request for:', url.pathname);
          
          // Try to get from static cache first
          const staticCache = await caches.open(STATIC_CACHE);
          let cachedResponse = await staticCache.match('/');
          
          if (cachedResponse) {
            console.log('SW: Serving main page from cache');
            return cachedResponse;
          }
          
          // Try to fetch from network
          const networkResponse = await fetch('/');
          if (networkResponse.ok) {
            // Cache the response
            await staticCache.put('/', networkResponse.clone());
            console.log('SW: Fetched and cached main page from network');
            return networkResponse;
          }
          
          throw new Error('Network response not ok');
        } catch (error) {
          console.log('SW: Network failed, serving offline page');
          // Create a basic offline page
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>LyricLingo - Offline</title>
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
                <p>LyricLingo needs an internet connection to work properly. Please check your connection and try again.</p>
                <button onclick="window.location.reload()">Try Again</button>
              </div>
            </body>
            </html>
          `, {
            headers: { 'Content-Type': 'text/html' }
          });
        }
      })()
    );
    return;
  }

  // Handle static asset requests
  event.respondWith(
    (async () => {
      try {
        // Check static cache first
        const staticCache = await caches.open(STATIC_CACHE);
        let cachedResponse = await staticCache.match(event.request);
        
        if (cachedResponse) {
          console.log('SW: Serving from static cache:', url.pathname);
          return cachedResponse;
        }
        
        // Check dynamic cache
        const dynamicCache = await caches.open(DYNAMIC_CACHE);
        cachedResponse = await dynamicCache.match(event.request);
        
        if (cachedResponse) {
          console.log('SW: Serving from dynamic cache:', url.pathname);
          return cachedResponse;
        }
        
        // Try to fetch from network
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
          // Cache the response if it's a static asset
          if (url.pathname.includes('/assets/') || 
              url.pathname.includes('/flags/') || 
              url.pathname.includes('/manifest.json')) {
            await staticCache.put(event.request, networkResponse.clone());
            console.log('SW: Cached static asset:', url.pathname);
          } else {
            await dynamicCache.put(event.request, networkResponse.clone());
            console.log('SW: Cached dynamic content:', url.pathname);
          }
        }
        
        return networkResponse;
      } catch (error) {
        console.log('SW: Network failed for:', url.pathname);
        
        // Return appropriate fallback
        if (event.request.destination === 'image') {
          return new Response('', { status: 404 });
        }
        
        return new Response('Offline', { status: 503 });
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
