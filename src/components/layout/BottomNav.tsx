import React from 'react';
import { Home, Trophy, Edit3, Flag, User } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BottomNavItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export interface BottomNavProps {
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  const navItems: BottomNavItem[] = [
    { id: 'home', label: 'Home', icon: Home },
    { id: 'leaderboard', label: 'Leaderboard', icon: Trophy },
    { id: 'score', label: 'Scorecard', icon: Edit3 },
    { id: 'matches', label: 'Matches', icon: Flag },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur border-t border-tmgl-charcoal-200 pb-[env(safe-area-inset-bottom,0px)] shadow-lg">
      <nav className="grid grid-cols-5 h-16 max-w-md mx-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                'flex flex-col items-center justify-center touch-target transition-colors relative',
                isActive
                  ? 'text-tmgl-green font-bold'
                  : 'text-tmgl-charcoal-500 hover:text-tmgl-charcoal-800'
              )}
            >
              {isActive && (
                <span className="absolute top-0 w-8 h-1 bg-tmgl-green rounded-b-full" />
              )}
              <Icon className={cn('w-5 h-5', isActive ? 'text-tmgl-green stroke-[2.5]' : 'stroke-2')} />
              <span className="text-[10px] mt-1 font-medium tracking-tight">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
