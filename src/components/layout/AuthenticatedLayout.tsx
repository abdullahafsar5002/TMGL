import React from 'react';
import { AuthenticatedHeader } from './AuthenticatedHeader';
import { AuthenticatedBottomNav } from './AuthenticatedBottomNav';
import { OfflineIndicator } from '@/components/common/OfflineIndicator';

interface AuthenticatedLayoutProps {
  children: React.ReactNode;
}

export function AuthenticatedLayout({ children }: AuthenticatedLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-tmgl-charcoal-50 text-tmgl-charcoal-900 pb-20 md:pb-0">
      <AuthenticatedHeader />
      <main className="flex-1 py-6 sm:py-8">
        {children}
      </main>
      <AuthenticatedBottomNav />
      <OfflineIndicator />
    </div>
  );
}
