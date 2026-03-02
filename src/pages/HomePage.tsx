import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLessonStore } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/auth/UserMenu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

  const COLLECTION_STORAGE_KEY = 'lesson-typing-collection';
  const PRACTICE_STATE = 'practice';
  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => localStorage.getItem(COLLECTION_STORAGE_KEY));
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

  // Extract unique collections from filtered lessons
  const collections = useMemo(() => {
    const uniqueMap = new Map();
    filteredLessons.forEach((l) => {
      if (!uniqueMap.has(l.collectionId)) {
        uniqueMap.set(l.collectionId, { id: l.collectionId, name: l.collectionTitle });
      }
    });
    // Sort by collectionId if possible (assuming format grade-N)
    return Array.from(uniqueMap.values()).sort((a, b) => {
      // Simple numeric sort if format is grade-N
      const numA = parseInt(a.id.replace('grade-', ''));
      const numB = parseInt(b.id.replace('grade-', ''));
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.id.localeCompare(b.id);
    });
  }, [filteredLessons]);

  const currentCollectionId = useMemo(() => {
    if (selectedCollection && collections.some(c => c.id === selectedCollection)) {
      return selectedCollection;
    }
    return collections.length > 0 ? collections[0].id : null;
  }, [collections, selectedCollection]);

  useEffect(() => {
    if (currentCollectionId) {
      localStorage.setItem(COLLECTION_STORAGE_KEY, currentCollectionId);
    }
  }, [currentCollectionId]);

  const handleStart = () => {
    if (isLoading || filteredLessons.length === 0) return;

    let pool = filteredLessons;
    if (currentCollectionId) {
      pool = filteredLessons.filter(l => l.collectionId === currentCollectionId);
    }

    if (pool.length === 0) return;

    const randomIndex = Math.floor(Math.random() * pool.length);
    setActiveLesson(pool[randomIndex]);
  };

  const handleNextLesson = useCallback(() => {
    if (!activeLesson || filteredLessons.length === 0) return;

    // Filter by same collection as current active lesson
    const sameCollectionLessons = filteredLessons.filter(l => l.collectionTitle === activeLesson.collectionTitle);
    const pool = sameCollectionLessons.length > 0 ? sameCollectionLessons : filteredLessons;

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

        {/* Collection List */}
        <div className="flex justify-center w-full md:w-1/3">
          <Select
            value={currentCollectionId ?? undefined}
            onValueChange={setSelectedCollection}
            disabled={collections.length === 0}
          >
            <SelectTrigger className="h-10 min-w-[160px] rounded-full border-gray-100 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-primary/50">
              <SelectValue placeholder={t('loading')} />
            </SelectTrigger>
            <SelectContent className="border-gray-100 bg-white" position="popper" side="bottom">
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Language Switcher & Auth */}
        <div className="flex justify-end items-center gap-4 w-full md:w-1/3">
          <Select
            value={i18n.language.split('-')[0]}
            onValueChange={(value) => i18n.changeLanguage(value)}
          >
            <SelectTrigger className="h-10 min-w-[150px] rounded-full border-gray-100 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-primary/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-100 bg-white" position="popper" side="bottom">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
            </SelectContent>
          </Select>
          <UserMenu />
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
            disabled={!currentCollectionId && collections.length === 0}
            className="group relative px-10 py-3 bg-primary text-primary-foreground text-xl font-medium rounded-[10px] shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('start')}
          </button>
        )}

      </main>
    </div>
  );
}
