import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Header } from './Header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

/**
 * Layout for public pages (home, 404, etc.)
 * Shows the public header; adapts for authenticated users.
 */
export function PublicLayout({ children }: PublicLayoutProps) {
  const navigate = useNavigate();
  const { isAuthenticated, profile, signOut } = useAuth();

  return (
    <div className="min-h-screen flex flex-col bg-tmgl-charcoal-50 text-tmgl-charcoal-900">
      <Header
        onLoginClick={() => navigate('/login')}
        onSignOut={async () => { await signOut(); navigate('/'); }}
        isAuthenticated={isAuthenticated}
        userRole={profile?.role}
      />
      <main className="flex-1 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-tmgl-charcoal-200 bg-white py-4 text-center text-xs text-tmgl-charcoal-400">
        © {new Date().getFullYear()} Toruk Maktu Golf League (TMGL)
      </footer>
    </div>
  );
}
