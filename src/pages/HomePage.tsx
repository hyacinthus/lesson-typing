import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useLessonStore } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import { Logo } from '../components/Logo';
import type { Lesson } from '../types';

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { lessons, isLoading, error, loadLessons } = useLessonStore();

  const [selectedGrade, setSelectedGrade] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  // Filter lessons based on current language
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

  // Extract unique grades from filtered lessons
  const grades = useMemo(() => {
    const uniqueGrades = Array.from(new Set(filteredLessons.map((l) => l.grade)));
    return uniqueGrades;
  }, [filteredLessons]);

  // Reset selected grade when language changes or lessons change
  useEffect(() => {
    if (selectedGrade && !grades.includes(selectedGrade)) {
      setSelectedGrade(null);
    }
  }, [grades, selectedGrade]);

  // Use the user's selection, or default to the first available grade
  const currentGrade = selectedGrade || grades[0];

  const handleStart = () => {
    if (isLoading || filteredLessons.length === 0) return;

    let pool = filteredLessons;
    if (currentGrade) {
      pool = filteredLessons.filter(l => l.grade === currentGrade);
    }

    if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    setActiveLesson(pool[randomIndex]);
  };

  const handleNextLesson = useCallback(() => {
    if (!activeLesson || filteredLessons.length === 0) return;

    // Filter by same grade as current active lesson
    const sameGradeLessons = filteredLessons.filter(l => l.grade === activeLesson.grade);
    const pool = sameGradeLessons.length > 0 ? sameGradeLessons : filteredLessons;

    if (pool.length === 0) return;

    // Pick random
    let nextLesson = pool[Math.floor(Math.random() * pool.length)];

    // Try to find a different one if pool has more than 1
    if (pool.length > 1 && nextLesson.id === activeLesson.id) {
      const remaining = pool.filter(l => l.id !== activeLesson.id);
      nextLesson = remaining[Math.floor(Math.random() * remaining.length)];
    }

    setActiveLesson(nextLesson);
  }, [activeLesson, filteredLessons]);

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
      <div className="bg-white shadow-sm px-6 py-4 grid grid-cols-1 md:grid-cols-3 items-center gap-4 z-10">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 justify-self-start">
          <Logo className="w-10 h-10 shadow-sm" />
          <span className="text-xl font-bold text-gray-800 tracking-tight">LessonTyping</span>
        </div>

        {/* Grade List */}
        <div className="flex justify-center justify-self-center w-full">
          <div className="relative">
            <select
              value={currentGrade || ''}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="appearance-none px-8 py-2 pr-10 rounded-full bg-white text-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#90caf9] shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 min-w-[140px]"
            >
              {grades.map((grade) => (
                <option key={grade} value={grade}>
                  {grade}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#90caf9]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
        </div>

        {/* Language Switcher */}
        <div className="flex justify-end justify-self-end">
          <button
            onClick={toggleLanguage}
            className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-blue-50 text-gray-600 transition-colors font-medium"
            title={t('language')}
          >
            <Globe size={20} />
            <span className="uppercase font-medium">{i18n.language === 'zh' ? 'English' : '中文'}</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center pt-[25vh] p-4">
        <div className="text-gray-400 text-[3rem] leading-none mb-24 tracking-wide text-center">
          {t('hero_subtitle')}
        </div>

        {isLoading ? (
          <div className="text-xl text-gray-500 animate-pulse">{t('loading')}</div>
        ) : (
          <button
            onClick={handleStart}
            disabled={!currentGrade && grades.length === 0}
            className="group relative px-10 py-3 bg-[#90caf9] text-white text-xl font-medium rounded-[10px] shadow-sm hover:bg-[#64b5f6] hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('start')}
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
