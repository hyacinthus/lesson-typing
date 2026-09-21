import { lazy, type ComponentType } from 'react';

/**
 * React.lazy for a named export. Returns the loader too so callers can
 * prefetch the chunk before the component is first rendered.
 */
export function lazyNamed<M, K extends keyof M>(load: () => Promise<M>, name: K) {
  const Component = lazy(() =>
    load().then(m => ({ default: m[name] as ComponentType<Record<string, unknown>> }))
  ) as unknown as M[K];
  return { Component, preload: load };
}
