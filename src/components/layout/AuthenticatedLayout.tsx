import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Header } from './Header';
import { AuthenticatedBottomNav } from './AuthenticatedBottomNav';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for authenticated pages (dashboard and future protected modules).
 * Shows the authenticated header with user context and the authenticated bottom nav.
 */
export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const { profile, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen flex flex-col bg-tmgl-charcoal-50 text-tmgl-charcoal-900 pb-20 md:pb-0">
      <Header
        isAuthenticated
        userRole={profile?.role}
        onSignOut={handleSignOut}
      />
      <main className="flex-1 py-6 sm:py-8">
        {children}
      </main>
      <AuthenticatedBottomNav currentPath={location.pathname} />
    </div>
  );
}
