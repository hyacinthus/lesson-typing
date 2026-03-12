import { create } from 'zustand';
import type { Lesson, Collection } from '../types';
import { loadLessonsByLanguage, loadCollectionsByLanguage, findLessonById } from '../utils/lessonLoader';

// Map i18n language codes to lesson language IDs
const LANGUAGE_MAP: Record<string, string> = {
  'zh': 'chinese',
  'zh-CN': 'chinese',
  'zh-TW': 'chinese',
  'en': 'english',
  'en-US': 'english',
  'en-GB': 'english',
  'es': 'spanish',
  'es-ES': 'spanish',
  'es-MX': 'spanish',
  'ja': 'japanese',
  'ja-JP': 'japanese',
  'ko': 'korean',
  'ko-KR': 'korean',
  'pt': 'portuguese',
  'pt-BR': 'portuguese',
  'pt-PT': 'portuguese',
  'fr': 'french',
  'fr-FR': 'french',
  'de': 'german',
  'de-DE': 'german',
  'it': 'italian',
  'it-IT': 'italian',
};

export function getLessonLanguage(i18nLang: string): string | undefined {
  return LANGUAGE_MAP[i18nLang] || LANGUAGE_MAP[i18nLang.split('-')[0]];
}

interface LessonStore {
  lessons: Lesson[];
  collections: Collection[];
  currentLesson: Lesson | null;
  isLoading: boolean;
  error: string | null;
  loadedLanguages: Set<string>;

  loadLessonsByLang: (i18nLang: string) => Promise<void>;
  preloadEnglish: () => void;
  loadLesson: (id: string) => Promise<void>;
  setCurrentLesson: (lesson: Lesson) => void;
  clearCurrentLesson: () => void;
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  lessons: [],
  collections: [],
  currentLesson: null,
  isLoading: false,
  error: null,
  loadedLanguages: new Set(),

  loadLessonsByLang: async (i18nLang: string) => {
    const language = getLessonLanguage(i18nLang);
    if (!language) {
      set({ error: `Unsupported language: ${i18nLang}`, isLoading: false });
      return;
    }

    if (get().loadedLanguages.has(language)) {
      // Language data already cached, but still update collections to match current language
      const collections = await loadCollectionsByLanguage(language);
      set({ collections });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const [newLessons, collections] = await Promise.all([
        loadLessonsByLanguage(language),
        loadCollectionsByLanguage(language),
      ]);
      const existing = get().lessons.filter(l => l.language !== language);
      const loadedLanguages = new Set(get().loadedLanguages);
      loadedLanguages.add(language);
      set({ lessons: [...existing, ...newLessons], collections, isLoading: false, loadedLanguages });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load lessons',
        isLoading: false,
      });
    }
  },

  preloadEnglish: () => {
    const state = get();
    if (state.loadedLanguages.has('english')) return;

    const load = () => {
      // Warm loader caches only; loadLessonsByLang will set store state when user switches
      Promise.all([
        loadLessonsByLanguage('english'),
        loadCollectionsByLanguage('english'),
      ]).catch(() => {
        // Silent fail for background preload
      });
    };

    if (typeof requestIdleCallback !== 'undefined') {
      requestIdleCallback(load);
    } else {
      setTimeout(load, 2000);
    }
  },

  loadLesson: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const lesson = await findLessonById(id);
      if (lesson) {
        set({ currentLesson: lesson, isLoading: false });
      } else {
        set({ error: 'Lesson not found', isLoading: false });
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load lesson',
        isLoading: false,
      });
    }
  },

  setCurrentLesson: (lesson: Lesson) => {
    set({ currentLesson: lesson });
  },

  clearCurrentLesson: () => {
    set({ currentLesson: null });
  },
}));
