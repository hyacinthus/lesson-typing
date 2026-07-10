import { useTranslation } from 'react-i18next';
import type { RealtimeStats } from '../../types';
import { formatTime, getScoreLevel } from '../../utils/statsCalculator';

interface StatsPanelProps {
  stats: RealtimeStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const { t } = useTranslation();
  // Use CPM for score calculation as thresholds (200+) are likely CPM based
  const score = getScoreLevel(stats.accuracy, stats.cpm);
  // Accuracy/grade are meaningless before the first keystroke
  const hasStarted = stats.correctChars + stats.incorrectChars > 0 || stats.duration > 0;
  const accuracyColor = hasStarted ? score.color : 'text-muted-foreground';

  return (
    <>
      {/* Mobile: single-row compact toolbar */}
      <div className="flex md:hidden items-center justify-between bg-card rounded-lg px-4 py-2.5 mb-4 shadow-sm border border-border text-sm">
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">{t('stats.duration')}</span>
          <span className="font-bold text-foreground tabular-nums">{formatTime(stats.duration)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">CPM</span>
          <span className="font-bold text-primary tabular-nums">{stats.cpm}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-muted-foreground">WPM</span>
          <span className="font-bold text-primary tabular-nums">{stats.wpm}</span>
        </div>
        <div className="flex items-center gap-1">
          {hasStarted ? (
            <span className={`font-bold tabular-nums ${score.color}`}>{stats.accuracy}%</span>
          ) : (
            <span className="font-bold text-muted-foreground">—</span>
          )}
        </div>
      </div>

      {/* Desktop: original 4-column grid */}
      <div className="hidden md:grid grid-cols-4 gap-4 mb-6">
        {/* 时长 */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('stats.duration')}</div>
          <div className="text-2xl font-bold text-foreground tabular-nums">
            {formatTime(stats.duration)}
          </div>
        </div>

        {/* 字符速率 (CPM) */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('stats.char_speed')}</div>
          <div className="text-2xl font-bold text-primary tabular-nums">
            {stats.cpm}
          </div>
          <div className="text-xs text-muted-foreground">{t('stats.char_unit')}</div>
        </div>

        {/* 中文速率/WPM */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('stats.wpm_title')}</div>
          <div className="text-2xl font-bold text-primary tabular-nums">
            {stats.wpm}
          </div>
          <div className="text-xs text-muted-foreground">{t('stats.wpm_unit')}</div>
        </div>

        {/* 准确率 */}
        <div className="bg-card rounded-lg p-4 shadow-sm border border-border">
          <div className="text-sm text-muted-foreground mb-1">{t('stats.accuracy')}</div>
          <div className={`text-2xl font-bold tabular-nums ${accuracyColor}`}>
            {hasStarted ? `${stats.accuracy}%` : '—'}
          </div>
          <div className={`text-xs font-bold ${accuracyColor}`}>
            {hasStarted ? `${t('stats.grade')} ${score.level}` : '\u00A0'}
          </div>
        </div>
      </div>
    </>
  );
}
