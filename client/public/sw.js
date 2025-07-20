const CACHE_NAME = 'spokify-v3';
const STATIC_CACHE = 'spokify-static-v3';
const DYNAMIC_CACHE = 'spokify-dynamic-v3';

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

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  const url = new URL(event.request.url);
  
  // NEVER cache development assets or API calls
  if (url.pathname.includes('/@vite/') || 
      url.pathname.includes('/src/') ||
      url.pathname.includes('/node_modules/') ||
      url.pathname.includes('/api/') ||
      url.search.includes('?v=') ||
      url.search.includes('hot-update')) {
    console.log('SW: Bypassing cache for development/API request:', url.pathname);
    return; // Let browser handle normally
  }
  
  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          console.log('SW: Navigation request for:', url.pathname);
          
          // Always try network first for navigation in production to avoid stale content
          try {
            const networkResponse = await fetch(event.request, { 
              cache: 'no-cache',
              headers: { 'Cache-Control': 'no-cache' }
            });
            
            if (networkResponse.ok) {
              // Cache the fresh response
              const staticCache = await caches.open(STATIC_CACHE);
              await staticCache.put('/', networkResponse.clone());
              console.log('SW: Fetched and cached fresh main page');
              return networkResponse;
            }
          } catch (networkError) {
            console.log('SW: Network failed, trying cache:', networkError);
          }
          
          // Fallback to cache if network fails
          const staticCache = await caches.open(STATIC_CACHE);
          let cachedResponse = await staticCache.match('/');
          
          if (cachedResponse) {
            console.log('SW: Serving main page from cache (network failed)');
            return cachedResponse;
          }
          
          throw new Error('No network and no cache available');
        } catch (error) {
          console.log('SW: Complete failure, serving connection error page:', error);
          // Create a basic connection error page
          return new Response(`
            <!DOCTYPE html>
            <html>
            <head>
              <title>Spokify - Connection Error</title>
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
                <h1>Connection Error</h1>
                <p>Spokify needs an internet connection to work properly. Please check your connection and try again.</p>
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

  // Handle static asset requests with network-first strategy for critical assets
  event.respondWith(
    (async () => {
      try {
        // For critical assets, always try network first to avoid stale JS/CSS
        if (url.pathname.includes('/assets/')) {
          try {
            const networkResponse = await fetch(event.request);
            if (networkResponse.ok) {
              // Cache the fresh response
              const staticCache = await caches.open(STATIC_CACHE);
              await staticCache.put(event.request, networkResponse.clone());
              console.log('SW: Fresh asset cached:', url.pathname);
              return networkResponse;
            }
          } catch (networkError) {
            console.log('SW: Network failed for asset, trying cache:', url.pathname);
          }
        }
        
        // Check static cache
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
        
        // Try to fetch from network as last resort
        const networkResponse = await fetch(event.request);
        
        if (networkResponse.ok) {
          // Cache the response if it's a static asset
          if (url.pathname.includes('/assets/') || 
              url.pathname.includes('/flags/') || 
              url.pathname.includes('/manifest.json') ||
              url.pathname.endsWith('.png') ||
              url.pathname.endsWith('.jpg') ||
              url.pathname.endsWith('.svg')) {
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
