import { Badge } from '@/components/common/Badge';
import { getRoleLabel } from '@/lib/roleGuards';
import type { UserRole } from '@/types/auth';
import type { BadgeVariant } from '@/components/common/Badge';

interface RoleBadgeProps {
  role: UserRole | null | undefined;
  className?: string;
}

const ROLE_BADGE_VARIANTS: Record<UserRole, BadgeVariant> = {
  super_admin: 'gold',
  league_manager: 'success',
  player: 'info',
  public: 'default',
};

export function RoleBadge({ role, className }: RoleBadgeProps) {
  if (!role) return null;
  const variant = ROLE_BADGE_VARIANTS[role] ?? 'default';
  return (
    <Badge variant={variant} className={className}>
      {getRoleLabel(role)}
    </Badge>
  );
}
