import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, User, Menu, X, LogOut, LayoutDashboard } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Button } from '@/components/common/Button';
import { RoleBadge } from '@/components/auth/RoleBadge';
import type { UserRole } from '@/types/auth';

export interface HeaderProps {
  onLoginClick?: () => void;
  onSignOut?: () => void;
  isAuthenticated?: boolean;
  userRole?: UserRole;
}

export function Header({
  onLoginClick,
  onSignOut,
  isAuthenticated = false,
  userRole,
}: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const navigate = useNavigate();

  const publicNavLinks = [
    { label: 'Home', path: '/' },
    { label: 'Seasons', path: '/seasons' },
    { label: 'Players', path: '/players' },
    { label: 'Teams', path: '/teams' },
  ];

  return (
    <header className="sticky top-0 z-40 bg-tmgl-green-900 border-b border-tmgl-green-700/50 text-white shadow-md">
      <Container size="lg">
        <div className="flex items-center justify-between h-16">
          {/* Brand */}
          <button
            onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}
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

          {/* Desktop nav — public */}
          {!isAuthenticated && (
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
          )}

          {/* Desktop actions */}
          <div className="hidden sm:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {userRole && <RoleBadge role={userRole} />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/dashboard')}
                  className="text-white hover:bg-tmgl-green-800 gap-1.5"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  <span className="hidden lg:inline">Dashboard</span>
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onSignOut}
                  className="text-tmgl-charcoal-300 hover:text-white hover:bg-tmgl-green-800 gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden lg:inline">Sign out</span>
                </Button>
              </>
            ) : (
              <Button
                variant="gold"
                size="sm"
                onClick={onLoginClick}
                className="font-bold tracking-wide"
              >
                Sign in
              </Button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-tmgl-charcoal-200 hover:text-white hover:bg-tmgl-green-800 touch-target focus:outline-none"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div className="sm:hidden py-4 border-t border-tmgl-green-800/80 space-y-2">
            {isAuthenticated ? (
              <>
                {userRole && (
                  <div className="px-3 py-2">
                    <RoleBadge role={userRole} />
                  </div>
                )}
                <button
                  onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-100 hover:bg-tmgl-green-800"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  onClick={() => { setMobileMenuOpen(false); onSignOut?.(); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-300 hover:bg-tmgl-green-800"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </>
            ) : (
              <>
                {publicNavLinks.map((link) => (
                  <button
                    key={link.label}
                    onClick={() => { setMobileMenuOpen(false); navigate(link.path); }}
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
                    onClick={() => { setMobileMenuOpen(false); onLoginClick?.(); }}
                  >
                    <User className="w-4 h-4 mr-2" />
                    Sign in
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </Container>
    </header>
  );
}
