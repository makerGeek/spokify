const CACHE_NAME = 'lyriclingo-v1';
const urlsToCache = [
  '/',
  '/manifest.json',
  '/flags/',
  // Essential pages for offline access
  '/home',
  '/profile',
  '/library',
  '/review',
  '/language-selection'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Opened cache');
        // Only cache essential resources that we know exist
        const essentialUrls = [
          '/',
          '/manifest.json'
        ];
        return cache.addAll(essentialUrls);
      })
      .catch((error) => {
        console.error('Failed to cache resources:', error);
      })
  );
  // Force the waiting service worker to become the active service worker
  self.skipWaiting();
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Handle navigation requests (HTML pages)
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match(event.request)
        .then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then((response) => {
              // Cache successful navigation responses
              if (response.status === 200) {
                const responseClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, responseClone);
                });
              }
              return response;
            })
            .catch(() => {
              // If offline and no cached version, return the main page
              return caches.match('/') || new Response(
                '<html><body><h1>Offline</h1><p>Please check your internet connection.</p></body></html>',
                { headers: { 'Content-Type': 'text/html' } }
              );
            });
        })
    );
    return;
  }

  // Handle all other requests
  event.respondWith(
    caches.match(event.request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }

        return fetch(event.request)
          .then((response) => {
            // Cache successful responses for static assets
            if (response.status === 200 && 
                (event.request.url.includes('/flags/') || 
                 event.request.url.includes('/manifest.json'))) {
              const responseClone = response.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseClone);
              });
            }
            return response;
          })
          .catch(() => {
            // Return a fallback for failed requests
            if (event.request.destination === 'image') {
              return new Response('', { status: 404 });
            }
            throw error;
          });
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
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
  const cache = await caches.open(CACHE_NAME);
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
  const cache = await caches.open(CACHE_NAME);
  await cache.delete('/offline-vocabulary');
}

// Push notifications for learning reminders
self.addEventListener('push', (event) => {
  const options = {
    body: 'Time to practice your language skills with LyricLingo!',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'learning-reminder',
    vibrate: [100, 50, 100],
    actions: [
      {
        action: 'practice',
        title: 'Practice Now',
        icon: '/play-icon.png'
      },
      {
        action: 'later',
        title: 'Remind Later',
        icon: '/clock-icon.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('LyricLingo Learning Reminder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'practice') {
    event.waitUntil(
      clients.openWindow('/')
    );
  } else if (event.action === 'later') {
    // Schedule reminder for later
    event.waitUntil(
      scheduleReminderLater()
    );
  }
});

async function scheduleReminderLater() {
  // Schedule a reminder for later (simplified implementation)
  setTimeout(() => {
    self.registration.showNotification('LyricLingo Learning Reminder', {
      body: 'Ready to continue learning?',
      icon: '/icon-192x192.png',
      tag: 'learning-reminder-later'
    });
  }, 3600000); // 1 hour later
}
