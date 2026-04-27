'use client';

import { useEffect } from 'react';

export default function RegisterSW() {
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (!('serviceWorker' in navigator)) return;
    if (process.env.NODE_ENV !== 'production') return;

    const onLoad = () => {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          // Força check de update sempre que a aba volta a ficar visível
          const checkUpdate = () => reg.update().catch(() => {});
          document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'visible') checkUpdate();
          });
          // Quando um SW novo termina de instalar, recarrega a página pra usar
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (!newWorker) return;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated' && navigator.serviceWorker.controller) {
                // SW novo ativou — não força reload pra não interromper o usuário
                // O conteúdo cacheado novo será usado na próxima navegação.
              }
            });
          });
        })
        .catch((err) => console.warn('SW register failed:', err));
    };

    window.addEventListener('load', onLoad);
    return () => window.removeEventListener('load', onLoad);
  }, []);

  return null;
}
