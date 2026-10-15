import meta from '../i18n-meta.json';

/**
 * UI languages, derived from i18n-meta.json so the router, the language
 * picker, the lesson-language mapping and the generated SEO pages cannot
 * drift apart.
 */
export const LANGUAGE_OPTIONS: { code: string; label: string }[] = Object.entries(meta.languages).map(
  ([code, { label }]) => ({ code, label })
);

export const SUPPORTED_LANGS: string[] = LANGUAGE_OPTIONS.map(l => l.code);

export const LANG_STORAGE_KEY = 'lesson-typing-language';

export function isSupportedLang(lang: string | undefined | null): lang is string {
  return !!lang && SUPPORTED_LANGS.includes(lang);
}

const LESSON_LANGUAGES: Record<string, string> = Object.fromEntries(
  Object.entries(meta.languages).map(([code, { lessonLanguage }]) => [code, lessonLanguage])
);

/** Map a UI language code (e.g. "zh") to the lesson language id (e.g. "chinese"). */
export function getLessonLanguage(uiLang: string): string | undefined {
  return LESSON_LANGUAGES[uiLang.split('-')[0]];
}

const SITE_TITLES: Record<string, string> = Object.fromEntries(
  Object.entries(meta.languages).map(([code, { title }]) => [code, title])
);

/** The site's title in a UI language, as its generated entry page has it. */
export function getSiteTitle(uiLang: string): string | undefined {
  return SITE_TITLES[uiLang];
}

/** A path without its language, e.g. "/download" for "/zh/download". */
export function pagePath(pathname: string): string {
  return pathname.replace(/^\/[^/]*/, '');
}
