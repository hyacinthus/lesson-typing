// Test-only module hooks that let the lightweight smoke tests run under plain Node.
//
// Two gaps between the Vite/tsc build environment and Node's native
// `--experimental-strip-types` loader are bridged here:
//   1. Resolution: the source tree uses extensionless relative imports
//      (e.g. `../types/typing.types`); this appends `.ts`/`.tsx`/`/index.*`.
//   2. `import.meta.env`: a Vite-only construct that is `undefined` in Node;
//      references are rewritten to an injected test env object.
//
// Loaded via `node --import ./scripts/ts-ext-resolver.mjs ...`.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const CANDIDATE_SUFFIXES = ['.ts', '.tsx', '/index.ts', '/index.tsx'];

// Minimal stand-in for Vite's `import.meta.env`. Values only need to be
// non-empty so module-level guards (e.g. the Supabase client) don't throw.
globalThis.__TEST_VITE_ENV__ = {
  DEV: false,
  PROD: true,
  MODE: 'test',
  VITE_SUPABASE_URL: 'http://localhost:54321',
  VITE_SUPABASE_ANON_KEY: 'test-anon-key',
  ...process.env,
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    const isRelative = specifier.startsWith('./') || specifier.startsWith('../');
    const hasKnownExt = /\.[mc]?[jt]sx?$/.test(specifier);
    if (isRelative && !hasKnownExt && context.parentURL) {
      try {
        const basePath = fileURLToPath(new URL(specifier, context.parentURL));
        for (const suffix of CANDIDATE_SUFFIXES) {
          if (existsSync(basePath + suffix)) {
            return nextResolve(specifier + suffix, context);
          }
        }
      } catch {
        // Fall through to the default resolver below.
      }
    }
    return nextResolve(specifier, context);
  },
  load(url, context, nextLoad) {
    const result = nextLoad(url, context);
    if (/\.[mc]?[jt]sx?$/.test(url) && result.source != null) {
      const source = result.source.toString();
      if (source.includes('import.meta.env')) {
        return {
          ...result,
          source: source.replaceAll('import.meta.env', 'globalThis.__TEST_VITE_ENV__'),
        };
      }
    }
    return result;
  },
});
