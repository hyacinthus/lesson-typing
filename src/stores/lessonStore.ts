import { create } from 'zustand';
import type { LessonSummary, Collection } from '../types';
import { loadLessonsByLanguage, loadCollectionsByLanguage } from '../utils/lessonLoader';
import { getLessonLanguage } from '../lib/languages';

interface LessonStore {
  lessons: LessonSummary[];
  collections: Collection[];
  isLoading: boolean;
  error: string | null;
  loadedLanguages: Set<string>;

  loadLessonsByLang: (i18nLang: string) => Promise<void>;
  preloadEnglish: () => void;
}

export const useLessonStore = create<LessonStore>((set, get) => ({
  lessons: [],
  collections: [],
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
}));
