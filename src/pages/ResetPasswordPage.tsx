import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Lock, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';

export function ResetPasswordPage() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setTokenValid(true);
        setValidating(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setTokenValid(true);
      }
      setValidating(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setError(updateError.message);
    } else {
      setSuccess(true);
    }
    setLoading(false);
  };

  if (validating) {
    return (
      <Container className="py-12 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <p className="text-tmgl-charcoal-600">Validating reset link...</p>
          </CardContent>
        </Card>
      </Container>
    );
  }

  if (!tokenValid && !success) {
    return (
      <Container className="py-12 flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-tmgl-charcoal-900 mb-2">Invalid or Expired Link</h2>
            <p className="text-sm text-tmgl-charcoal-600 mb-6">
              This password reset link is invalid or has expired. Please request a new one.
            </p>
            <Link to="/forgot-password">
              <Button className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white">Request New Link</Button>
            </Link>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container className="py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {success ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-tmgl-green-700" />
              </div>
              <h2 className="text-xl font-bold text-tmgl-charcoal-900 mb-2">Password Updated</h2>
              <p className="text-sm text-tmgl-charcoal-600 mb-6">
                Your password has been changed successfully.
              </p>
              <Link to="/login">
                <Button className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white">Go to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-tmgl-green-700" />
                </div>
                <h2 className="text-xl font-bold text-tmgl-charcoal-900">Set New Password</h2>
                <p className="text-sm text-tmgl-charcoal-600 mt-1">
                  Enter your new password below.
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="password"
                  placeholder="New password (min 8 characters)"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                />
                <input
                  type="password"
                  placeholder="Confirm new password"
                  required
                  minLength={8}
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setError(null); }}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                />
                <Button type="submit" disabled={loading} className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white">
                  {loading ? 'Updating...' : 'Update Password'}
                </Button>
              </form>
              <Link to="/login" className="flex items-center justify-center gap-1 mt-4 text-sm text-tmgl-green-700 hover:underline">
                <ArrowLeft className="w-4 h-4" />
                Back to Login
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </Container>
  );
}
