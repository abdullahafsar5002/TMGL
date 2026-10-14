import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getRoleLabel } from '@/lib/roleGuards';
import { RoleBadge } from '@/components/auth/RoleBadge';
import { Button } from '@/components/common/Button';
import { Container } from '@/components/common/Container';
import type { UserRole } from '@/types/auth';

export function UnauthorizedPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();

  const requiredRole = (location.state as { requiredRole?: UserRole })?.requiredRole;

  return (
    <Container size="sm" className="flex min-h-[70vh] flex-col items-center justify-center py-12 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border-2 border-red-200 bg-red-50">
        <ShieldX className="h-8 w-8 text-red-500" />
      </div>

      <h1 className="mt-6 font-display text-display-md text-tmgl-charcoal-950">Access denied</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm text-tmgl-charcoal-600">
        You do not have the permissions needed to view this page.
      </p>

      <div className="mt-6 space-y-2 text-sm">
        <div className="flex items-center justify-center gap-2 text-tmgl-charcoal-500">
          <span>Your role:</span>
          <RoleBadge role={profile?.role} />
        </div>
        {requiredRole && (
          <p className="text-xs text-tmgl-charcoal-400">
            Required: <strong>{getRoleLabel(requiredRole)}</strong> or higher
          </p>
        )}
      </div>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Go back
        </Button>
        <Button variant="primary" onClick={() => navigate('/dashboard')}>
          Go to dashboard
        </Button>
      </div>
    </Container>
  );
}
