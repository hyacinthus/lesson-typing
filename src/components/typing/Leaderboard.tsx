import { useTranslation } from 'react-i18next';
import { useLeaderboard } from '../../hooks/useLeaderboard';
import type { RealtimeStats } from '../../types';

interface LeaderboardProps {
  lessonId: string;
  currentStats?: RealtimeStats;
}

const RANK_MEDALS = ['', '\u{1F947}', '\u{1F948}', '\u{1F949}'];

export function Leaderboard({ lessonId, currentStats }: LeaderboardProps) {
  const { t } = useTranslation();
  const { entries, currentUserEntry, loading } = useLeaderboard(lessonId, currentStats);

  if (loading || entries.length === 0) return null;

  const renderRow = (entry: typeof entries[0]) => (
    <tr
      key={entry.userId}
      className={entry.isCurrentUser ? 'bg-primary/5 border-l-2 border-primary' : ''}
    >
      <td className="py-1.5 px-2 md:px-3 text-left text-sm font-medium w-12">
        {entry.rank <= 3 ? RANK_MEDALS[entry.rank] : entry.rank}
      </td>
      <td className="py-1.5 px-2 md:px-3 text-left text-sm truncate max-w-[120px] md:max-w-none">
        {entry.nickname || t('leaderboard.anonymous')}
        {entry.isCurrentUser && <span className="ml-1 text-xs text-primary font-medium">({t('leaderboard.you')})</span>}
      </td>
      <td className="py-1.5 px-2 md:px-3 text-left text-sm font-mono">{entry.bestCpm}</td>
      <td className="py-1.5 px-2 md:px-3 text-left text-sm font-mono hidden md:table-cell">{entry.bestWpm}</td>
    </tr>
  );

  return (
    <div className="mt-4 md:mt-8 border-t border-gray-200 pt-4 md:pt-6">
      <h3 className="text-lg font-bold text-gray-800 mb-4 text-left">
        {'\u{1F3C6}'} {t('leaderboard.title')}
      </h3>
      <table className="w-full">
        <thead>
          <tr className="text-xs text-gray-500 uppercase border-b border-gray-200">
            <th className="py-2 px-2 md:px-3 text-left w-12">{t('leaderboard.rank')}</th>
            <th className="py-2 px-2 md:px-3 text-left">{t('leaderboard.player')}</th>
            <th className="py-2 px-2 md:px-3 text-left">CPM</th>
            <th className="py-2 px-2 md:px-3 text-left hidden md:table-cell">WPM</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(renderRow)}
          {currentUserEntry && (
            <>
              <tr>
                <td colSpan={4} className="text-center text-gray-400 text-xs py-1">···</td>
              </tr>
              {renderRow(currentUserEntry)}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}
