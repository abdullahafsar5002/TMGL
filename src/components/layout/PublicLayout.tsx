import React from 'react';
import { Link } from 'react-router-dom';
import { Header } from './Header';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const footerLinks = [
  { label: 'Tournaments', to: '/tournaments' },
  { label: 'Leaderboard', to: '/leaderboard' },
  { label: 'Gallery', to: '/gallery' },
  { label: 'About', to: '/about' },
  { label: 'News', to: '/news' },
  { label: 'Contact', to: '/contact' },
];

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--surface-public)] text-tmgl-charcoal-900">
      <Header />
      <main className="flex-1">{children}</main>

      <footer className="border-t border-tmgl-charcoal-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12">
          <div className="flex flex-col gap-8 sm:flex-row sm:justify-between">
            <div className="max-w-xs">
              <div className="flex items-center gap-3">
                <img src="/logo-mark.svg" alt="" className="h-9 w-9" />
                <span className="text-sm font-bold uppercase tracking-[0.12em] text-tmgl-green-950">
                  TMGL
                </span>
              </div>
              <p className="mt-3 text-sm leading-relaxed text-tmgl-charcoal-500">
                Toruk Maktu Golf League — scoring, handicaps and tournament operations for
                competitive amateur golf.
              </p>
            </div>

            <nav aria-label="Footer navigation" className="flex flex-wrap gap-x-6 gap-y-2">
              {footerLinks.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  className="text-sm text-tmgl-charcoal-500 transition-colors hover:text-tmgl-green-800"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>

          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-tmgl-charcoal-100 pt-6 sm:flex-row sm:items-center">
            <p className="text-xs text-tmgl-charcoal-400">
              © {new Date().getFullYear()} Toruk Maktu Golf League. All rights reserved.
            </p>
            <a
              href="https://github.com/abdullahafsar5002/TMGL"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-tmgl-charcoal-400 transition-colors hover:text-tmgl-green-800"
            >
              GitHub
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
