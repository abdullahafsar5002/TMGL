import { BrowserRouter, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { ToastProvider } from '@/context/ToastContext';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';
import { AppRouter } from '@/router/AppRouter';

function AuthHashRedirect({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  useEffect(() => {
    const hash = window.location.hash;
    if (hash && (hash.includes('access_token') || hash.includes('type=recovery'))) {
      window.history.replaceState(null, '', '/reset-password' + hash);
      navigate('/reset-password' + hash, { replace: true });
      return;
    }
  }, [navigate]);
  return <>{children}</>;
}

export function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <AuthHashRedirect>
          <AuthProvider>
            <ToastProvider>
              <AppRouter />
            </ToastProvider>
          </AuthProvider>
        </AuthHashRedirect>
      </BrowserRouter>
    </ErrorBoundary>
  );
}
