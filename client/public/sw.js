const CACHE_NAME = 'lyriclingo-v1';
const urlsToCache = [
  '/',
  '/home',
  '/progress',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

// Install event - cache resources
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache when offline
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
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
