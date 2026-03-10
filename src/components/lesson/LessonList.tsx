import { useEffect, useMemo } from 'react';
import type { Lesson } from '../../types';
import { useLessonStore, getLessonLanguage } from '../../stores/lessonStore';
import { useHistoryStore } from '../../stores/historyStore';
import { LessonCard } from './LessonCard';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export function LessonList() {
  const { lessons, collections, isLoading, error, loadLessonsByLang } = useLessonStore();
  const getLessonStats = useHistoryStore((state) => state.getLessonStats);
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();

  useEffect(() => {
    loadLessonsByLang(i18n.language);
  }, [loadLessonsByLang, i18n.language]);

  const filteredLessons = useMemo(() => {
    const targetLessonLang = getLessonLanguage(i18n.language);
    if (!targetLessonLang) return [];
    return lessons.filter((lesson) => lesson.language === targetLessonLang);
  }, [lessons, i18n.language]);

  const collectionNameMap = useMemo(() => {
    const map = new Map<string, string>();
    collections.forEach(c => map.set(c.id, c.name));
    return map;
  }, [collections]);

  const groupedLessons = useMemo(() => {
    const groups: { collectionId: string; lessons: Lesson[] }[] = [];
    filteredLessons.forEach((lesson) => {
      const lastGroup = groups[groups.length - 1];
      if (lastGroup && lastGroup.collectionId === lesson.collectionId) {
        lastGroup.lessons.push(lesson);
      } else {
        groups.push({ collectionId: lesson.collectionId, lessons: [lesson] });
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
        <div key={group.collectionId} className="mb-10">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-l-4 border-primary pl-3">
            {collectionNameMap.get(group.collectionId) ?? group.collectionId}
          </h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {group.lessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                collectionName={collectionNameMap.get(lesson.collectionId)}
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
