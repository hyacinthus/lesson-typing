import { create } from 'zustand';
import type { Lesson } from '../types';
import { loadAllLessons, findLessonById } from '../utils/lessonLoader';

interface LessonStore {
  lessons: Lesson[];
  currentLesson: Lesson | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  loadLessons: () => Promise<void>;
  loadLesson: (id: string) => Promise<void>;
  setCurrentLesson: (lesson: Lesson) => void;
  clearCurrentLesson: () => void;
}

export const useLessonStore = create<LessonStore>((set) => ({
  lessons: [],
  currentLesson: null,
  isLoading: false,
  error: null,

  loadLessons: async () => {
    set({ isLoading: true, error: null });
    try {
      const lessons = await loadAllLessons();
      set({ lessons, isLoading: false });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load lessons',
        isLoading: false,
      });
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
