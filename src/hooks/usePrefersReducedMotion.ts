import { useSyncExternalStore } from 'react';

// Module-level MQL: one allocation, shared by subscribe and snapshot (SPA, no SSR)
const mql = window.matchMedia('(prefers-reduced-motion: reduce)');

function subscribe(callback: () => void) {
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => mql.matches);
}
