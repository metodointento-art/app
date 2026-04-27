// PWA Fase 2 — offline shell
// - Pré-cache da página /offline (fallback)
// - Navegação: network-first com fallback pro cache, depois pra /offline
// - Assets estáticos: stale-while-revalidate (cache, atualiza em background)
// - /api/*: nunca cacheia (sempre rede)

const CACHE_NAME = 'intento-shell-v2';
const OFFLINE_URL = '/offline';

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(OFFLINE_URL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()) // se falhar pré-cache, ainda assim instala
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Bypass: API e métodos não-GET sempre vão pra rede
  if (request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/')) return;
  // Bypass: extensões de browser, websockets, etc.
  if (url.origin !== self.location.origin) return;

  // Navegação (HTML): network-first → cache → offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          return response;
        })
        .catch(() =>
          caches.match(request).then((cached) => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Assets estáticos (JS, CSS, imagens, fontes): stale-while-revalidate
  event.respondWith(
    caches.match(request).then((cached) => {
      const fetchPromise = fetch(request)
        .then((response) => {
          if (response && response.status === 200 && response.type === 'basic') {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
