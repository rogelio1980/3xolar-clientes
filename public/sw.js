// TRN Admin Service Worker — v4.0 (cache busted)
const CACHE = 'trn-admin-v4';
const STATIC = [];

self.addEventListener('install', e => {
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Network first — always fetch fresh, no caching
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  if(e.request.url.startsWith('chrome-extension')) return;
  e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
});
