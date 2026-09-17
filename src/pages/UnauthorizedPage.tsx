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
    <Container size="sm" className="min-h-[70vh] flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div className="w-16 h-16 rounded-full bg-red-50 border-2 border-red-200 flex items-center justify-center mx-auto">
        <ShieldX className="w-8 h-8 text-red-500" />
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-tmgl-charcoal-900">Access denied</h1>
        <p className="text-tmgl-charcoal-600 text-sm max-w-xs mx-auto">
          You don't have the required permissions to view this page.
        </p>
      </div>

      <div className="space-y-2 text-sm">
        <div className="flex items-center justify-center gap-2 text-tmgl-charcoal-500">
          <span>Your role:</span>
          <RoleBadge role={profile?.role} />
        </div>
        {requiredRole && (
          <p className="text-tmgl-charcoal-400 text-xs">
            Required: <strong>{getRoleLabel(requiredRole)}</strong> or higher
          </p>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <Button variant="outline" onClick={() => navigate(-1)} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Go back
        </Button>
        <Button variant="primary" onClick={() => navigate('/dashboard')} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
          Go to dashboard
        </Button>
      </div>
    </Container>
  );
}
