// Service Worker for Madmona PWA
// Offline caching + Push notifications + Notification clicks
// Version: 2 — added push notification support

const CACHE_NAME = 'madmona-v2';
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/madmona-logo.png',
  '/icon-192.png',
  '/icon-512.png',
];

// ============================================================================
// Install / Activate / Fetch
// ============================================================================

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn('[sw] Some assets failed to pre-cache:', err);
      });
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
      );
    })
  );
});

// ============================================================================
// Push Notifications
// ============================================================================

// Handle incoming push events from server
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: 'مضمونة', body: event.data ? event.data.text() : 'إشعار جديد' };
  }

  const title = data.title || 'مضمونة';
  const options = {
    body: data.body || 'عندك إشعار جديد',
    icon: data.icon || '/icon-192.png',
    badge: '/icon-192.png',
    image: data.image,
    tag: data.tag || 'madmona-notification',
    requireInteraction: data.requireInteraction || false,
    dir: 'rtl',
    lang: 'ar',
    data: {
      url: data.url || '/',
      bookingId: data.bookingId,
      ...data.data,
    },
    actions: data.actions || [
      { action: 'open', title: 'افتح' },
      { action: 'close', title: 'إغلاق' },
    ],
    vibrate: [200, 100, 200],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Handle notification click — open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'close') return;

  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client && client.url !== targetUrl) {
            return client.navigate(targetUrl);
          }
          return client;
        }
      }
      // Otherwise open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Handle subscription change (when subscription expires/refreshes)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
      })
      .then((newSubscription) => {
        // Notify backend of the new subscription endpoint
        return fetch('/api/push/subscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ subscription: newSubscription.toJSON() }),
        });
      })
  );
});
