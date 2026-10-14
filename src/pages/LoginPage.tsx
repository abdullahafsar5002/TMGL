import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { Mail, Lock, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { env } from '@/config/env';

export function LoginPage() {
  const { signIn, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Redirect already-authenticated users away from login
  const rawFrom = (location.state as { from?: Location })?.from?.pathname ?? '/dashboard';
  const from = rawFrom.startsWith('/') && !rawFrom.startsWith('//') ? rawFrom : '/dashboard';
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password) {
      setError('Please enter your email and password.');
      return;
    }

    setIsSubmitting(true);
    const result = await signIn(email.trim(), password);
    setIsSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.error ?? 'Sign in failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-tmgl-green-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <img src="/logo-mark.svg" alt="" className="mx-auto mb-4 h-16 w-16" />
        <h1 className="text-2xl font-bold uppercase tracking-[0.14em] text-white">TMGL</h1>
        <p className="mt-1 text-sm text-tmgl-charcoal-300">Toruk Maktu Golf League</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <h2 className="font-display text-display-md text-tmgl-charcoal-950">Sign in</h2>
        <p className="mb-5 mt-2 text-sm text-tmgl-charcoal-600">
          Welcome back. Sign in to enter scores and follow the league.
        </p>
        <div className="-mt-3 mb-6 flex items-center justify-between text-sm">
          <Link to="/forgot-password" className="font-semibold text-tmgl-green-700 hover:underline">
            Forgot password?
          </Link>
          <span className="text-tmgl-charcoal-500">
            No account?{' '}
            <Link to="/register" className="font-semibold text-tmgl-green-700 hover:underline">
              Create one
            </Link>
          </span>
        </div>

        {/* Supabase not configured warning */}
        {!env.isConfigured && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
               {env.configurationError ?? 'Supabase is not configured for this environment.'}
            </span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <div
            role="alert"
            className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Email */}
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400 pointer-events-none" />
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-300 text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-12 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-300 text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent transition"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-tmgl-charcoal-400 hover:text-tmgl-charcoal-700 touch-target flex items-center justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isSubmitting || authLoading || !env.isConfigured}
            className="mt-2 bg-tmgl-green-800 hover:bg-tmgl-green-700"
          >
            {isSubmitting ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>
      </div>

      <p className="mt-6 text-xs text-tmgl-charcoal-400 text-center">
        © {new Date().getFullYear()} Toruk Maktu Golf League
      </p>
    </div>
  );
}
