import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Download, Users, BarChart3, Calendar } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export function HomePage() {
  const navigate = useNavigate();

  return (
    <Container size="lg" className="space-y-8">
      {/* Hero */}
      <section className="bg-gradient-to-br from-tmgl-green-900 via-tmgl-green-800 to-tmgl-green-950 text-white rounded-2xl p-6 sm:p-10 shadow-lg border border-tmgl-gold/20">
        <div className="max-w-2xl">
          <div className="flex items-center gap-4 mb-6">
            <img src="/logo.png" alt="Toruk Makto" className="w-20 h-20 sm:w-24 sm:h-24 rounded-full border-2 border-white/20 shadow-lg" />
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-tmgl-green-700/60 border border-tmgl-gold/40 text-tmgl-gold text-xs font-semibold mb-2">
                <Trophy className="w-3.5 h-3.5" />
                <span>Toruk Maktu Golf League</span>
              </div>
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white mb-1">
                Competitive Golf League Platform
              </h1>
            </div>
          </div>
          <p className="text-tmgl-charcoal-200 text-sm sm:text-base leading-relaxed mb-6">
            Live scoring, handicap tracking, tournament management, and real-time competition leaderboards.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="gold" size="md" onClick={() => navigate('/login')}>
              Sign in
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
            <a href="/app-debug.apk" download>
              <Button
                variant="outline"
                size="md"
                className="bg-tmgl-green-900/60 border-tmgl-green-700 text-white hover:bg-tmgl-green-800 gap-2"
              >
                <Download className="w-4 h-4" />
                Download APK
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <button onClick={() => navigate('/tournaments')} className="text-left">
          <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-all h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
                <Calendar className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h3 className="font-bold text-tmgl-charcoal-900">Tournaments</h3>
                <p className="text-xs text-tmgl-charcoal-500 mt-0.5">View recent and upcoming events</p>
              </div>
            </CardContent>
          </Card>
        </button>

        <button onClick={() => navigate('/leaderboard')} className="text-left">
          <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-all h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
                <BarChart3 className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-bold text-tmgl-charcoal-900">Leaderboard</h3>
                <p className="text-xs text-tmgl-charcoal-500 mt-0.5">See who is on top</p>
              </div>
            </CardContent>
          </Card>
        </button>

        <a href="/app-debug.apk" download className="text-left">
          <Card variant="hover" className="cursor-pointer hover:border-tmgl-green-300 transition-all h-full">
            <CardContent className="p-6 flex items-center gap-4">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
                <Download className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-tmgl-charcoal-900">Download App</h3>
                <p className="text-xs text-tmgl-charcoal-500 mt-0.5">Get the Android APK</p>
              </div>
            </CardContent>
          </Card>
        </a>
      </div>

      {/* Features */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: Trophy, label: 'Tournaments', desc: 'Compete in league events' },
              { icon: BarChart3, label: 'Leaderboards', desc: 'Real-time rankings' },
              { icon: Users, label: 'Teams', desc: 'Team-based competition' },
              { icon: Calendar, label: 'Scoring', desc: 'Live score tracking' },
            ].map(({ icon: Icon, label, desc }) => (
              <div key={label} className="text-center p-3">
                <Icon className="w-8 h-8 text-tmgl-green-700 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-tmgl-charcoal-900">{label}</h4>
                <p className="text-xs text-tmgl-charcoal-500 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </Container>
  );
}
