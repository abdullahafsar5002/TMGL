import { useRef, useEffect, useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';
import { canManageLeague } from '@/lib/roleGuards';

const publicNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'Gallery', path: '/gallery' },
  { label: 'About', path: '/about' },
  { label: 'News', path: '/news' },
  { label: 'Contact', path: '/contact' },
];

const linkClass = 'flex min-h-[44px] w-full items-center rounded-md px-3 py-2 text-left text-sm font-medium text-tmgl-charcoal-600 transition-colors hover:bg-tmgl-charcoal-100 hover:text-tmgl-green-800';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, profile } = useAuth();
  const isManager = canManageLeague(profile?.role);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const closeMenu = useCallback((restoreFocus = false) => {
    setMobileMenuOpen(false);
    if (restoreFocus) menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu(true);
    };
    const handlePointerDown = (event: MouseEvent) => {
      if (headerRef.current && !headerRef.current.contains(event.target as Node)) closeMenu(false);
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [mobileMenuOpen, closeMenu]);

  const isActive = (path: string) =>
    path === '/' ? location.pathname === '/' : location.pathname.startsWith(path);

  return (
    <header
      ref={headerRef}
      className="sticky top-0 z-40 border-b border-tmgl-charcoal-200 bg-[var(--surface-public)]/90 backdrop-blur"
    >
      <Container size="lg">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link
            to="/"
            className="touch-target flex min-w-0 items-center gap-3 text-left"
            aria-label="Go to TMGL home"
          >
            <img src="/logo-mark.svg" alt="" className="h-10 w-10 shrink-0" />
            <span className="min-w-0">
              <span className="block truncate text-base font-bold uppercase tracking-[0.12em] text-tmgl-green-950 sm:text-lg">
                TMGL
              </span>
              <span className="hidden text-xs font-medium text-tmgl-charcoal-500 sm:inline">
                Toruk Maktu Golf League
              </span>
            </span>
          </Link>

          <nav
            aria-label="Primary navigation"
            className="hidden items-center gap-1 text-sm font-medium lg:flex"
          >
            {publicNavLinks.slice(0, 5).map((link) => (
              <Link
                key={link.label}
                to={link.path}
                aria-current={isActive(link.path) ? 'page' : undefined}
                className={`rounded-md px-3 py-2 transition-colors ${
                  isActive(link.path)
                    ? 'bg-tmgl-green-50 text-tmgl-green-800'
                    : 'text-tmgl-charcoal-600 hover:bg-tmgl-charcoal-100 hover:text-tmgl-green-800'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            {isManager && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/seasons')}>
                Seasons
              </Button>
            )}
            {isManager && (
              <Button variant="ghost" size="sm" onClick={() => navigate('/admin')}>
                Admin
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={() => navigate(isAuthenticated ? '/dashboard' : '/login')}
            >
              {isAuthenticated ? 'Dashboard' : 'Sign in'}
            </Button>
          </div>

          <div className="flex items-center sm:hidden">
            <button
              ref={menuButtonRef}
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="touch-target rounded-md p-2 text-tmgl-charcoal-600 hover:bg-tmgl-charcoal-100"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <nav
            id="mobile-navigation"
            aria-label="Mobile navigation"
            className="space-y-1 border-t border-tmgl-charcoal-200 py-4 sm:hidden"
          >
            {publicNavLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className={linkClass}
                aria-current={isActive(link.path) ? 'page' : undefined}
                onClick={() => closeMenu(false)}
              >
                {link.label}
              </Link>
            ))}
            {isManager && (
              <Link to="/seasons" className={linkClass} onClick={() => closeMenu(false)}>
                Seasons
              </Link>
            )}
            {isManager && (
              <Link to="/admin" className={linkClass} onClick={() => closeMenu(false)}>
                Admin
              </Link>
            )}
            <div className="border-t border-tmgl-charcoal-200 pt-3">
              <Button
                variant="primary"
                fullWidth
                onClick={() => {
                  closeMenu(false);
                  navigate(isAuthenticated ? '/dashboard' : '/login');
                }}
              >
                {isAuthenticated ? 'Open dashboard' : 'Sign in'}
              </Button>
            </div>
          </nav>
        )}
      </Container>
    </header>
  );
}
