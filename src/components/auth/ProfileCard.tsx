import { User } from 'lucide-react';
import { RoleBadge } from '@/components/auth/RoleBadge';
import { Button } from '@/components/common/Button';
import { useAuth } from '@/context/AuthContext';

interface ProfileCardProps {
  onSignOut?: () => void;
}

export function ProfileCard({ onSignOut }: ProfileCardProps) {
  const { user, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="animate-pulse flex items-center gap-3 p-3">
        <div className="w-10 h-10 rounded-full bg-tmgl-charcoal-200" />
        <div className="space-y-1.5 flex-1">
          <div className="h-3 bg-tmgl-charcoal-200 rounded w-32" />
          <div className="h-2.5 bg-tmgl-charcoal-100 rounded w-24" />
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  return (
    <div className="flex items-center gap-3 p-3 rounded-xl bg-white border border-tmgl-charcoal-200">
      {/* Avatar placeholder — real avatar upload is a Phase 9 feature */}
      <div className="w-10 h-10 rounded-full bg-tmgl-green-100 border border-tmgl-green-200 flex items-center justify-center shrink-0">
        <User className="w-5 h-5 text-tmgl-green-700" />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-tmgl-charcoal-900 truncate">
          {profile.full_name || 'TMGL Member'}
        </p>
        <p className="text-xs text-tmgl-charcoal-500 truncate">{user.email}</p>
        <div className="mt-1">
          <RoleBadge role={profile.role} />
        </div>
      </div>

      {onSignOut && (
        <Button variant="ghost" size="sm" onClick={onSignOut} className="shrink-0 text-tmgl-charcoal-500">
          Sign out
        </Button>
      )}
    </div>
  );
}
