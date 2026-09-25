import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  BarChart3,
  Bell,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Medal,
  Menu,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  User,
  Users,
  X,
} from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Button } from '@/components/common/Button';
import { RoleBadge } from '@/components/auth/RoleBadge';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { getUnreadCount } from '@/lib/notifications';
import { cn } from '@/lib/utils';
import {
  getAuthDisplayName,
  getAuthInitials,
  getAuthNavItems,
  getNotificationBadgeLabel,
  type AuthNavIcon,
} from './authNavigation';
import React from 'react';

const NAV_ICONS: Record<AuthNavIcon, React.ComponentType<{ className?: string }>> = {
  home: LayoutDashboard,
  tournaments: Trophy,
  practice: Target,
  leaderboard: Medal,
  announcements: Megaphone,
  scores: ClipboardList,
  organizer: Users,
  admin: ShieldCheck,
  analytics: BarChart3,
  notifications: Bell,
  profile: Settings,
};

const PROFILE_MENU_ID = 'auth-profile-menu';
const MOBILE_MENU_ID = 'auth-mobile-menu';

export function AuthenticatedHeader() {
  const { user, profile, signOut } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [signingOut, setSigningOut] = useState(false);

  const mobileMenuButtonRef = useRef<HTMLButtonElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const role = profile?.role ?? null;
  const navItems = getAuthNavItems(role);
  const desktopNavItems = getAuthNavItems(role, { scope: 'desktop' });
  const displayName = getAuthDisplayName(profile?.full_name, user?.email);
  const initials = getAuthInitials(profile?.full_name, user?.email);

  useEffect(() => {
    const profileId = profile?.id;
    if (!profileId) {
      setUnreadCount(0);
      return;
    }
    let active = true;
    void getUnreadCount(profileId).then((result) => {
      if (active) setUnreadCount(result.data ?? 0);
    });
    return () => {
      active = false;
    };
  }, [profile?.id]);

  useEffect(() => {
    setMobileMenuOpen(false);
    setProfileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMenuOpen && !profileMenuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (profileMenuOpen) {
        setProfileMenuOpen(false);
        profileButtonRef.current?.focus();
        return;
      }
      setMobileMenuOpen(false);
      mobileMenuButtonRef.current?.focus();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [mobileMenuOpen, profileMenuOpen]);

  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        mobileMenuRef.current && !mobileMenuRef.current.contains(target) &&
        mobileMenuButtonRef.current && !mobileMenuButtonRef.current.contains(target)
      ) {
        setMobileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [mobileMenuOpen]);

  useEffect(() => {
    if (!profileMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        profileMenuRef.current && !profileMenuRef.current.contains(target) &&
        profileButtonRef.current && !profileButtonRef.current.contains(target)
      ) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileMenuOpen]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    setProfileMenuOpen(false);
    setMobileMenuOpen(false);
    try {
      await signOut();
      toast.success('Signed out successfully.');
      navigate('/', { replace: true });
    } catch {
      toast.error('Could not sign out. Please try again.');
      setSigningOut(false);
    }
  }, [navigate, signOut, toast]);

  const navLinkClass = (isActive: boolean) =>
    cn(
      'text-sm font-medium py-2 transition-colors border-b-2 -mb-px',
      isActive
        ? 'text-tmgl-gold border-tmgl-gold'
        : 'text-tmgl-charcoal-200 hover:text-tmgl-gold border-transparent'
    );

  const mobileNavLinkClass = (isActive: boolean) =>
    cn(
      'flex items-center gap-3 px-3 py-3 rounded-md text-sm font-medium min-h-[44px]',
      isActive
        ? 'bg-tmgl-green-800 text-tmgl-gold'
        : 'text-tmgl-charcoal-100 hover:bg-tmgl-green-800'
    );

  return (
    <header className="sticky top-0 z-40 bg-tmgl-green-900 border-b border-tmgl-green-700/50 text-white shadow-md">
      <Container size="lg">
        <div className="flex items-center justify-between h-16 gap-4">
          <Link
            to="/dashboard"
            className="flex items-center gap-3 touch-target shrink-0"
            aria-label="Go to dashboard"
          >
            <div className="w-10 h-10 rounded-lg bg-tmgl-green-800 border border-tmgl-gold/60 flex items-center justify-center shadow-inner">
              <Trophy className="w-5 h-5 text-tmgl-gold" />
            </div>
            <div className="hidden sm:block">
              <span className="font-extrabold tracking-wider text-base sm:text-lg uppercase text-white">
                TMGL
              </span>
              <span className="hidden lg:inline-block ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-tmgl-green-700/60 text-tmgl-gold border border-tmgl-gold/30">
                Toruk Maktu Golf League
              </span>
            </div>
          </Link>

          <nav aria-label="Main" className="hidden lg:flex items-center gap-4 xl:gap-5 flex-1 justify-center">
            {desktopNavItems.map((item) => (
              <NavLink
                key={item.id}
                to={item.path}
                end={item.exact}
                className={({ isActive }) => navLinkClass(isActive)}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-2">
            <Link
              to="/notifications"
              className="relative p-2 rounded-lg text-tmgl-charcoal-200 hover:text-white hover:bg-tmgl-green-800 touch-target focus:outline-none focus:ring-2 focus:ring-tmgl-gold"
              aria-label={getNotificationBadgeLabel(unreadCount)}
              aria-current={location.pathname.startsWith('/notifications') ? 'page' : undefined}
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-tmgl-gold text-tmgl-charcoal-950 text-[10px] font-bold flex items-center justify-center"
                  aria-hidden="true"
                >
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </Link>

            <div className="relative hidden sm:block">
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setProfileMenuOpen((open) => !open)}
                className="flex items-center gap-2 pl-1 pr-2 py-1 rounded-lg hover:bg-tmgl-green-800 touch-target focus:outline-none focus:ring-2 focus:ring-tmgl-gold"
                aria-label={`Account menu for ${displayName}`}
                aria-haspopup="menu"
                aria-expanded={profileMenuOpen}
                aria-controls={PROFILE_MENU_ID}
              >
                <span className="w-8 h-8 rounded-full bg-tmgl-gold text-tmgl-charcoal-950 text-xs font-bold flex items-center justify-center shrink-0">
                  {initials}
                </span>
                <span className="hidden lg:block max-w-[9rem] truncate text-sm font-medium text-white">
                  {displayName}
                </span>
              </button>

              {profileMenuOpen && (
                <div
                  id={PROFILE_MENU_ID}
                  ref={profileMenuRef}
                  role="menu"
                  aria-label="Account"
                  className="absolute right-0 mt-2 w-60 rounded-xl bg-white border border-tmgl-charcoal-200 shadow-xl overflow-hidden z-50"
                >
                  <div className="px-4 py-3 border-b border-tmgl-charcoal-100">
                    <p className="text-sm font-semibold text-tmgl-charcoal-900 truncate">{displayName}</p>
                    <p className="text-xs text-tmgl-charcoal-500 truncate mb-2">{user?.email}</p>
                    <RoleBadge role={role} />
                  </div>

                  <Link
                    to="/profile/settings"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-tmgl-charcoal-700 hover:bg-tmgl-charcoal-50"
                  >
                    <User className="w-4 h-4 text-tmgl-green-700" />
                    Profile settings
                  </Link>

                  <Link
                    to="/notifications"
                    role="menuitem"
                    className="flex items-center gap-3 px-4 py-3 text-sm text-tmgl-charcoal-700 hover:bg-tmgl-charcoal-50"
                  >
                    <Bell className="w-4 h-4 text-tmgl-green-700" />
                    Notifications
                  </Link>

                  <div className="border-t border-tmgl-charcoal-100 p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      fullWidth
                      onClick={handleSignOut}
                      disabled={signingOut}
                      aria-label="Sign out"
                      className="justify-start text-tmgl-charcoal-700"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {signingOut ? 'Signing out…' : 'Sign out'}
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="lg:hidden flex items-center" ref={mobileMenuRef}>
              <button
                ref={mobileMenuButtonRef}
                type="button"
                onClick={() => setMobileMenuOpen((open) => !open)}
                className="p-2 rounded-lg text-tmgl-charcoal-200 hover:text-white hover:bg-tmgl-green-800 touch-target focus:outline-none focus:ring-2 focus:ring-tmgl-gold"
                aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={mobileMenuOpen}
                aria-controls={MOBILE_MENU_ID}
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>

        {mobileMenuOpen && (
          <div
            id={MOBILE_MENU_ID}
            className="lg:hidden py-3 border-t border-tmgl-green-800/80 max-h-[calc(100vh-4rem)] overflow-y-auto overscroll-contain"
          >
            <nav aria-label="Mobile" className="space-y-1">
              {navItems.map((item) => {
                const Icon = NAV_ICONS[item.icon];
                return (
                  <NavLink
                    key={item.id}
                    to={item.path}
                    end={item.exact}
                    className={({ isActive }) => mobileNavLinkClass(isActive)}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-3 pt-3 border-t border-tmgl-green-800 flex items-center justify-between gap-3">
              <span className="text-sm text-tmgl-charcoal-200 truncate min-w-0">{displayName}</span>
              <Button
                variant="gold"
                size="sm"
                onClick={handleSignOut}
                disabled={signingOut}
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4 mr-2" />
                {signingOut ? 'Signing out…' : 'Sign out'}
              </Button>
            </div>
          </div>
        )}
      </Container>
    </header>
  );
}
