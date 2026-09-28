import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { AlertCircle, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { canAccessRoute } from '@/lib/roleGuards';
import { Button } from '@/components/common/Button';
import type { UserRole } from '@/types/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  /** Minimum role required. Defaults to 'player' (any authenticated user). */
  requiredRole?: UserRole;
}

/**
 * Wraps route content with session and role checks.
 *
 * IMPORTANT: This is a UI-layer convenience guard only.
 * Authoritative access control is enforced by Supabase RLS policies
 * on the database side. Never rely solely on this component for security.
 */
export function ProtectedRoute({ children, requiredRole = 'player' }: ProtectedRouteProps) {
  const { isAuthenticated, isLoading, profile, profileError, refreshProfile } = useAuth();
  const location = useLocation();
  const [retrying, setRetrying] = React.useState(false);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-tmgl-charcoal-50">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-tmgl-green border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-tmgl-charcoal-500 font-medium">Loading session…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!profile) {
    const handleRetry = () => {
      setRetrying(true);
      void Promise.resolve(refreshProfile()).finally(() => setRetrying(false));
    };
    return (
      <div className="min-h-screen flex items-center justify-center bg-tmgl-charcoal-950 px-4">
        <div className="max-w-md text-center text-white">
          <AlertCircle className="mx-auto mb-3 h-8 w-8 text-tmgl-gold-400" />
          <p className="font-semibold">Unable to load your league profile.</p>
          <p className="mt-2 text-sm text-tmgl-charcoal-300">
            Your account signed in, but the league database did not return your profile.
          </p>
          {import.meta.env.DEV && profileError && (
            <pre className="mt-4 max-h-40 overflow-auto rounded-lg border border-tmgl-charcoal-700 bg-tmgl-charcoal-900 p-3 text-left text-xs whitespace-pre-wrap text-tmgl-charcoal-200">
              {profileError}
            </pre>
          )}
          {!import.meta.env.DEV && profileError && (
            <p className="mt-4 text-xs text-tmgl-charcoal-400">Reference: {profileError}</p>
          )}
          <div className="mt-5 flex justify-center gap-2">
            <Button variant="gold" onClick={handleRetry} disabled={retrying}>
              <RefreshCw className={`mr-2 h-4 w-4 ${retrying ? 'animate-spin' : ''}`} />
              {retrying ? 'Retrying…' : 'Retry'}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (!canAccessRoute(profile.role, requiredRole)) {
    return <Navigate to="/unauthorized" state={{ requiredRole }} replace />;
  }

  return <>{children}</>;
}
