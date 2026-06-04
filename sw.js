/* sw.js
 * Service Worker sencillo para mejorar carga y uso offline en GitHub Pages.
 *
 * Estrategia:
 * - Precache de archivos locales críticos
 * - Cache-first para assets locales (css/js/img)
 * - Network-first para navegación (HTML) con fallback a caché
 */

const CACHE_VERSION = 'bitacora-cache-v4';

// Nota: se cachean SOLO recursos locales del repo (evitamos CDNs por CORS y variaciones).
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './vite.svg',
  './assets/logo-umich.png',

  './css/tailwind.css',
  './css/style.css',
  './css/components.css',
  './css/forms.css',
  './css/tables.css',
  './css/dashboard.css',
  './css/responsive.css',

  './js/app.js',
  './js/auth.js',
  './js/config.js',
  './js/dashboard.js',
  './js/database.js',
  './js/eventos.js',
  './js/incidencias.js',
  './js/permissions.js',
  './js/reportes.js',
  './js/usuarios.js',
  './js/utils.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      try {
        await cache.addAll(PRECACHE_URLS);
      } catch {
        // Si algún asset falla, no bloqueamos instalación.
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

function isNavigationRequest(req) {
  return req.mode === 'navigate' || (req.destination === 'document' && req.method === 'GET');
}

function isLocalAsset(url) {
  try {
    return url.origin === self.location.origin;
  } catch {
    return false;
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo manejamos GET
  if (req.method !== 'GET') return;

  // Solo assets del mismo origen (GitHub Pages / tu dominio)
  if (!isLocalAsset(url)) return;

  // Evitar ruido: algunos entornos intentan cargar el cliente de Vite aunque el proyecto sea estático.
  // Respondemos con 204 para que no haya 404 en servidor ni en consola.
  if (url.pathname === '/@vite/client' || url.pathname === '/@react-refresh') {
    event.respondWith(new Response('', { status: 204 }));
    return;
  }

  // Network-first para navegación (HTML)
  if (isNavigationRequest(req)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CACHE_VERSION);
        try {
          const fresh = await fetch(req);
          cache.put(req, fresh.clone());
          return fresh;
        } catch {
          const cached = await cache.match(req);
          return cached || cache.match('./index.html');
        }
      })(),
    );
    return;
  }

  // Cache-first para recursos estáticos
  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_VERSION);
      const cached = await cache.match(req);
      if (cached) return cached;
      const fresh = await fetch(req);
      cache.put(req, fresh.clone());
      return fresh;
    })(),
  );
});
