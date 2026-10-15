import { useEffect, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { useLessonStore } from '../stores/lessonStore';
import { getLessonLanguage, getSiteTitle } from '@/lib/languages';
import { safeStorage } from '@/lib/storage';
import { pickRandomLesson } from '../utils/pickLesson';
import { shouldMaintainTypingFocus } from '../hooks/useCompositionInput';
import { TypingDemo } from '../components/TypingDemo';
import { SiteHeader } from '../components/SiteHeader';
import { FeatureGrid } from '../components/FeatureGrid';
import { useDocumentTitle } from '../hooks/useDocumentTitle';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, ctaClass, pillClass } from '@/lib/utils';
import { BookOpen, ChartLine, Keyboard, MonitorDown } from 'lucide-react';

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

  // After the language changed in the page, or another page named the tab
  useDocumentTitle(getSiteTitle(lang));

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

  const collectionSelect = (triggerClassName: string) => (
    <Select
      key={lang}
      value={currentCollectionId || ""}
      onValueChange={setSelectedCollection}
      disabled={collections.length === 0}
    >
      <SelectTrigger className={cn(pillClass, triggerClassName)}>
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
  );

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SiteHeader
        center={collectionSelect('h-10 min-w-[160px] px-4 focus-visible:ring-primary/50')}
        mobileRow={collectionSelect('h-9 flex-1 px-3')}
      />

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
              className={cn(ctaClass, 'group relative px-10 py-3 disabled:opacity-50 disabled:cursor-not-allowed')}
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
        <FeatureGrid
          features={[
            { icon: BookOpen, title: t('seo.feature_curriculum'), description: t('seo.feature_curriculum_desc') },
            { icon: ChartLine, title: t('seo.feature_tracking'), description: t('seo.feature_tracking_desc') },
            { icon: Keyboard, title: t('seo.feature_languages'), description: t('seo.feature_languages_desc') },
          ]}
        />
        <Link
          to={`/${lang}/download`}
          className="mt-6 flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors"
        >
          <MonitorDown className="size-4" />
          {t('download.home_link')}
        </Link>
      </section>
    </div>
  );
}
