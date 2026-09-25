import { useLocation, useNavigate } from 'react-router-dom';
import React from 'react';
import {
  BarChart3,
  ClipboardList,
  LayoutDashboard,
  Medal,
  Megaphone,
  Settings,
  ShieldCheck,
  Target,
  Trophy,
  Users,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import {
  getAuthNavItems,
  isAuthNavItemActive,
  type AuthNavIcon,
} from './authNavigation';

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
  notifications: Megaphone,
  profile: Settings,
};

export function AuthenticatedBottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const items = getAuthNavItems(profile?.role, { scope: 'primary' });

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-tmgl-charcoal-200 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <nav aria-label="Primary" className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {items.map((item) => {
          const Icon = NAV_ICONS[item.icon];
          const isActive = isAuthNavItemActive(item, location.pathname);

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigate(item.path)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center justify-center touch-target transition-colors relative',
                isActive
                  ? 'text-tmgl-green-800 font-bold'
                  : 'text-tmgl-charcoal-500 hover:text-tmgl-charcoal-800'
              )}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-tmgl-green-800 rounded-b-full" />
              )}
              <Icon
                className={cn(
                  'w-5 h-5',
                  isActive ? 'text-tmgl-green-800 stroke-[2.5]' : 'stroke-2'
                )}
              />
              <span className="text-[10px] mt-1 font-medium tracking-tight">{item.shortLabel}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
