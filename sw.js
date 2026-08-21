/* sw.js (simple)
 * Cache básico para index + assets del modo simple.
 */

const CACHE_VERSION = 'bitacora-simple-v7';

const PRECACHE_URLS = [
  './',
  './index.html',
  './css/simple.css',
  './js/simple.js',
  './assets/logo_umich.png',
  './assets/logo_fcca.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch {
        // noop
      }
      self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k)));
      self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);

      // HTML / navegación: preferir red (evita "stale UI" cuando actualizamos)
      const accept = req.headers.get('accept') || '';
      const isHTML = req.mode === 'navigate' || accept.includes('text/html');
      if (isHTML) {
        try {
          const fresh = await fetch(req);
          try {
            cache.put('./index.html', fresh.clone());
          } catch {
            // noop
          }
          return fresh;
        } catch {
          return (await cache.match('./index.html')) || (await cache.match('./'));
        }
      }

      const cached = (await cache.match(req)) || (url.search ? await cache.match(url.origin + url.pathname) : null);
      if (cached) return cached;
      try {
        const fresh = await fetch(req);
        try {
          cache.put(req, fresh.clone());
          if (url.search) cache.put(url.origin + url.pathname, fresh.clone());
        } catch {
          // noop
        }
        return fresh;
      } catch {
        return cache.match('./index.html');
      }
    })(),
  );
});
