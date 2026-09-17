import React from 'react';
import { Header } from './Header';
import { BottomNav } from './BottomNav';

export interface LayoutProps {
  children: React.ReactNode;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onLoginClick?: () => void;
  isAuthenticated?: boolean;
  userRole?: 'super_admin' | 'league_manager' | 'player' | 'public';
}

export function Layout({
  children,
  activeTab = 'home',
  onTabChange = () => {},
  onLoginClick,
  isAuthenticated,
  userRole
}: LayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-tmgl-charcoal-50 text-tmgl-charcoal-900 pb-20 md:pb-8">
      <Header
        onLoginClick={onLoginClick}
        isAuthenticated={isAuthenticated}
        userRole={userRole}
      />
      
      <main className="flex-1 py-6 sm:py-8">
        {children}
      </main>

      <footer className="hidden md:block border-t border-tmgl-charcoal-200 bg-white py-6 mt-12 text-center text-xs text-tmgl-charcoal-500">
        <p>© {new Date().getFullYear()} Toruk Maktu Golf League (TMGL). All rights reserved.</p>
        <p className="mt-1 text-tmgl-charcoal-400">Production-ready mobile-first golf league system.</p>
      </footer>

      <BottomNav activeTab={activeTab} onTabChange={onTabChange} />
    </div>
  );
}
