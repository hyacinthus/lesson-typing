import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './pages/HomePage';
import { useAuthStore } from './stores/authStore';

function App() {
  const initializeAuth = useAuthStore((state) => state.initialize);
  const cleanupAuth = useAuthStore((state) => state.cleanup);

  useEffect(() => {
    void initializeAuth().catch((error) => {
      console.error('Failed to initialize auth:', error);
    });

    return () => {
      cleanupAuth();
    };
  }, [cleanupAuth, initializeAuth]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
