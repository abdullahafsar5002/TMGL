import { useNavigate } from 'react-router-dom';
import { Home, Trophy, Target, Medal, User } from 'lucide-react';
import { cn } from '@/lib/utils';
import React from 'react';

interface NavItem {
  id: string;
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface AuthenticatedBottomNavProps {
  currentPath: string;
}

const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'Home', path: '/dashboard', icon: Home },
  { id: 'tournaments', label: 'Events', path: '/tournaments', icon: Trophy },
  { id: 'practice', label: 'Practice', path: '/practice', icon: Target },
  { id: 'leaderboard', label: 'Board', path: '/leaderboard', icon: Medal },
  { id: 'profile', label: 'Profile', path: '/profile/settings', icon: User },
];

export function AuthenticatedBottomNav({ currentPath }: AuthenticatedBottomNavProps) {
  const navigate = useNavigate();

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-tmgl-charcoal-200 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <nav className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive = item.path === '/dashboard'
            ? currentPath === '/dashboard'
            : currentPath.startsWith(item.path);

          return (
            <button
              key={item.id}
              onClick={() => navigate(item.path)}
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
              <span className="text-[10px] mt-1 font-medium tracking-tight">{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
