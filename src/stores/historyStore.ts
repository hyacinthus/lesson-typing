import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PracticeRecord, LessonStats } from '../types';
import { supabase } from '../lib/supabase';
import { useAuthStore } from './authStore';

const STORAGE_KEY = 'typing-practices';

interface HistoryStore {
  practices: PracticeRecord[];

  // Actions
  addPractice: (record: PracticeRecord, language?: string, collectionId?: string) => Promise<void>;
  getPractices: () => PracticeRecord[];
  getLessonStats: (lessonId: string) => LessonStats;
  getBestPracticeLog: (lessonId: string) => Promise<PracticeRecord | null>;
  getRecentPracticeLogs: (lessonId: string, limit?: number) => Promise<PracticeRecord[]>;
  clearAll: () => void;
}

export const useHistoryStore = create<HistoryStore>()(
  persist(
    (set, get) => ({
      practices: [],

      addPractice: async (record: PracticeRecord, language = 'unknown', collectionId = 'unknown') => {
        // 1. Update local state immediately (optimistic update)
        set((state) => {
          const newPractices = [record, ...state.practices];
          // Keep only recent 100 records locally
          if (newPractices.length > 100) {
            newPractices.length = 100;
          }
          return { practices: newPractices };
        });

        // 2. Sync to Supabase if user is logged in
        const { user } = useAuthStore.getState();
        if (!user) return;

        try {
          // A. Insert into logs table
          const { error: logError } = await supabase
            .from('lt_practice_logs')
            .insert({
              user_id: user.id,
              lesson_id: record.lessonId,
              language,
              collection_id: collectionId,
              cpm: record.cpm,
              wpm: record.wpm,
              accuracy: record.accuracy,
              duration: record.duration,
              total_chars: record.totalCharacters,
              correct_chars: record.correctChars,
              error_chars: record.incorrectChars,
              created_at: record.completedAt
            });

          if (logError) {
            console.error('Failed to save practice log:', logError);
            return;
          }

          // B. Check and update stats table if accuracy is 100%
          if (record.accuracy === 100) {
            // Check existing best score
            const { data: existingStats, error: statsError } = await supabase
              .from('lt_user_lesson_stats')
              .select('best_cpm')
              .eq('user_id', user.id)
              .eq('lesson_id', record.lessonId)
              .maybeSingle();

            if (statsError) {
              console.error('Failed to fetch lesson stats:', statsError);
              return;
            }

            // If no record or new score is better (higher CPM)
            if (!existingStats || record.cpm > existingStats.best_cpm) {
              const { error: upsertError } = await supabase
                .from('lt_user_lesson_stats')
                .upsert({
                  user_id: user.id,
                  lesson_id: record.lessonId,
                  best_cpm: record.cpm,
                  best_wpm: record.wpm,
                  duration: record.duration,
                  achieved_at: record.completedAt
                });

              if (upsertError) {
                console.error('Failed to update lesson stats:', upsertError);
              }
            }
          }
        } catch (err) {
          console.error('Error in addPractice:', err);
        }
      },

      getPractices: () => {
        return get().practices;
      },

      getBestPracticeLog: async (lessonId: string) => {
        const { user } = useAuthStore.getState();
        if (!user) return null;

        try {
          const { data, error } = await supabase
            .from('lt_practice_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .order('accuracy', { ascending: false })
            .order('duration', { ascending: false })
            .limit(1)
            .maybeSingle();

          if (error) {
            console.error('Failed to fetch best practice log:', error);
            return null;
          }

          if (data) {
            return {
              id: data.id,
              lessonId: data.lesson_id,
              lessonTitle: '',
              duration: data.duration,
              cpm: data.cpm,
              wpm: data.wpm,
              accuracy: data.accuracy,
              totalCharacters: data.total_chars || 0,
              correctChars: data.correct_chars || 0,
              incorrectChars: data.error_chars || 0,
              completedAt: data.created_at || new Date().toISOString(),
            } as PracticeRecord;
          }

          return null;
        } catch (err) {
          console.error('Error fetching best practice log:', err);
          return null;
        }
      },

      getRecentPracticeLogs: async (lessonId: string, limit = 10) => {
        const { user } = useAuthStore.getState();
        if (!user) return [];

        try {
          const { data, error } = await supabase
            .from('lt_practice_logs')
            .select('*')
            .eq('user_id', user.id)
            .eq('lesson_id', lessonId)
            .order('created_at', { ascending: false })
            .limit(limit);

          if (error) {
            console.error('Failed to fetch recent practice logs:', error);
            return [];
          }

          if (data) {
            return data.map(log => ({
              id: log.id,
              lessonId: log.lesson_id,
              lessonTitle: '',
              duration: log.duration,
              cpm: log.cpm,
              wpm: log.wpm,
              accuracy: log.accuracy,
              totalCharacters: log.total_chars || 0,
              correctChars: log.correct_chars || 0,
              incorrectChars: log.error_chars || 0,
              completedAt: log.created_at || new Date().toISOString(),
            }));
          }

          return [];
        } catch (err) {
          console.error('Error fetching recent practice logs:', err);
          return [];
        }
      },

      getLessonStats: (lessonId: string) => {
        // Calculate stats from local practices
        // Note: This might differ from server stats if local history is incomplete/cleared
        // Ideally, we should fetch from server, but for now we use local cache
        const practices = get().practices.filter((p) => p.lessonId === lessonId);

        if (practices.length === 0) {
          return {
            bestCpm: 0,
            bestWpm: 0,
            duration: 0,
            achievedAt: null,
          };
        }

        // Filter for 100% accuracy runs to determine "best" as per new rules
        // If no 100% runs, maybe return 0 or the best non-perfect run?
        // The rule is "only 100% can enter the ranking table".
        // But for local display, maybe we show the best regardless?
        // Let's stick to the rule: "best score" implies 100% accuracy based on user request.
        // However, if the user has never achieved 100%, showing 0 might be discouraging locally.
        // Let's calculate best CPM among 100% accuracy runs first.
        const perfectRuns = practices.filter(p => p.accuracy === 100);

        if (perfectRuns.length > 0) {
          const bestRun = perfectRuns.reduce((prev, current) =>
            (prev.cpm > current.cpm) ? prev : current
          );
          return {
            bestCpm: bestRun.cpm,
            bestWpm: bestRun.wpm,
            duration: bestRun.duration,
            achievedAt: bestRun.completedAt
          };
        }

        // Fallback: If no perfect runs, maybe show the best run overall but mark it?
        // Or just return 0 to encourage perfection.
        // Given the strict requirement "only 100% ... ranking", I'll return 0 for "best stats" if no perfect run exists,
        // effectively treating non-perfect runs as "practice" only.
        return {
          bestCpm: 0,
          bestWpm: 0,
          duration: 0,
          achievedAt: null
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
