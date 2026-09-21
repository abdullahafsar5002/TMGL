import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (resetError) {
      setError(resetError.message);
    } else {
      setSent(true);
    }
    setLoading(false);
  };

  return (
    <Container className="py-12 flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-6 h-6 text-tmgl-green-700" />
              </div>
              <h2 className="text-xl font-bold text-tmgl-charcoal-900 mb-2">Check Your Email</h2>
              <p className="text-sm text-tmgl-charcoal-600 mb-6">
                We've sent a password reset link to <strong>{email}</strong>. Please check your inbox.
              </p>
              <Link to="/login">
                <Button variant="outline" className="w-full">Back to Login</Button>
              </Link>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-6 h-6 text-tmgl-green-700" />
                </div>
                <h2 className="text-xl font-bold text-tmgl-charcoal-900">Reset Password</h2>
                <p className="text-sm text-tmgl-charcoal-600 mt-1">
                  Enter your email and we'll send you a reset link.
                </p>
              </div>
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="email"
                  placeholder="Email address"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                />
                <Button type="submit" disabled={loading} className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white">
                  {loading ? 'Sending...' : 'Send Reset Link'}
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
