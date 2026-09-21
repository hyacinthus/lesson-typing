import { describe, it, expect } from 'vitest';
import meta from '../i18n-meta.json';
import en from './en.json';

const locales = import.meta.glob<{ default: Record<string, unknown> }>('./*.json', { eager: true });

function keysOf(obj: Record<string, unknown>, prefix = ''): string[] {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' ? keysOf(v as Record<string, unknown>, `${prefix}${k}.`) : [`${prefix}${k}`]
  );
}

describe('locales', () => {
  const enKeys = keysOf(en).sort();

  it('has one JSON file per language listed in i18n-meta.json', () => {
    const files = Object.keys(locales).map(p => p.replace('./', '').replace('.json', '')).sort();
    expect(files).toEqual(Object.keys(meta.languages).sort());
  });

  it.each(Object.keys(meta.languages))('%s has exactly the same keys as en', (lang) => {
    expect(keysOf(locales[`./${lang}.json`].default).sort()).toEqual(enKeys);
  });
});
