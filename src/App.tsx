import { useEffect } from 'react';
import { Toaster } from '@/components/ui/sonner';
import { HomePage } from './pages/HomePage';
import { useAuthStore } from './stores/authStore';

function App() {
  const { initialize } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  return (
    <>
      <HomePage />
      <Toaster />
    </>
  );
}

export default App;
