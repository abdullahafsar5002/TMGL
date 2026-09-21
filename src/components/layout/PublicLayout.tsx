import React from 'react';
import { Header } from './Header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-tmgl-charcoal-50 text-tmgl-charcoal-900">
      <Header />
      <main className="flex-1 py-6 sm:py-8">
        {children}
      </main>
      <footer className="border-t border-tmgl-charcoal-200 bg-white py-4 text-center text-xs text-tmgl-charcoal-400">
        © {new Date().getFullYear()} Toruk Maktu Golf League (TMGL)
      </footer>
    </div>
  );
}
