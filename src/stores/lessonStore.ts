import { create } from 'zustand';
import type { Lesson } from '../types';
import { loadLessonsByLanguage, findLessonById } from '../utils/lessonLoader';

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

    if (get().loadedLanguages.has(language)) return;

    set({ isLoading: true, error: null });
    try {
      const newLessons = await loadLessonsByLanguage(language);
      const existing = get().lessons.filter(l => l.language !== language);
      const loadedLanguages = new Set(get().loadedLanguages);
      loadedLanguages.add(language);
      set({ lessons: [...existing, ...newLessons], isLoading: false, loadedLanguages });
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
      loadLessonsByLanguage('english').then(newLessons => {
        const existing = get().lessons.filter(l => l.language !== 'english');
        const loadedLanguages = new Set(get().loadedLanguages);
        loadedLanguages.add('english');
        set({ lessons: [...existing, ...newLessons], loadedLanguages });
      }).catch(() => {
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
