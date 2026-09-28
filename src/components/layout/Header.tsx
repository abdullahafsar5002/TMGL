import { useRef, useEffect, useCallback, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, Trophy, X } from 'lucide-react';
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

const linkClass = 'block min-h-[44px] w-full rounded-md px-3 py-2 text-left text-sm font-medium text-tmgl-charcoal-100 transition-colors hover:bg-tmgl-charcoal-900 hover:text-tmgl-gold-300';
const desktopLinkClass = 'rounded-md px-2 py-2 text-tmgl-charcoal-200 transition-colors hover:bg-tmgl-charcoal-900 hover:text-tmgl-gold-300';

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

  return (
    <header ref={headerRef} className="sticky top-0 z-40 border-b border-tmgl-gold-500/30 bg-tmgl-charcoal-950 text-white shadow-lg">
      <Container size="lg">
        <div className="flex h-16 items-center justify-between">
          <Link to="/" className="touch-target flex min-w-0 items-center gap-3 text-left" aria-label="Go to TMGL home">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-tmgl-gold-500/70 bg-tmgl-charcoal-900 shadow-inner"><Trophy className="h-5 w-5 text-tmgl-gold-400" /></span>
            <span className="min-w-0"><span className="block truncate text-base font-extrabold uppercase tracking-wider text-white sm:text-lg">TMGL</span><span className="hidden text-xs font-semibold text-tmgl-gold-300 sm:inline">Toruk Maktu Golf League</span></span>
          </Link>

          <nav aria-label="Primary navigation" className="hidden items-center gap-5 text-sm font-medium lg:flex">
            {publicNavLinks.slice(0, 5).map((link) => <Link key={link.label} to={link.path} className={desktopLinkClass}>{link.label}</Link>)}
          </nav>

          <div className="hidden items-center gap-3 sm:flex">
            {isManager && <Button variant="outline" size="sm" onClick={() => navigate('/seasons')} className="font-bold">Seasons</Button>}
            {isManager && <Button variant="outline" size="sm" onClick={() => navigate('/admin')} className="font-bold">Admin</Button>}
            {isAuthenticated ? <Button variant="gold" size="sm" onClick={() => navigate('/dashboard')} className="font-bold">{profile?.full_name ? 'Dashboard' : 'My dashboard'}</Button> : <Button variant="gold" size="sm" onClick={() => navigate('/login')} className="font-bold">Sign in</Button>}
          </div>

          <div className="flex items-center sm:hidden">
            <button ref={menuButtonRef} onClick={() => setMobileMenuOpen((open) => !open)} className="touch-target rounded-lg p-2 text-tmgl-charcoal-200 hover:bg-tmgl-charcoal-900 hover:text-tmgl-gold-300" aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen} aria-controls="mobile-navigation">
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && <nav id="mobile-navigation" aria-label="Mobile navigation" className="space-y-1 border-t border-tmgl-charcoal-800 py-4 sm:hidden">
          {publicNavLinks.map((link) => <Link key={link.label} to={link.path} className={linkClass} onClick={() => closeMenu(false)}>{link.label}</Link>)}
          {isManager && <Link to="/seasons" className={linkClass} onClick={() => closeMenu(false)}>Seasons</Link>}
          {isManager && <Link to="/admin" className={linkClass} onClick={() => closeMenu(false)}>Admin</Link>}
          <div className="border-t border-tmgl-charcoal-800 pt-3"><Button variant="gold" fullWidth onClick={() => { closeMenu(false); navigate(isAuthenticated ? '/dashboard' : '/login'); }}>{isAuthenticated ? 'Open dashboard' : 'Sign in'}</Button></div>
        </nav>}
      </Container>
    </header>
  );
}
