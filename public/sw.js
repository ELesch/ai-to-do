/**
 * Service Worker for AI Todo PWA
 * Provides offline support and caching
 */

const CACHE_NAME = 'ai-todo-v1';
const STATIC_CACHE_NAME = 'ai-todo-static-v1';

// Static assets to cache
const STATIC_ASSETS = [
  '/icons/icon.svg',
  '/manifest.json',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  // Activate immediately
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  // Take control immediately
  self.clients.claim();
});

// Fetch event - network first, fallback to cache
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip API routes and auth endpoints
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/')) {
    return;
  }

  // For navigation requests (HTML pages), use network first
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clone the response and cache it
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If network fails, try cache
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline page or fallback
            return caches.match('/').then((fallback) => {
              return fallback || new Response('Offline', {
                status: 503,
                statusText: 'Service Unavailable',
              });
            });
          });
        })
    );
    return;
  }

  // For static assets, use cache first
  if (
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.jpg') ||
    url.pathname.endsWith('.woff2')
  ) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(request).then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        });
      })
    );
    return;
  }
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
