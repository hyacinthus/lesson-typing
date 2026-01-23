import { useTranslation } from 'react-i18next';
import type { RealtimeStats } from '../../types';
import { formatTime, getGrade } from '../../utils/statsCalculator';

interface StatsPanelProps {
  stats: RealtimeStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const { t } = useTranslation();
  const grade = getGrade(stats.accuracy, stats.chineseSpeed);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* 时长 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">{t('stats.duration')}</div>
        <div className="text-2xl font-bold text-gray-900">
          {formatTime(stats.duration)}
        </div>
      </div>

      {/* 字符速率 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">{t('stats.char_speed')}</div>
        <div className="text-2xl font-bold text-[#90caf9]">
          {stats.characterSpeed}
        </div>
        <div className="text-xs text-gray-400">{t('stats.char_unit')}</div>
      </div>

      {/* 中文速率/WPM */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">{t('stats.wpm_title')}</div>
        <div className="text-2xl font-bold text-green-600">
          {stats.chineseSpeed}
        </div>
        <div className="text-xs text-gray-400">{t('stats.wpm_unit')}</div>
      </div>

      {/* 准确率 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">{t('stats.accuracy')}</div>
        <div className="text-2xl font-bold text-purple-600">
          {stats.accuracy}%
        </div>
        <div className={`text-xs font-bold ${grade.color}`}>
          {t('stats.grade')} {grade.grade}
        </div>
      </div>
    </div>
  );
}
