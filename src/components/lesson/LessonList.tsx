import { useEffect, useMemo } from 'react';
import type { Lesson } from '../../types';
import { useLessonStore } from '../../stores/lessonStore';
import { useHistoryStore } from '../../stores/historyStore';
import { LessonCard } from './LessonCard';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function LessonList() {
  const { lessons, isLoading, error, loadLessons } = useLessonStore();
  const getLessonStats = useHistoryStore((state) => state.getLessonStats);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  const filteredLessons = useMemo(() => {
    return lessons.filter((lesson) => {
      if (i18n.language.startsWith('zh')) {
        return lesson.language === 'chinese';
      } else if (i18n.language.startsWith('en')) {
        return lesson.language === 'english';
      }
      return true;
    });
  }, [lessons, i18n.language]);

  const groupedLessons = useMemo(() => {
    const groups: { grade: string; lessons: Lesson[] }[] = [];
    filteredLessons.forEach((lesson) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.grade === lesson.grade) {
        lastGroup.lessons.push(lesson);
      } else {
        groups.push({ grade: lesson.grade, lessons: [lesson] });
      }
    });
    return groups;
  }, [filteredLessons]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-500">{t('loading')}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-red-500">{t('error')}: {error}</div>
      </div>
    );
  }

  const handleLessonClick = (lesson: Lesson) => {
    navigate(`/practice/${lesson.id}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 pb-12">
      <h1 className="text-3xl font-bold text-gray-900 mb-8 mt-8">{t('select_grade')}</h1>

      {groupedLessons.map((group) => (
        <div key={group.grade} className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-blue-500 pl-3">
            {group.grade}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                stats={getLessonStats(lesson.id)}
                onSelect={() => handleLessonClick(lesson)}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
