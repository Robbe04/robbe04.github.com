const CACHE_NAME = 'musicalert-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/ui.js',
  '/js/app.js',
  '/js/notifications.js',
  '/img/hero-bg.jpg',
  '/img/logo.png',
  '/img/logo-small.png',
  '/img/logo-72x72.png',
  '/img/logo-96x96.png',
  '/img/logo-128x128.png',
  '/img/logo-144x144.png',
  '/img/logo-152x152.png',
  '/img/logo-192x192.png',
  '/img/logo-384x384.png',
  '/img/logo-512x512.png',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/animate.css/4.1.1/animate.min.css'
];

// Install Service Worker
self.addEventListener('install', event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

// Activate Service Worker
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.filter(cacheName => {
          return cacheName !== CACHE_NAME;
        }).map(cacheName => {
          return caches.delete(cacheName);
        })
      );
    })
  );
  return self.clients.claim();
});

// Fetch Strategy (Cache First, then Network)
self.addEventListener('fetch', event => {
  // Don't cache API calls
  if (event.request.url.includes('api.spotify.com')) {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request)
          .then(response => {
            // Don't cache if not a valid response
            if (!response || response.status !== 200 || response.type !== 'basic') {
              return response;
            }

            const responseToCache = response.clone();
            caches.open(CACHE_NAME)
              .then(cache => {
                cache.put(event.request, responseToCache);
              });
            return response;
          });
      })
  );
});

// Handle push notifications
self.addEventListener('push', event => {
  const data = event.data.json();
  const options = {
    body: data.body,
    icon: 'img/icons/icon-192x192.png',
    badge: 'img/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url
    },
    actions: [
      {
        action: 'open',
        title: 'Bekijken'
      },
      {
        action: 'close',
        title: 'Sluiten'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );
});

// Handle notification click events
self.addEventListener('notificationclick', event => {
  event.notification.close();

  if (event.action === 'close') {
    return;
  }

  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      // Navigate existing client if available
      for (const client of clientList) {
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});

// Periodic sync to check for new releases
self.addEventListener('periodicsync', event => {
  if (event.tag === 'check-new-releases') {
    event.waitUntil(checkForNewReleases());
  }
});

// Function to check for new releases in the background
async function checkForNewReleases() {
  try {
    // Get favorites from localStorage
    const clients = await self.clients.matchAll();
    if (clients.length === 0) return;
    
    // Request client to check for new releases
    clients[0].postMessage({
      type: 'CHECK_RELEASES'
    });
    
    console.log('Background sync: Requested client to check for new releases');
  } catch (error) {
    console.error('Error checking for new releases in service worker:', error);
  }
}

// Handle messages from clients
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'CHECK_COMPLETE') {
    console.log('Background sync: Client completed checking for new releases');
  }
}
);
