// TRN Admin Service Worker — v1.0
const CACHE = 'trn-admin-v1';
const STATIC = [
  '/admin',
  '/admin.html',
  '/cotizador',
  '/cotizador.html',
  '/portal',
  '/portal.html',
  '/index.html',
  '/firebase-config.js',
  '/assets/trn-logo.png',
  'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500&family=JetBrains+Mono:wght@400;500&family=Outfit:wght@400;600;700;800&display=swap'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => {
      return Promise.allSettled(STATIC.map(url => c.add(url).catch(err => console.warn('SW cache miss:', url, err.message))));
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE).map(k => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const { request } = e;
  // Skip Firebase, non-GET, chrome-extension
  if(request.method !== 'GET') return;
  if(request.url.includes('firestore') || request.url.includes('googleapis') || request.url.includes('firebase')) return;
  if(request.url.startsWith('chrome-extension')) return;

  e.respondWith(
    caches.match(request).then(cached => {
      if(cached) return cached;
      return fetch(request).then(res => {
        if(res.ok && res.type === 'basic'){
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => {
        // Offline fallback for navigation
        if(request.mode === 'navigate') return caches.match('/admin.html');
      });
    })
  );
});
