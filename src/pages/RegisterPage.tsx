import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trophy, Mail, Lock, User, AlertCircle, Eye, EyeOff, CheckCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/common/Button';
import { env } from '@/config/env';

export function RegisterPage() {
  const { signUp, isAuthenticated, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

  // Already authenticated — redirect away
  useEffect(() => {
    if (isAuthenticated && !authLoading) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Email confirmation pending state
  if (awaitingConfirmation) {
    return (
      <div className="min-h-screen bg-tmgl-green-900 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto">
            <CheckCircle className="w-7 h-7 text-emerald-600" />
          </div>
          <h2 className="text-xl font-bold text-tmgl-charcoal-900">Check your email</h2>
          <p className="text-sm text-tmgl-charcoal-600">
            We've sent a confirmation link to <strong>{email}</strong>. Click the link to activate your account, then sign in.
          </p>
          <Button variant="primary" fullWidth onClick={() => navigate('/login')} className="bg-tmgl-green-800 hover:bg-tmgl-green-700">
            Back to Sign in
          </Button>
        </div>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmedName = fullName.trim();
    const trimmedEmail = email.trim();

    if (!trimmedName) {
      setError('Please enter your full name.');
      return;
    }
    if (!trimmedEmail) {
      setError('Please enter your email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await signUp(trimmedEmail, password, trimmedName);
    setIsSubmitting(false);

    if (!result.success) {
      setError(result.error ?? 'Registration failed. Please try again.');
      return;
    }

    if (result.requiresConfirmation) {
      setAwaitingConfirmation(true);
    } else {
      // Auto-confirmed — go straight to dashboard
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-tmgl-green-900 flex flex-col items-center justify-center px-4 py-12">
      {/* Brand mark */}
      <div className="mb-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-tmgl-green-800 border-2 border-tmgl-gold/60 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <Trophy className="w-8 h-8 text-tmgl-gold" />
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-wider uppercase">TMGL</h1>
        <p className="text-tmgl-charcoal-300 text-sm mt-1">Toruk Maktu Golf League</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 sm:p-8">
        <h2 className="text-xl font-bold text-tmgl-charcoal-900 mb-1">Create an account</h2>
        <p className="text-sm text-tmgl-charcoal-500 mb-6">
          Already have one?{' '}
          <Link to="/login" className="text-tmgl-green-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>

        {/* Supabase not configured warning */}
        {!env.isConfigured && (
          <div className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Supabase credentials not configured. Set <code>VITE_SUPABASE_URL</code> and{' '}
              <code>VITE_SUPABASE_ANON_KEY</code> in your <code>.env</code> file.
            </span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div role="alert" className="mb-4 flex items-start gap-2 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          {/* Full Name */}
          <div>
            <label htmlFor="fullName" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400 pointer-events-none" />
              <input
                id="fullName"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Your full name"
                required
                className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-300 text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent transition"
              />
            </div>
          </div>

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
              Password <span className="text-tmgl-charcoal-400 font-normal">(min. 8 characters)</span>
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400 pointer-events-none" />
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
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

          {/* Confirm Password */}
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-tmgl-charcoal-800 mb-1.5">
              Confirm password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-tmgl-charcoal-400 pointer-events-none" />
              <input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 min-h-[44px] rounded-lg border border-tmgl-charcoal-300 text-sm text-tmgl-charcoal-900 placeholder-tmgl-charcoal-400 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 focus:border-transparent transition"
              />
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
            {isSubmitting ? 'Creating account…' : 'Create account'}
          </Button>
        </form>

        <p className="mt-4 text-xs text-tmgl-charcoal-400 text-center">
          New accounts are registered as <strong>Player</strong> by default.
          League Manager or Admin access is granted by a Super Admin.
        </p>
      </div>

      <p className="mt-6 text-xs text-tmgl-charcoal-400 text-center">
        © {new Date().getFullYear()} Toruk Maktu Golf League
      </p>
    </div>
  );
}
