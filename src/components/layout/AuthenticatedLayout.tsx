import React from 'react';
import { useLocation } from 'react-router-dom';
import { Header } from './Header';
import { AuthenticatedBottomNav } from './AuthenticatedBottomNav';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen flex flex-col bg-tmgl-charcoal-50 text-tmgl-charcoal-900 pb-20 md:pb-0">
      <Header />
      <main className="flex-1 py-6 sm:py-8">
        {children}
      </main>
      <AuthenticatedBottomNav currentPath={location.pathname} />
      <OfflineIndicator />
    </div>
  );
}
