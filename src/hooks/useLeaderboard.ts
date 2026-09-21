import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';
import { useHistoryStore } from '../stores/historyStore';

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

const TOP_N = 10;

interface LeaderboardRow {
  rank: number;
  user_id: string;
  nickname: string | null;
  best_cpm: number;
  best_wpm: number;
  is_current_user: boolean;
}

/**
 * Top-10 leaderboard for a lesson plus the viewer's own rank, fetched with
 * a single RPC (see supabase/schema/12_lt_leaderboard_rpc.sql). Refetches
 * once a submitted run has been processed by the server.
 */
export function useLeaderboard(lessonId: string): UseLeaderboardResult {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [currentUserEntry, setCurrentUserEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const userId = useAuthStore((s) => s.user?.id);
  const submissionVersion = useHistoryStore((s) => s.submissionVersion);

  useEffect(() => {
    let cancelled = false;

    async function fetchLeaderboard() {
      setLoading(true);
      const { data, error } = await supabase.rpc('lt_lesson_leaderboard', {
        p_lesson_id: lessonId,
        p_limit: TOP_N,
      });
      if (cancelled) return;

      if (error || !data) {
        if (error) console.error('Failed to fetch leaderboard:', error);
        setEntries([]);
        setCurrentUserEntry(null);
        setLoading(false);
        return;
      }

      const rows = (data as LeaderboardRow[]).map((row) => ({
        rank: row.rank,
        userId: row.user_id,
        nickname: row.nickname,
        bestCpm: row.best_cpm,
        bestWpm: row.best_wpm,
        isCurrentUser: row.is_current_user,
      }));

      setEntries(rows.filter((e) => e.rank <= TOP_N));
      setCurrentUserEntry(rows.find((e) => e.isCurrentUser && e.rank > TOP_N) ?? null);
      setLoading(false);
    }

    fetchLeaderboard();
    return () => { cancelled = true; };
  }, [lessonId, userId, submissionVersion]);

  return { entries, currentUserEntry, loading };
}
