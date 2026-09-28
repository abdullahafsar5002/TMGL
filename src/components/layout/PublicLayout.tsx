import React from 'react';
import { Header } from './Header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-tmgl-charcoal-50 text-tmgl-charcoal-950">
      <Header />
      <main className="flex-1 py-6 sm:py-8">{children}</main>
      <footer className="border-t border-tmgl-charcoal-800 bg-tmgl-charcoal-950 py-5 text-center text-xs text-tmgl-charcoal-400">© {new Date().getFullYear()} Toruk Maktu Golf League (TMGL)</footer>
    </div>
  );
}
