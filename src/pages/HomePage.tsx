import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLessonStore, getLessonLanguage } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import { Logo } from '../components/Logo';
import { UserMenu } from '../components/auth/UserMenu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BookOpen, ChartLine, Keyboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Lesson } from '../types';


export function HomePage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { lessons, collections, isLoading, error, loadLessonsByLang, preloadEnglish } = useLessonStore();

  const COLLECTION_STORAGE_KEY = 'lesson-typing-collection';
  const PRACTICE_STATE = 'practice';
  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => localStorage.getItem(COLLECTION_STORAGE_KEY));
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    loadLessonsByLang(i18n.language);
  }, [loadLessonsByLang, i18n.language]);

  useEffect(() => {
    const lang = getLessonLanguage(i18n.language);
    if (lang && lang !== 'english') {
      preloadEnglish();
    }
  }, [i18n.language, preloadEnglish]);

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

  const filteredLessons = useMemo(() => {
    const targetLessonLang = getLessonLanguage(i18n.language);
    if (!targetLessonLang) return [];
    return lessons.filter((lesson) => lesson.language === targetLessonLang);
  }, [lessons, i18n.language]);

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
    const sameCollectionLessons = filteredLessons.filter(l => l.collectionId === activeLesson.collectionId);
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
      <div className="sticky top-0 bg-header text-header-foreground shadow-sm px-4 py-3 md:px-6 md:py-4 z-10" data-nosnippet>
        {/* Row 1: Logo + UserMenu (mobile) / Full row (desktop) */}
        <div className="flex items-center justify-between md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 md:gap-3 md:w-1/3 shrink-0">
            <Logo className="w-8 h-8 md:w-10 md:h-10 shadow-sm" />
            <span className="text-lg md:text-xl font-bold tracking-tight">Lesson Typing</span>
          </div>

          {/* Collection List - hidden on mobile row 1, shown on desktop */}
          <div className="hidden md:flex justify-center w-1/3">
            <Select
              value={currentCollectionId || ""}
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

          {/* Desktop: Language Switcher & Auth */}
          <div className="hidden md:flex justify-end items-center gap-4 w-1/3">
            <Select
              value={i18n.language.split('-')[0]}
              onValueChange={(value) => navigate(`/${value}/`)}
            >
              <SelectTrigger className="h-10 min-w-[150px] rounded-full border-gray-100 bg-white px-4 text-sm font-medium text-gray-600 shadow-sm transition-shadow hover:shadow-md focus-visible:ring-primary/50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-gray-100 bg-white" position="popper" side="bottom">
                <SelectItem value="en">English</SelectItem>
                <SelectItem value="zh">中文</SelectItem>
                <SelectItem value="es">Español</SelectItem>
                <SelectItem value="ja">日本語</SelectItem>
                <SelectItem value="ko">한국어</SelectItem>
                <SelectItem value="pt">Português</SelectItem>
                <SelectItem value="fr">Français</SelectItem>
                <SelectItem value="de">Deutsch</SelectItem>
                <SelectItem value="it">Italiano</SelectItem>
              </SelectContent>
            </Select>
            <UserMenu />
          </div>

          {/* Mobile: UserMenu only in row 1 */}
          <div className="flex md:hidden items-center">
            <UserMenu />
          </div>
        </div>

        {/* Row 2: Mobile only - Collection + Language selectors */}
        <div className="flex md:hidden items-center gap-2 mt-2">
          <Select
            value={currentCollectionId || ""}
            onValueChange={setSelectedCollection}
            disabled={collections.length === 0}
          >
            <SelectTrigger className="h-9 flex-1 rounded-full border-gray-100 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm">
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
          <Select
            value={i18n.language.split('-')[0]}
            onValueChange={(value) => navigate(`/${value}/`)}
          >
            <SelectTrigger className="h-9 w-24 shrink-0 rounded-full border-gray-100 bg-white px-3 text-sm font-medium text-gray-600 shadow-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="border-gray-100 bg-white" position="popper" side="bottom">
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="zh">中文</SelectItem>
              <SelectItem value="es">Español</SelectItem>
              <SelectItem value="ja">日本語</SelectItem>
              <SelectItem value="ko">한국어</SelectItem>
              <SelectItem value="pt">Português</SelectItem>
              <SelectItem value="fr">Français</SelectItem>
              <SelectItem value="de">Deutsch</SelectItem>
              <SelectItem value="it">Italiano</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Main Content */}
      <main className="min-h-screen flex flex-col items-center pt-[15vh] md:pt-[25vh] p-4">
        <div className="text-gray-400 text-2xl md:text-[3rem] leading-tight md:leading-none mb-12 md:mb-24 tracking-wide text-center">
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

      {/* Features section for SEO and user value */}
      <section className="pb-12 px-4">
        <h1 className="sr-only">{t('seo.h1')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h2 className="font-semibold text-gray-700">{t('seo.feature_curriculum')}</h2>
            <p className="text-sm text-gray-500">{t('seo.feature_curriculum_desc')}</p>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <ChartLine className="w-8 h-8 text-primary" />
            <h2 className="font-semibold text-gray-700">{t('seo.feature_tracking')}</h2>
            <p className="text-sm text-gray-500">{t('seo.feature_tracking_desc')}</p>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <Keyboard className="w-8 h-8 text-primary" />
            <h2 className="font-semibold text-gray-700">{t('seo.feature_languages')}</h2>
            <p className="text-sm text-gray-500">{t('seo.feature_languages_desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
