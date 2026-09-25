import { useRef, useEffect, useCallback, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Trophy, Menu, X } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { cn } from '@/lib/utils';

const publicNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'About', path: '/about' },
  { label: 'News', path: '/news' },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'text-sm font-medium py-2 border-b-2 transition-colors',
    isActive
      ? 'text-tmgl-gold border-tmgl-gold'
      : 'text-tmgl-charcoal-200 hover:text-tmgl-gold border-transparent'
  );

const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'block w-full text-left px-3 py-3 rounded-md text-sm font-medium transition-colors',
    isActive
      ? 'bg-tmgl-green-800 text-tmgl-gold'
      : 'text-tmgl-charcoal-100 hover:bg-tmgl-green-800'
  );

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) {
      requestAnimationFrame(() => menuButtonRef.current?.focus());
    }
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true);
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current && !menuRef.current.contains(target) &&
        menuButtonRef.current && !menuButtonRef.current.contains(target)
      ) {
        closeMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, closeMenu]);

  return (
    <header className="sticky top-0 z-40 bg-tmgl-green-900 border-b border-tmgl-green-700/50 text-white shadow-md">
      <Container size="lg">
        <div className="flex items-center justify-between h-16 gap-3">
          <Link
            to="/"
            className="flex items-center gap-3 touch-target shrink-0"
            aria-label="Go to home"
          >
            <div className="w-10 h-10 rounded-lg bg-tmgl-green-800 border border-tmgl-gold/60 flex items-center justify-center shadow-inner">
              <Trophy className="w-5 h-5 text-tmgl-gold" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold tracking-wider text-base sm:text-lg uppercase text-white">
                TMGL
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-tmgl-green-700/60 text-tmgl-gold border border-tmgl-gold/30">
                Toruk Maktu Golf League
              </span>
            </div>
          </Link>

          <nav aria-label="Main" className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {publicNavLinks.map((link) => (
              <NavLink
                key={link.path}
                to={link.path}
                end={link.path === '/'}
                className={navLinkClass}
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-3 py-1.5 min-h-[38px] rounded-lg bg-tmgl-gold text-tmgl-charcoal-950 text-xs font-semibold shadow-sm hover:bg-tmgl-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tmgl-gold touch-target"
            >
              Sign in
            </Link>
          </div>

          <div className="md:hidden flex items-center" ref={menuRef}>
            <button
              ref={menuButtonRef}
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="p-2 rounded-lg text-tmgl-charcoal-200 hover:text-white hover:bg-tmgl-green-800 touch-target focus:outline-none focus:ring-2 focus:ring-tmgl-gold"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="public-mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div id="public-mobile-menu" className="md:hidden py-4 border-t border-tmgl-green-800/80">
            <nav aria-label="Mobile" className="space-y-1">
              {publicNavLinks.map((link) => (
                <NavLink
                  key={link.path}
                  to={link.path}
                  end={link.path === '/'}
                  onClick={() => closeMenu(false)}
                  className={mobileNavLinkClass}
                >
                  {link.label}
                </NavLink>
              ))}
            </nav>
            <div className="pt-3 mt-3 border-t border-tmgl-green-800 sm:hidden">
              <Link
                to="/login"
                onClick={() => closeMenu(false)}
                className="flex w-full items-center justify-center px-4 py-3 min-h-[44px] rounded-lg bg-tmgl-gold text-tmgl-charcoal-950 text-sm font-semibold shadow-sm hover:bg-tmgl-gold-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-tmgl-gold"
              >
                Sign in
              </Link>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
