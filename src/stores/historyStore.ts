import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PracticeRecord, LessonStats } from '../types';

const STORAGE_KEY = 'typing-practices';

interface HistoryStore {
  practices: PracticeRecord[];

  // Actions
  addPractice: (record: PracticeRecord) => void;
  getPractices: () => PracticeRecord[];
  getLessonStats: (lessonId: string) => LessonStats;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      practices: [],

      addPractice: (record: PracticeRecord) => {
        set((state) => {
          const newPractices = [record, ...state.practices];
          // 只保留最近 100 条
          if (newPractices.length > 100) {
            newPractices.length = 100;
          }
          return { practices: newPractices };
        });
      },

      getPractices: () => {
        return get().practices;
      },

      getLessonStats: (lessonId: string) => {
        const practices = get().practices.filter((p) => p.lessonId === lessonId);

        if (practices.length === 0) {
          return {
            totalPractices: 0,
            bestSpeed: 0,
            averageAccuracy: 0,
            lastPracticed: null,
          };
        }

        const bestSpeed = Math.max(...practices.map((p) => p.chineseSpeed), 0);
        const averageAccuracy =
          practices.reduce((sum, p) => sum + p.accuracy, 0) / practices.length;

        return {
          totalPractices: practices.length,
          bestSpeed,
          averageAccuracy,
          lastPracticed: practices[0].completedAt,
        };
      },

      clearAll: () => {
        set({ practices: [] });
      },
    }),
    {
      name: STORAGE_KEY,
    }
  )
);
