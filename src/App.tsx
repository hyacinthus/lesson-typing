import { Suspense, useEffect, useLayoutEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams, Outlet } from 'react-router';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/sonner';
import { LoginOverlay } from '@/components/ui/login-overlay';
import { LoginDialog } from './components/auth/LoginDialog';
import { HomePage } from './pages/HomePage';
import { LessonPage } from './pages/LessonPage';
import { lazyNamed } from './lib/lazy';
import { useAuthStore } from './stores/authStore';
import { useLessonStore } from './stores/lessonStore';
import { LANG_STORAGE_KEY, getLessonLanguage, isSupportedLang, pagePath } from './lib/languages';
import { safeStorage } from './lib/storage';

// Few visits open the download page
const { Component: DownloadPage } = lazyNamed(() => import('./pages/DownloadPage'), 'DownloadPage');

/** Sends a path without a language, such as / or /download, to the reader's language. */
function RootRedirect() {
  let lang = safeStorage.get(LANG_STORAGE_KEY);
  if (!isSupportedLang(lang)) {
    const browserLang = navigator.language?.split('-')[0];
    lang = isSupportedLang(browserLang) ? browserLang : 'en';
  }
  const { pathname, search, hash } = window.location;
  return <Navigate to={`/${lang}${pathname}${search}${hash}`} replace />;
}

function LangLayout() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const loadLessonsByLang = useLessonStore((s) => s.loadLessonsByLang);
  const preloadEnglish = useLessonStore((s) => s.preloadEnglish);
  const isValid = isSupportedLang(lang);
  const page = pagePath(useLocation().pathname);

  // BrowserRouter keeps the scroll position: a new page opens at its top,
  // while switching language keeps the page and the place on it
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [page]);

  // Sync i18n language with URL param
  useEffect(() => {
    if (isValid && i18n.language.split('-')[0] !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n, isValid]);

  // Persist language choice
  useEffect(() => {
    if (isValid) safeStorage.set(LANG_STORAGE_KEY, lang);
  }, [lang, isValid]);

  // Lesson summaries for this language are needed by every page (home list,
  // "next lesson" picker). Requests are deduplicated with the early kick-off
  // in main.tsx.
  useEffect(() => {
    if (!isValid) return;
    loadLessonsByLang(lang);
    if (getLessonLanguage(lang) !== 'english') {
      preloadEnglish();
    }
  }, [lang, isValid, loadLessonsByLang, preloadEnglish]);

  // The first segment is not a language but a page, such as /download
  if (!isValid) {
    return <RootRedirect />;
  }

  // For the lazily loaded pages
  return (
    <Suspense fallback={null}>
      <Outlet />
    </Suspense>
  );
}

/** Sends an unknown page to its language's home page. */
function HomeRedirect() {
  const { lang } = useParams<{ lang: string }>();
  return <Navigate to={`/${lang}/`} replace />;
}

/** Keyed by lesson id so LessonPage state resets when navigating between lessons. */
function LessonRoute() {
  const { id = '' } = useParams<{ id: string }>();
  return <LessonPage key={id} id={id} />;
}

function App() {
  const isLoggingIn = useAuthStore((s) => s.isLoggingIn);

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<RootRedirect />} />
        <Route path=":lang" element={<LangLayout />}>
          <Route index element={<HomePage />} />
          <Route path="lesson/:id" element={<LessonRoute />} />
          <Route path="download" element={<DownloadPage />} />
          <Route path="*" element={<HomeRedirect />} />
        </Route>
      </Routes>
      <LoginDialog />
      <LoginOverlay isVisible={isLoggingIn} />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
