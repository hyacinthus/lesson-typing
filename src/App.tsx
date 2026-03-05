import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams, Outlet } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from '@/components/ui/sonner';
import { LoginOverlay } from '@/components/ui/login-overlay';
import { HomePage } from './pages/HomePage';
import { useAuthStore } from './stores/authStore';

const SUPPORTED_LANGS = ['en', 'zh', 'es', 'ja', 'pt', 'fr', 'de', 'it'];
const LANG_STORAGE_KEY = 'lesson-typing-language';

function RootRedirect() {
  let lang: string | null = null;
  try {
    lang = localStorage.getItem(LANG_STORAGE_KEY);
  } catch { /* ignore */ }
  if (!lang || !SUPPORTED_LANGS.includes(lang)) {
    const browserLang = navigator.language?.split('-')[0];
    lang = SUPPORTED_LANGS.includes(browserLang) ? browserLang : 'en';
  }
  return <Navigate to={`/${lang}/`} replace />;
}

function LangLayout() {
  const { lang } = useParams<{ lang: string }>();
  const { i18n } = useTranslation();
  const isValid = !!lang && SUPPORTED_LANGS.includes(lang);

  // Sync i18n language with URL param
  useEffect(() => {
    if (isValid && i18n.language.split('-')[0] !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n, isValid]);

  // Persist language choice
  useEffect(() => {
    if (!isValid) return;
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch { /* ignore */ }
  }, [lang, isValid]);

  if (!isValid) {
    return <Navigate to="/en/" replace />;
  }

  return <Outlet />;
}

function App() {
  const { initialize, isLoggingIn } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <BrowserRouter>
      <Routes>
        <Route index element={<RootRedirect />} />
        <Route path=":lang/*" element={<LangLayout />}>
          <Route index element={<HomePage />} />
        </Route>
      </Routes>
      <LoginOverlay isVisible={isLoggingIn} />
      <Toaster />
    </BrowserRouter>
  );
}

export default App;
