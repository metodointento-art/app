// Service Worker mínimo (Fase 1) — apenas torna o app instalável.
// Estratégias de cache offline serão adicionadas na Fase 2.

const CACHE_NAME = 'intento-shell-v1';

self.addEventListener('install', () => {
  // Auto-ativa o SW novo logo que terminar a instalação
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Limpa caches de versões antigas
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fase 1: pass-through (não intercepta fetch). Fase 2: cache strategies.
self.addEventListener('fetch', () => {});
