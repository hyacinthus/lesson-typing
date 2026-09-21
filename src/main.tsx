import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { ThemeProvider } from 'next-themes'
import './index.css'
import './i18n'
import App from './App.tsx'
import { useAuthStore } from './stores/authStore'
import { useLessonStore } from './stores/lessonStore'
import { isSupportedLang } from './lib/languages'

// Non-English translations load on demand and suspend the tree until they
// arrive, so the session check and the lesson list are kicked off here, in
// parallel with the locale chunk, rather than from effects that would only
// run once the tree renders.
useAuthStore.getState().initialize();
const initialLang = window.location.pathname.split('/')[1];
if (isSupportedLang(initialLang)) {
  useLessonStore.getState().loadLessonsByLang(initialLang);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </ThemeProvider>
  </StrictMode>,
)
