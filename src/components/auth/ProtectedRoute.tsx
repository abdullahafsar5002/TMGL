import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { canAccessRoute } from '@/lib/roleGuards';
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
  const { isAuthenticated, isLoading, profile } = useAuth();
  const location = useLocation();

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

  // Role gate: check if user's role meets minimum requirement
  const userRole = profile?.role ?? 'player';
  if (!canAccessRoute(userRole, requiredRole)) {
    return <Navigate to="/unauthorized" state={{ requiredRole }} replace />;
  }

  return <>{children}</>;
}
