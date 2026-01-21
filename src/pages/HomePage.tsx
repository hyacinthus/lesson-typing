import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useLessonStore } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import type { Lesson } from '../types';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { lessons, isLoading, error, loadLessons } = useLessonStore();

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  // Extract unique grades
  const grades = useMemo(() => {
    const uniqueGrades = Array.from(new Set(lessons.map((l) => l.grade)));
    return uniqueGrades;
  }, [lessons]);

  // Use the user's selection, or default to the first available grade
  const currentGrade = selectedGrade || grades[0];

  const handleStart = () => {
    if (isLoading || lessons.length === 0) return;

    let pool = lessons;
    if (currentGrade) {
      pool = lessons.filter(l => l.grade === currentGrade);
    }

    if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    setActiveLesson(pool[randomIndex]);
  };

  const handleNextLesson = useCallback(() => {
    if (!activeLesson || lessons.length === 0) return;

    // Filter by same grade as current active lesson
    const sameGradeLessons = lessons.filter(l => l.grade === activeLesson.grade);
    const pool = sameGradeLessons.length > 0 ? sameGradeLessons : lessons;

    if (pool.length === 0) return;

    // Pick random
    let nextLesson = pool[Math.floor(Math.random() * pool.length)];

    // Try to find a different one if pool has more than 1
    if (pool.length > 1 && nextLesson.id === activeLesson.id) {
      const remaining = pool.filter(l => l.id !== activeLesson.id);
      nextLesson = remaining[Math.floor(Math.random() * remaining.length)];
    }

    setActiveLesson(nextLesson);
  }, [activeLesson, lessons]);

  const handleBackToMenu = () => {
    setActiveLesson(null);
  };

  const toggleLanguage = () => {
    const newLang = i18n.language === 'zh' ? 'en' : 'zh';
    i18n.changeLanguage(newLang);
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-red-500">
        {t('error')}: {error}
      </div>
    );
  }

  // If active lesson is set, render the practice view
  if (activeLesson) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LessonPractice
          key={activeLesson.id}
          lesson={activeLesson}
          onBack={handleBackToMenu}
          onNext={handleNextLesson}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header / Top Bar */}
      <div className="bg-white shadow-sm px-6 py-4 flex flex-col md:flex-row justify-between items-center gap-4 z-10">
        {/* Grade List */}
        <div className="flex flex-wrap gap-2 justify-center md:justify-start flex-1">
          {grades.map((grade) => (
            <button
              key={grade}
              onClick={() => setSelectedGrade(grade)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${currentGrade === grade
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
            >
              {grade}
            </button>
          ))}
        </div>

        {/* Language Switcher */}
        <button
          onClick={toggleLanguage}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors"
          title={t('language')}
        >
          <Globe size={20} />
          <span className="uppercase font-medium">{i18n.language === 'zh' ? 'English' : '中文'}</span>
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center p-4">
        {isLoading ? (
          <div className="text-xl text-gray-500 animate-pulse">{t('loading')}</div>
        ) : (
          <button
            onClick={handleStart}
            disabled={!currentGrade && grades.length === 0}
            className="group relative px-12 py-6 bg-blue-600 text-white text-4xl font-bold rounded-2xl shadow-lg hover:bg-blue-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
          >
            {t('start')}
            <div className="absolute inset-0 rounded-2xl ring-4 ring-white/20 group-hover:ring-white/40 transition-all" />
          </button>
        )}

        {!activeLesson && currentGrade && (
          <p className="mt-6 text-gray-500 text-lg">
            {/* Optional: Show how many lessons in pool */}
          </p>
        )}
      </main>
    </div>
  );
}
