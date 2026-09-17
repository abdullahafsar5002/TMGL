import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Database, Smartphone, CheckCircle,
  Sparkles, AlertCircle, ArrowRight, Calendar, Trophy,
  Users, Edit3, Shield
} from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/common/Card';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { env } from '@/config/env';

export function HomePage() {
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState<'home' | 'roadmap'>('home');

  if (activeSection === 'roadmap') {
    return (
      <Container size="lg" className="space-y-6 py-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-tmgl-green-800" />
              <CardTitle>TMGL Development Roadmap</CardTitle>
            </div>
            <Badge variant="gold">Phase 1 Active</Badge>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-tmgl-charcoal-700">
            <p className="text-xs text-tmgl-charcoal-500">
              Per <code>docs/DEVELOPMENT_ROADMAP.md</code>, the application is built modularly phase by phase.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3 bg-tmgl-charcoal-50 rounded-lg border border-tmgl-charcoal-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs">Phase 0 — Foundation</span>
                  <Badge variant="success">Complete</Badge>
                </div>
                <p className="text-xs text-tmgl-charcoal-600 mt-1">Vite, TypeScript, Tailwind, PWA shell, golf utils.</p>
              </div>
              <div className="p-3 bg-tmgl-green-50/70 rounded-lg border border-tmgl-green-200">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-tmgl-green-900">Phase 1 — Auth & RBAC</span>
                  <Badge variant="success">Current</Badge>
                </div>
                <p className="text-xs text-tmgl-charcoal-600 mt-1">Supabase session, profiles, roles, protected routes.</p>
              </div>
              {[
                { phase: 'Phase 2', label: 'League Structure', desc: 'Seasons, divisions, teams, rosters.' },
                { phase: 'Phase 3', label: 'Golf Courses', desc: 'Courses, tees, holes, pars, yardages.' },
                { phase: 'Phase 4', label: 'Competition', desc: 'Tournaments, fixtures, matches, pairings.' },
                { phase: 'Phase 5 & 6', label: 'Scoring & Live', desc: 'Mobile scorecards, realtime leaderboards.' },
              ].map((item) => (
                <div key={item.phase} className="p-3 bg-tmgl-charcoal-50 rounded-lg border border-tmgl-charcoal-200">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs">{item.label}</span>
                    <Badge variant="outline">{item.phase}</Badge>
                  </div>
                  <p className="text-xs text-tmgl-charcoal-600 mt-1">{item.desc}</p>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={() => setActiveSection('home')}>← Back</Button>
          </CardContent>
        </Card>
      </Container>
    );
  }

  return (
    <Container size="lg" className="space-y-6">
      {/* Hero */}
      <section className="bg-gradient-to-br from-tmgl-green-900 via-tmgl-green-800 to-tmgl-green-950 text-white rounded-2xl p-6 sm:p-10 shadow-lg border border-tmgl-gold/20">
        <div className="max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tmgl-green-700/60 border border-tmgl-gold/40 text-tmgl-gold text-xs font-semibold mb-4">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Toruk Maktu Golf League • Phase 1 — Auth & RBAC</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
            Competitive Golf League Platform
          </h1>
          <p className="text-tmgl-charcoal-200 text-sm sm:text-base leading-relaxed mb-6">
            Production-ready mobile architecture built for live scoring, handicap tracking, tournament management, and real-time competition leaderboards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" size="md" onClick={() => navigate('/login')}>
              Sign in
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <Button
              variant="outline"
              size="md"
              onClick={() => setActiveSection('roadmap')}
              className="bg-tmgl-green-900/60 border-tmgl-green-700 text-white hover:bg-tmgl-green-800"
            >
              View Roadmap
            </Button>
          </div>
        </div>
      </section>

      {/* Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-600" />
              <CardTitle>Auth & RBAC</CardTitle>
            </div>
            <Badge variant="success">Phase 1</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-tmgl-charcoal-600">
              Supabase Auth with email/password. Session persistence. Four roles: public, player, league_manager, super_admin.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-5 h-5 text-tmgl-green" />
              <CardTitle>Database & RLS</CardTitle>
            </div>
            {env.isConfigured ? (
              <Badge variant="success">Configured</Badge>
            ) : (
              <Badge variant="warning">Env Pending</Badge>
            )}
          </CardHeader>
          <CardContent>
            <p className="text-xs text-tmgl-charcoal-600">
              Row Level Security policies on profiles table. Trigger auto-creates profile on signup.
            </p>
            {!env.isConfigured && (
              <p className="text-xs text-amber-700 flex items-center gap-1 mt-2">
                <AlertCircle className="w-3.5 h-3.5" />
                Add keys to <code>.env</code>
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-tmgl-gold-600" />
              <CardTitle>Mobile-First PWA</CardTitle>
            </div>
            <Badge variant="gold">PWA Ready</Badge>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-tmgl-charcoal-600">
              Outdoor-optimised design system, ≥44px touch targets, safe area insets, standalone PWA manifest.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upcoming public modules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-tmgl-gold-600" />
            <CardTitle>Public Modules (upcoming phases)</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Trophy, label: 'Leaderboard', phase: 'Phase 6' },
            { icon: Calendar, label: 'Tournaments', phase: 'Phase 4' },
            { icon: Users, label: 'Teams', phase: 'Phase 2' },
            { icon: Edit3, label: 'Live Scores', phase: 'Phase 6' },
          ].map(({ icon: Icon, label, phase }) => (
            <div key={label} className="flex flex-col items-center text-center p-3 rounded-lg bg-tmgl-charcoal-50 border border-tmgl-charcoal-100 gap-2">
              <Icon className="w-6 h-6 text-tmgl-charcoal-400" />
              <span className="text-xs font-semibold text-tmgl-charcoal-700">{label}</span>
              <Badge variant="outline" className="text-[10px]">{phase}</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Integrity guarantees */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-tmgl-green-800" />
            <CardTitle>TMGL Architectural Guarantees</CardTitle>
          </div>
          <Badge variant="info">Enforced</Badge>
        </CardHeader>
        <CardContent>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-tmgl-charcoal-700">
            {[
              { text: 'No Service-Role Leak: Client bundle protected from administrative keys.' },
              { text: 'Verified Results Only: Official leaderboards use only verified scorecards.' },
              { text: 'RLS Enforced: Database-side authorization, not just frontend guards.' },
              { text: 'No Mock Data: Empty states indicate real system readiness.' },
            ].map(({ text }) => (
              <li key={text} className="flex items-start gap-2">
                <Shield className="w-3.5 h-3.5 text-tmgl-green mt-0.5 shrink-0" />
                <span>{text}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </Container>
  );
}
