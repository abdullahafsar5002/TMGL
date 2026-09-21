import { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Menu, X } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Button } from '@/components/common/Button';

const publicNavLinks = [
  { label: 'Home', path: '/' },
  { label: 'Tournaments', path: '/tournaments' },
  { label: 'Leaderboard', path: '/leaderboard' },
  { label: 'About', path: '/about' },
  { label: 'News', path: '/news' },
];

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMenu();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeMenu]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
          menuButtonRef.current && !menuButtonRef.current.contains(e.target as Node)) {
        closeMenu();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen, closeMenu]);

  return (
    <header className="sticky top-0 z-40 bg-tmgl-green-900 border-b border-tmgl-green-700/50 text-white shadow-md">
      <Container size="lg">
        <div className="flex items-center justify-between h-16">
          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-3 touch-target"
            aria-label="Go to home"
          >
            <div className="w-10 h-10 rounded-lg bg-tmgl-green-800 border border-tmgl-gold/60 flex items-center justify-center shadow-inner">
              <Trophy className="w-5 h-5 text-tmgl-gold" />
            </div>
            <div>
              <span className="font-extrabold tracking-wider text-base sm:text-lg uppercase text-white">
                TMGL
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-tmgl-green-700/60 text-tmgl-gold border border-tmgl-gold/30">
                Toruk Maktu Golf League
              </span>
            </div>
          </button>

          <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
            {publicNavLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => navigate(link.path)}
                className="text-tmgl-charcoal-200 hover:text-tmgl-gold transition-colors py-2"
              >
                {link.label}
              </button>
            ))}
          </nav>

          <div className="hidden sm:flex items-center gap-3">
            <Button
              variant="gold"
              size="sm"
              onClick={() => navigate('/login')}
              className="font-bold tracking-wide"
            >
              Sign in
            </Button>
          </div>

          <div className="sm:hidden flex items-center" ref={menuRef}>
            <button
              ref={menuButtonRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-tmgl-charcoal-200 hover:text-white hover:bg-tmgl-green-800 touch-target focus:outline-none focus:ring-2 focus:ring-tmgl-gold"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="sm:hidden py-4 border-t border-tmgl-green-800/80 space-y-2">
            {publicNavLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => { closeMenu(); navigate(link.path); }}
                className="block w-full text-left px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-100 hover:bg-tmgl-green-800"
              >
                {link.label}
              </button>
            ))}
            <div className="pt-2 border-t border-tmgl-green-800">
              <Button
                variant="gold"
                fullWidth
                size="md"
                onClick={() => { closeMenu(); navigate('/login'); }}
              >
                Sign in
              </Button>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
