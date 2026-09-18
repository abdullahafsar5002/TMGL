import React, { useRef, useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, User, Menu, X, LogOut, LayoutDashboard, Swords, Bell, Megaphone } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Button } from '@/components/common/Button';
import { RoleBadge } from '@/components/auth/RoleBadge';
import { useAuth } from '@/context/AuthContext';
import { getUnreadCount } from '@/lib/notifications';
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
  const [unreadCount, setUnreadCount] = useState(0);
  const navigate = useNavigate();
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!isAuthenticated || !user) return;
    getUnreadCount(user.id).then(r => {
      if (r.data !== null) setUnreadCount(r.data);
    });
  }, [isAuthenticated, user]);

  const closeMenu = useCallback(() => {
    setMobileMenuOpen(false);
    menuButtonRef.current?.focus();
  }, []);

  // Close menu on Escape key
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeMenu();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, closeMenu]);

  // Close menu when clicking outside
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

  const publicNavLinks = [
    { label: 'Home', path: '/' },
    { label: 'Seasons', path: '/seasons' },
    { label: 'Players', path: '/players' },
    { label: 'Teams', path: '/teams' },
    { label: 'Courses', path: '/courses' },
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
                <button
                  onClick={() => navigate('/notifications')}
                  className="relative p-2 rounded-lg text-white hover:bg-tmgl-green-800 transition-colors"
                  aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ''}`}
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
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
          <div className="sm:hidden flex items-center" ref={menuRef}>
            <button
              ref={menuButtonRef}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-tmgl-charcoal-200 hover:text-white hover:bg-tmgl-green-800 touch-target focus:outline-none focus:ring-2 focus:ring-tmgl-gold"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile dropdown */}
        {mobileMenuOpen && (
          <div id="mobile-menu" role="menu" className="sm:hidden py-4 border-t border-tmgl-green-800/80 space-y-2">
            {isAuthenticated ? (
              <>
                {userRole && (
                  <div className="px-3 py-2">
                    <RoleBadge role={userRole} />
                  </div>
                )}
                <button
                  role="menuitem"
                  onClick={() => { closeMenu(); navigate('/dashboard'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-100 hover:bg-tmgl-green-800"
                >
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </button>
                <button
                  role="menuitem"
                  onClick={() => { closeMenu(); navigate('/friendly-matches'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-100 hover:bg-tmgl-green-800"
                >
                  <Swords className="w-4 h-4" />
                  Friendly Matches
                </button>
                <button
                  role="menuitem"
                  onClick={() => { closeMenu(); navigate('/notifications'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-100 hover:bg-tmgl-green-800"
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-auto w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>
                <button
                  role="menuitem"
                  onClick={() => { closeMenu(); navigate('/announcements'); }}
                  className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm font-medium text-tmgl-charcoal-100 hover:bg-tmgl-green-800"
                >
                  <Megaphone className="w-4 h-4" />
                  Announcements
                </button>
                <button
                  role="menuitem"
                  onClick={() => { closeMenu(); onSignOut?.(); }}
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
                    role="menuitem"
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
                    role="menuitem"
                    onClick={() => { closeMenu(); onLoginClick?.(); }}
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
