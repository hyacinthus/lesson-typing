import type { RealtimeStats } from '../../types';
import { formatTime, getGrade } from '../../utils/statsCalculator';

interface StatsPanelProps {
  stats: RealtimeStats;
}

export function StatsPanel({ stats }: StatsPanelProps) {
  const grade = getGrade(stats.accuracy, stats.chineseSpeed);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* 时长 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">时长</div>
        <div className="text-2xl font-bold text-gray-900">
          {formatTime(stats.duration)}
        </div>
      </div>

      {/* 字符速率 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">字符速率</div>
        <div className="text-2xl font-bold text-[#90caf9]">
          {stats.characterSpeed}
        </div>
        <div className="text-xs text-gray-400">字符/分钟</div>
      </div>

      {/* 中文速率 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">中文速率</div>
        <div className="text-2xl font-bold text-green-600">
          {stats.chineseSpeed}
        </div>
        <div className="text-xs text-gray-400">字/分钟</div>
      </div>

      {/* 准确率 */}
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
        <div className="text-sm text-gray-500 mb-1">准确率</div>
        <div className="text-2xl font-bold text-purple-600">
          {stats.accuracy}%
        </div>
        <div className={`text-xs font-bold ${grade.color}`}>
          等级: {grade.grade}
        </div>
      </div>
    </div>
  );
}
