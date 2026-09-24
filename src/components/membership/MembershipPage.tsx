/**
 * Membership Tiers / Pro Subscription
 *
 * Free vs Pro tier system with Stripe integration.
 * Pro unlocks advanced stats, historical trends, and unlimited yardage notes.
 */

import { useState, useEffect } from 'react';
import { Crown, Check, Lock, Sparkles, BarChart3, TrendingUp, MapPin, Star } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { supabase } from '@/lib/supabase';

export type MembershipTier = 'free' | 'pro';

export interface Membership {
  tier: MembershipTier;
  expires_at: string | null;
  stripe_customer_id: string | null;
}

const FREE_FEATURES = [
  'Practice round scoring',
  'Basic statistics',
  'Up to 5 yardage notes per course',
  'Tournament leaderboards',
  'Friendly matches',
];

const PRO_FEATURES = [
  'Everything in Free',
  'Advanced analytics & consistency scores',
  'Unlimited yardage notes',
  'Historical trend charts',
  'Virtual Caddie AI tips',
  'Round summary image export',
  'Priority support',
];

export async function getMembership(profileId: string): Promise<Membership> {
  const { data } = await supabase
    .from('profiles')
    .select('membership_tier, membership_expires_at, stripe_customer_id')
    .eq('id', profileId)
    .maybeSingle();

  return {
    tier: (data?.membership_tier as MembershipTier) ?? 'free',
    expires_at: data?.membership_expires_at ?? null,
    stripe_customer_id: data?.stripe_customer_id ?? null,
  };
}

export function isProMember(membership: Membership): boolean {
  if (membership.tier === 'pro') {
    if (membership.expires_at) {
      return new Date(membership.expires_at) > new Date();
    }
    return true;
  }
  return false;
}

export function ProGate({ children, feature }: { children: React.ReactNode; feature?: string }) {
  const [membership, setMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const m = await getMembership(user.id);
        setMembership(m);
      }
      setLoading(false);
    }
    check();
  }, []);

  if (loading) return null;

  if (membership && isProMember(membership)) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      <div className="blur-sm pointer-events-none opacity-50">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-tmgl-dark/90 border border-tmgl-green/30 rounded-xl p-4 text-center max-w-xs">
          <Lock className="w-6 h-6 text-tmgl-green mx-auto mb-2" />
          <p className="text-sm font-semibold text-tmgl-silver">Pro Feature</p>
          <p className="text-xs text-tmgl-silver/60 mt-1">
            {feature ? `${feature} requires a Pro subscription.` : 'Upgrade to Pro to unlock this feature.'}
          </p>
        </div>
      </div>
    </div>
  );
}

interface MembershipPageProps {
  currentMembership?: Membership;
  onUpgrade?: () => void;
}

export function MembershipPage({ currentMembership, onUpgrade }: MembershipPageProps) {
  const [loading, setLoading] = useState(false);
  const isPro = currentMembership ? isProMember(currentMembership) : false;

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Create Stripe checkout session via Edge Function
      const { data, error } = await supabase.functions.invoke('create-checkout-session', {
        body: { userId: user.id, email: user.email },
      });

      if (error || !data?.url) {
        // Fallback: direct to contact page for manual upgrade
        window.open('/contact', '_blank');
      } else {
        window.location.href = data.url;
      }
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <Crown className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
        <h1 className="text-3xl font-bold text-tmgl-silver">Choose Your Plan</h1>
        <p className="text-tmgl-silver/60 mt-2">Unlock the full power of TMGL analytics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Free Tier */}
        <Card className={`relative ${!isPro ? 'border-tmgl-green/50' : ''}`}>
          {!isPro && (
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-tmgl-charcoal-700 text-tmgl-silver text-xs px-3 py-1 rounded-full">
              Current Plan
            </div>
          )}
          <CardHeader>
            <CardTitle className="text-lg text-center">
              <span className="text-tmgl-silver">Free</span>
            </CardTitle>
            <p className="text-center text-3xl font-bold text-tmgl-silver">$0<span className="text-sm font-normal text-tmgl-silver/50">/mo</span></p>
          </CardHeader>
          <CardContent className="space-y-3">
            {FREE_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-tmgl-green shrink-0" />
                <span className="text-tmgl-silver/80">{f}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Pro Tier */}
        <Card className={`relative ${isPro ? 'border-yellow-500/50' : 'border-yellow-500/30'}`}>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-yellow-500/20 text-yellow-400 text-xs px-3 py-1 rounded-full flex items-center gap-1">
            <Star className="w-3 h-3" /> PRO
          </div>
          <CardHeader>
            <CardTitle className="text-lg text-center">
              <span className="text-yellow-400">Pro</span>
            </CardTitle>
            <p className="text-center text-3xl font-bold text-tmgl-silver">$9.99<span className="text-sm font-normal text-tmgl-silver/50">/mo</span></p>
          </CardHeader>
          <CardContent className="space-y-3">
            {PRO_FEATURES.map((f) => (
              <div key={f} className="flex items-center gap-2 text-sm">
                <Check className="w-4 h-4 text-yellow-400 shrink-0" />
                <span className="text-tmgl-silver/80">{f}</span>
              </div>
            ))}
            <Button
              onClick={onUpgrade ?? handleUpgrade}
              disabled={isPro || loading}
              className={`w-full mt-4 ${isPro ? 'bg-tmgl-charcoal-700' : 'bg-yellow-500 hover:bg-yellow-400 text-black'}`}
            >
              {isPro ? 'Already Pro' : loading ? 'Processing...' : 'Upgrade to Pro'}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Feature Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Feature Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-tmgl-charcoal-700">
                  <th className="text-left py-2 text-tmgl-silver/60">Feature</th>
                  <th className="text-center py-2 text-tmgl-silver/60">Free</th>
                  <th className="text-center py-2 text-yellow-400">Pro</th>
                </tr>
              </thead>
              <tbody className="text-tmgl-silver/80">
                <tr className="border-b border-tmgl-charcoal-800">
                  <td className="py-2 flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Basic Stats</td>
                  <td className="text-center py-2"><Check className="w-4 h-4 text-tmgl-green mx-auto" /></td>
                  <td className="text-center py-2"><Check className="w-4 h-4 text-yellow-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-tmgl-charcoal-800">
                  <td className="py-2 flex items-center gap-2"><TrendingUp className="w-4 h-4" /> Advanced Analytics</td>
                  <td className="text-center py-2"><Lock className="w-4 h-4 text-tmgl-charcoal-500 mx-auto" /></td>
                  <td className="text-center py-2"><Check className="w-4 h-4 text-yellow-400 mx-auto" /></td>
                </tr>
                <tr className="border-b border-tmgl-charcoal-800">
                  <td className="py-2 flex items-center gap-2"><MapPin className="w-4 h-4" /> Yardage Notes</td>
                  <td className="text-center py-2 text-xs text-tmgl-silver/60">5 per course</td>
                  <td className="text-center py-2 text-xs text-yellow-400">Unlimited</td>
                </tr>
                <tr className="border-b border-tmgl-charcoal-800">
                  <td className="py-2 flex items-center gap-2"><Sparkles className="w-4 h-4" /> Virtual Caddie AI</td>
                  <td className="text-center py-2"><Lock className="w-4 h-4 text-tmgl-charcoal-500 mx-auto" /></td>
                  <td className="text-center py-2"><Check className="w-4 h-4 text-yellow-400 mx-auto" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
