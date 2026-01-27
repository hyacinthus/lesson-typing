import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import { useLessonStore } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import { Logo } from '../components/Logo';
import type { Lesson } from '../types';

// Map i18n language codes to lesson language IDs
const LANGUAGE_MAP: Record<string, string> = {
  'zh': 'chinese',
  'zh-CN': 'chinese',
  'zh-TW': 'chinese',
  'en': 'english',
  'en-US': 'english',
  'en-GB': 'english',
  'es': 'spanish',
  'es-ES': 'spanish',
  'es-MX': 'spanish',
  'ja': 'japanese',
  'ja-JP': 'japanese',
  'pt': 'portuguese',
  'pt-BR': 'portuguese',
  'pt-PT': 'portuguese',
  'fr': 'french',
  'fr-FR': 'french',
  'de': 'german',
  'de-DE': 'german',
  'it': 'italian',
  'it-IT': 'italian',
};

export function HomePage() {
  const { t, i18n } = useTranslation();
  const { lessons, isLoading, error, loadLessons } = useLessonStore();

  const GRADE_STORAGE_KEY = 'lesson-typing-grade';
  const PRACTICE_STATE = 'practice';
  const [selectedGrade, setSelectedGrade] = useState<string | null>(() => localStorage.getItem(GRADE_STORAGE_KEY));
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadLessons();
  }, [loadLessons]);

  useEffect(() => {
    const handlePopState = () => {
      if (activeLesson) {
        setActiveLesson(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activeLesson]);

  useEffect(() => {
    if (!activeLesson) return;
    if (window.history.state?.view === PRACTICE_STATE) return;
    window.history.pushState({ view: PRACTICE_STATE }, '', window.location.href);
  }, [activeLesson]);

  // Filter lessons based on current language
  const filteredLessons = useMemo(() => {
    const currentLang = i18n.language;
    // Try exact match first, then base language (e.g. 'zh-CN' -> 'zh')
    const targetLessonLang = LANGUAGE_MAP[currentLang] || LANGUAGE_MAP[currentLang.split('-')[0]];

    if (!targetLessonLang) {
      // If no mapping found, return empty or fallback to default?
      // For safety, return empty array to avoid showing wrong language content
      return [];
    }

    return lessons.filter((lesson) => lesson.language === targetLessonLang);
  }, [lessons, i18n.language]);

  // Extract unique grades from filtered lessons
  const grades = useMemo(() => {
    const uniqueMap = new Map();
    filteredLessons.forEach((l) => {
      if (!uniqueMap.has(l.gradeId)) {
        uniqueMap.set(l.gradeId, { id: l.gradeId, name: l.grade });
      }
    });
    // Sort by gradeId if possible (assuming format grade-N)
    return Array.from(uniqueMap.values()).sort((a, b) => {
      // Simple numeric sort if format is grade-N
      const numA = parseInt(a.id.replace('grade-', ''));
      const numB = parseInt(b.id.replace('grade-', ''));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.id.localeCompare(b.id);
    });
  }, [filteredLessons]);

  const currentGradeId = useMemo(() => {
    if (selectedGrade && grades.some(g => g.id === selectedGrade)) {
      return selectedGrade;
    }
    return grades.length > 0 ? grades[0].id : null;
  }, [grades, selectedGrade]);

  useEffect(() => {
    if (currentGradeId) {
      localStorage.setItem(GRADE_STORAGE_KEY, currentGradeId);
    }
  }, [currentGradeId]);

  const handleStart = () => {
    if (isLoading || filteredLessons.length === 0) return;

    let pool = filteredLessons;
    if (currentGradeId) {
      pool = filteredLessons.filter(l => l.gradeId === currentGradeId);
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
    if (window.history.state?.view === PRACTICE_STATE) {
      window.history.back();
      return;
    }
    setActiveLesson(null);
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
      <div className="bg-[#ebebeb] shadow-sm px-6 py-4 flex flex-col md:flex-row items-center justify-between gap-4 z-10">
        {/* Logo & Title */}
        <div className="flex items-center gap-3 w-full md:w-1/3 justify-start">
          <Logo className="w-10 h-10 shadow-sm" />
          <span className="text-xl font-bold text-gray-800 tracking-tight">LessonTyping</span>
        </div>

        {/* Grade List */}
        <div className="flex justify-center w-full md:w-1/3">
          <div className="relative">
            <select
              value={currentGradeId || ''}
              onChange={(e) => setSelectedGrade(e.target.value)}
              className="appearance-none px-8 py-2 pr-10 rounded-full bg-white text-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#90caf9] shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 min-w-[140px]"
            >
              {grades.map((grade) => (
                <option key={grade.id} value={grade.id}>
                  {grade.name}
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
        <div className="flex justify-end w-full md:w-1/3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none text-gray-400">
              <Globe size={18} />
            </div>
            <select
              value={i18n.language.split('-')[0]}
              onChange={(e) => i18n.changeLanguage(e.target.value)}
              className="appearance-none pl-10 pr-8 py-2 rounded-full bg-white text-gray-600 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#90caf9] shadow-sm hover:shadow-md transition-shadow cursor-pointer border border-gray-100 min-w-[120px]"
            >
              <option value="en">English</option>
              <option value="zh">中文</option>
              <option value="es">Español</option>
              <option value="ja">日本語</option>
              <option value="pt">Português</option>
              <option value="fr">Français</option>
              <option value="de">Deutsch</option>
              <option value="it">Italiano</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-[#90caf9]">
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
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
            disabled={!currentGradeId && grades.length === 0}
            className="group relative px-10 py-3 bg-[#90caf9] text-white text-xl font-medium rounded-[10px] shadow-sm hover:bg-[#64b5f6] hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('start')}
          </button>
        )}

        {!activeLesson && currentGradeId && (
          <p className="mt-6 text-gray-500 text-lg">
            {/* Optional: Show how many lessons in pool */}
          </p>
        )}
      </main>
    </div>
  );
}
