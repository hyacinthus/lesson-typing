import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import type { RealtimeStats } from '../types';

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  nickname: string | null;
  bestCpm: number;
  bestWpm: number;
  isCurrentUser: boolean;
}

interface UseLeaderboardResult {
  entries: LeaderboardEntry[];
  currentUserEntry: LeaderboardEntry | null;
  loading: boolean;
}

export function useLeaderboard(lessonId: string, currentStats?: RealtimeStats): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const user = useAuthStore((s) => s.user);

  const statsSig = currentStats ? `${currentStats.cpm}-${currentStats.duration}-${currentStats.accuracy}` : '';

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);

      // Delay slightly to let edge function finish writing stats (only after completion)
      if (currentStats) {
        await new Promise((r) => setTimeout(r, 1000));
        if (cancelled) return;
      }

      // Step 1: Get top 10 by best_cpm
      const { data: statsData, error: statsError } = await supabase
        .from('lt_user_lesson_stats')
        .select('user_id, best_cpm, best_wpm')
        .eq('lesson_id', lessonId)
        .order('best_cpm', { ascending: false })
        .limit(10);

      if (statsError || !statsData || statsData.length === 0) {
        setEntries([]);
        setCurrentUserEntry(null);
        setLoading(false);
        return;
      }

      // Step 2: Batch fetch nicknames
      const userIds = statsData.map((s) => s.user_id);
      const { data: profiles } = await supabase
        .from('lt_profiles')
        .select('id, nickname')
        .in('id', userIds);

      const nicknameMap = new Map<string, string | null>();
      if (profiles) {
        for (const p of profiles) {
          nicknameMap.set(p.id, p.nickname);
        }
      }

      const top10: LeaderboardEntry[] = statsData.map((s, i) => ({
        rank: i + 1,
        userId: s.user_id,
        nickname: nicknameMap.get(s.user_id) ?? null,
        bestCpm: s.best_cpm,
        bestWpm: s.best_wpm,
        isCurrentUser: user?.id === s.user_id,
      }));

      if (cancelled) return;
      setEntries(top10);

      // Step 3: If logged-in user is not in top 10, find their rank
      if (user && !top10.some((e) => e.isCurrentUser)) {
        const { data: userStat } = await supabase
          .from('lt_user_lesson_stats')
          .select('best_cpm, best_wpm')
          .eq('lesson_id', lessonId)
          .eq('user_id', user.id)
          .single();

        if (userStat && !cancelled) {
          const { count } = await supabase
            .from('lt_user_lesson_stats')
            .select('*', { count: 'exact', head: true })
            .eq('lesson_id', lessonId)
            .gt('best_cpm', userStat.best_cpm);

          const { data: userProfile } = await supabase
            .from('lt_profiles')
            .select('nickname')
            .eq('id', user.id)
            .single();

          if (!cancelled) {
            setCurrentUserEntry({
              rank: (count ?? 0) + 1,
              userId: user.id,
              nickname: userProfile?.nickname ?? null,
              bestCpm: userStat.best_cpm,
              bestWpm: userStat.best_wpm,
              isCurrentUser: true,
            });
          }
        } else {
          setCurrentUserEntry(null);
        }
      } else {
        setCurrentUserEntry(null);
      }

      setLoading(false);
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lessonId, user?.id, statsSig]);

  return { entries, currentUserEntry, loading };
}
