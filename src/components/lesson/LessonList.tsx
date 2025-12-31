import { useEffect } from 'react';
import type { Lesson } from '../../types';
import { useLessonStore } from '../../stores/lessonStore';
import { useHistoryStore } from '../../stores/historyStore';
import { LessonCard } from './LessonCard';
import { useNavigate } from 'react-router-dom';

export function LessonList() {
  const { lessons, isLoading, error, loadLessons } = useLessonStore();
  const getLessonStats = useHistoryStore((state) => state.getLessonStats);
  const navigate = useNavigate();

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">加载失败: {error}</div>
      </div>
    );
  }

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/practice/${lesson.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">选择课文</h1>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {lessons.map((lesson) => (
          <LessonCard
            key={lesson.id}
            lesson={lesson}
            stats={getLessonStats(lesson.id)}
            onSelect={() => handleLessonClick(lesson)}
          />
        ))}
      </div>
    </div>
  );
}
