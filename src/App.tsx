import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { LoginOverlay } from '@/components/ui/login-overlay';
import { HomePage } from './pages/HomePage';
import { useAuthStore } from './stores/authStore';

function App() {
  const { initialize, isLoggingIn } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <HomePage />
      <LoginOverlay isVisible={isLoggingIn} />
      <Toaster />
    </>
  );
}

export default App;
