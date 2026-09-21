import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useParams } from 'react-router';
import { useLessonStore } from '../stores/lessonStore';
import { getLessonLanguage } from '@/lib/languages';
import { safeStorage } from '@/lib/storage';
import { pickRandomLesson } from '../utils/pickLesson';
import { shouldMaintainTypingFocus } from '../hooks/useCompositionInput';
import { Logo } from '../components/Logo';
import { TypingDemo } from '../components/TypingDemo';
import { ThemeToggle } from '../components/ThemeToggle';
import { LanguageSelect } from '../components/LanguageSelect';
import { UserMenu } from '../components/auth/UserMenu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, pillClass } from '@/lib/utils';
import { BookOpen, ChartLine, Keyboard } from 'lucide-react';

const COLLECTION_STORAGE_KEY = 'lesson-typing-collection';

export function HomePage() {
  const { t } = useTranslation();
  const { lang = 'en' } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const { lessons, collections, isLoading, error } = useLessonStore();

  const [selectedCollection, setSelectedCollection] = useState<string | null>(() => safeStorage.get(COLLECTION_STORAGE_KEY));

  const currentCollectionId = useMemo(() => {
    if (selectedCollection && collections.some(c => c.id === selectedCollection)) {
      return selectedCollection;
    }
    return collections.length > 0 ? collections[0].id : null;
  }, [collections, selectedCollection]);

  useEffect(() => {
    if (currentCollectionId) safeStorage.set(COLLECTION_STORAGE_KEY, currentCollectionId);
  }, [currentCollectionId]);

  const handleStart = useCallback(() => {
    if (isLoading) return;
    const language = getLessonLanguage(lang);
    const lesson = language && pickRandomLesson(lessons, { language, collectionId: currentCollectionId });
    if (lesson) navigate(`/${lang}/lesson/${lesson.id}`);
  }, [isLoading, lessons, currentCollectionId, navigate, lang]);

  // Enter key to start practice on home page
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Enter') return;
      // Don't hijack Enter from form fields, dialogs, or open select/menu
      // popovers (Enter there picks the highlighted option)
      if (!shouldMaintainTypingFocus(e.target)) return;
      if ((e.target as HTMLElement | null)?.closest('[role="listbox"], [role="combobox"]')) return;
      e.preventDefault();
      handleStart();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleStart]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen text-destructive">
        {t('error')}: {error}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header / Top Bar */}
      <div className="sticky top-0 bg-header text-header-foreground shadow-sm px-4 py-3 md:px-6 md:py-4 z-10" data-nosnippet>
        {/* Row 1: Logo + UserMenu (mobile) / Full row (desktop) */}
        <div className="flex items-center justify-between md:justify-between gap-3">
          {/* Logo & Title */}
          <div className="flex items-center gap-2 md:gap-3 md:w-1/3 shrink-0">
            <Logo className="w-8 h-8 md:w-10 md:h-10" />
            <span className="text-lg md:text-xl font-bold tracking-tight">Lesson Typing</span>
          </div>

          {/* Collection List - hidden on mobile row 1, shown on desktop */}
          <div className="hidden md:flex justify-center w-1/3">
            <Select
              key={`collection-desktop-${lang}`}
              value={currentCollectionId || ""}
              onValueChange={setSelectedCollection}
              disabled={collections.length === 0}
            >
              <SelectTrigger className={cn(pillClass, 'h-10 min-w-[160px] px-4 focus-visible:ring-primary/50')}>
                <SelectValue placeholder={t('loading')} />
              </SelectTrigger>
              <SelectContent position="popper" side="bottom">
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
            <LanguageSelect className="h-10 min-w-[150px] px-4 focus-visible:ring-primary/50" />
            <ThemeToggle />
            <UserMenu />
          </div>

          {/* Mobile: UserMenu only in row 1 */}
          <div className="flex md:hidden items-center gap-2">
            <ThemeToggle className="size-9" />
            <UserMenu />
          </div>
        </div>

        {/* Row 2: Mobile only - Collection + Language selectors */}
        <div className="flex md:hidden items-center gap-2 mt-2">
          <Select
            key={`collection-mobile-${lang}`}
            value={currentCollectionId || ""}
            onValueChange={setSelectedCollection}
            disabled={collections.length === 0}
          >
            <SelectTrigger className={cn(pillClass, 'h-9 flex-1 px-3')}>
              <SelectValue placeholder={t('loading')} />
            </SelectTrigger>
            <SelectContent position="popper" side="bottom">
              {collections.map((collection) => (
                <SelectItem key={collection.id} value={collection.id}>
                  {collection.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <LanguageSelect className="h-9 w-24 shrink-0 px-3" />
        </div>
      </div>

      {/* Main Content */}
      <main className="min-h-screen flex flex-col items-center pt-[12vh] md:pt-[20vh] p-4">
        <div className="text-foreground text-2xl md:text-[3rem] leading-tight md:leading-none mb-8 md:mb-12 tracking-wide text-center font-medium">
          {t('hero_subtitle')}
        </div>

        <div className="mb-10 md:mb-16">
          <TypingDemo key={lang} />
        </div>

        {isLoading ? (
          <div className="text-xl text-muted-foreground animate-pulse">{t('loading')}</div>
        ) : (
          <div className="flex flex-col items-center gap-4">
            <button
              onClick={handleStart}
              disabled={!currentCollectionId && collections.length === 0}
              className="group relative px-10 py-3 bg-primary text-primary-foreground text-xl font-medium rounded-[10px] shadow-sm hover:bg-primary/90 hover:shadow-md transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('start')}
            </button>
            <p className="hidden md:block text-sm text-muted-foreground">
              {t('hint_enter_before')}{' '}
              <kbd className="rounded-md border border-border bg-card px-1.5 py-0.5 font-sans text-xs shadow-sm">
                Enter ↵
              </kbd>{' '}
              {t('hint_enter_after')}
            </p>
          </div>
        )}

      </main>

      {/* Features section for SEO and user value */}
      <section className="pb-12 px-4">
        <h1 className="sr-only">{t('seo.h1')}</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <BookOpen className="w-8 h-8 text-primary" />
            <h2 className="font-semibold text-foreground">{t('seo.feature_curriculum')}</h2>
            <p className="text-sm text-muted-foreground">{t('seo.feature_curriculum_desc')}</p>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <ChartLine className="w-8 h-8 text-primary" />
            <h2 className="font-semibold text-foreground">{t('seo.feature_tracking')}</h2>
            <p className="text-sm text-muted-foreground">{t('seo.feature_tracking_desc')}</p>
          </div>
          <div className="flex flex-col items-center text-center gap-2 p-4">
            <Keyboard className="w-8 h-8 text-primary" />
            <h2 className="font-semibold text-foreground">{t('seo.feature_languages')}</h2>
            <p className="text-sm text-muted-foreground">{t('seo.feature_languages_desc')}</p>
          </div>
        </div>
      </section>
    </div>
  );
}
