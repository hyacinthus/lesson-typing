import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { useTranslation } from 'react-i18next';
import { useLessonStore } from '../stores/lessonStore';
import { LessonPractice } from '../components/lesson/LessonPractice';
import { findLessonById } from '../utils/lessonLoader';
import { pickRandomLesson } from '../utils/pickLesson';
import { Button } from '@/components/ui/button';
import type { Lesson } from '../types';

interface LessonPageProps {
  id: string;
}

/** Practice page for one lesson. Mounted with key={id}, so state is per lesson. */
export function LessonPage({ id }: LessonPageProps) {
  const { t } = useTranslation();
  const { lang } = useParams<{ lang: string }>();
  const navigate = useNavigate();
  const lessons = useLessonStore((state) => state.lessons);
  const [result, setResult] = useState<{ lesson: Lesson | null; failed: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    findLessonById(id)
      .then((lesson) => { if (!cancelled) setResult({ lesson, failed: false }); })
      .catch(() => { if (!cancelled) setResult({ lesson: null, failed: true }); });
    return () => { cancelled = true; };
  }, [id]);

  const lesson = result?.lesson ?? null;

  useEffect(() => {
    if (!lesson) return;
    const previous = document.title;
    document.title = `${lesson.title} - Lesson Typing`;
    return () => { document.title = previous; };
  }, [lesson]);

  // Decide the next lesson up front and warm its content while the user
  // types, so "next" switches without a loading screen.
  const nextLesson = useMemo(
    () => lesson && pickRandomLesson(lessons, { language: lesson.language, collectionId: lesson.collectionId, excludeId: lesson.id }),
    [lessons, lesson]
  );
  useEffect(() => {
    if (!nextLesson) return;
    const warm = () => { findLessonById(nextLesson.id).catch(() => { /* retried on navigation */ }); };
    if (typeof requestIdleCallback !== 'undefined') {
      const handle = requestIdleCallback(warm);
      return () => cancelIdleCallback(handle);
    }
    const timer = setTimeout(warm, 2000);
    return () => clearTimeout(timer);
  }, [nextLesson]);

  const goHome = useCallback(() => navigate(`/${lang}/`), [navigate, lang]);

  const handleNext = useCallback(() => {
    if (nextLesson) navigate(`/${lang}/lesson/${nextLesson.id}`);
  }, [nextLesson, navigate, lang]);

  if (!result) {
    return (
      <div className="flex items-center justify-center min-h-screen text-xl text-muted-foreground animate-pulse">
        {t('loading')}
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <p className="text-destructive">{result.failed ? t('error') : t('lesson_not_found')}</p>
        <Button onClick={goHome}>{t('back_home')}</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <LessonPractice lesson={lesson} onBack={goHome} onNext={handleNext} />
    </div>
  );
}
