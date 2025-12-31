import type { Lesson, LessonStats } from '../../types';
import { BookOpen, Clock, Target } from 'lucide-react';

interface LessonCardProps {
  lesson: Lesson;
  stats?: LessonStats;
  onSelect: () => void;
}

export function LessonCard({ lesson, stats, onSelect }: LessonCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onSelect}
    >
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="text-xl font-bold text-gray-900 mb-1">{lesson.title}</h3>
          <div className="flex gap-2 text-sm">
            <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded">
              {lesson.grade}
            </span>
            {lesson.category && (
              <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {lesson.category}
              </span>
            )}
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded">
              难度 {lesson.difficulty}
            </span>
          </div>
        </div>
      </div>

      <div className="text-sm text-gray-600 mb-4 line-clamp-3">
        {lesson.content.slice(0, 100)}...
      </div>

      <div className="flex items-center justify-between text-sm text-gray-500">
        <div className="flex gap-4">
          <span className="flex items-center gap-1">
            <BookOpen size={16} />
            {lesson.chineseCharCount} 字
          </span>
        </div>

        {stats && stats.totalPractices > 0 && (
          <div className="flex gap-4">
            <span className="flex items-center gap-1 text-green-600">
              <Target size={16} />
              最高 {stats.bestSpeed} 字/分
            </span>
            <span className="flex items-center gap-1">
              <Clock size={16} />
              练习 {stats.totalPractices} 次
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
