import { useNavigate } from 'react-router-dom';
import { Trophy, ArrowRight, Download, Users, BarChart3, Target, Zap, Globe } from 'lucide-react';
import { Button } from '@/components/common/Button';

const FEATURES = [
  { icon: Zap, title: 'Live Scoring', desc: 'Real-time score updates during rounds. No more waiting for the 19th hole.', color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { icon: BarChart3, title: 'Handicap Tracking', desc: 'Automatic handicap calculation. Know your game, improve your game.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
  { icon: Trophy, title: 'Tournaments', desc: 'Full tournament management. Brackets, rounds, and live leaderboards.', color: 'text-purple-500', bg: 'bg-purple-50' },
  { icon: Users, title: 'Team Events', desc: 'Foursome and team-based competitions. Build your dream team.', color: 'text-blue-500', bg: 'bg-blue-50' },
  { icon: Target, title: 'Multiple Formats', desc: 'Stroke play, match play, Stableford, and more. Every format covered.', color: 'text-orange-500', bg: 'bg-orange-50' },
  { icon: Globe, title: 'Offline First', desc: 'Score anywhere, even without signal. Syncs when you reconnect.', color: 'text-cyan-500', bg: 'bg-cyan-50' },
];

const STATS = [
  { value: '500+', label: 'Active Players' },
  { value: '10K+', label: 'Rounds Played' },
  { value: '200+', label: 'Tournaments' },
  { value: '4.8', label: 'App Rating' },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-tmgl-green-900 via-tmgl-green-800 to-tmgl-green-950">
        <div className="absolute inset-0 bg-[url('/logo.png')] bg-center bg-no-repeat bg-contain opacity-[0.03]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-tmgl-gold/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-tmgl-gold/5 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

        <div className="relative max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 border border-tmgl-gold/30 text-tmgl-gold text-sm font-semibold mb-6 backdrop-blur-sm">
                <Trophy className="w-4 h-4" />
                Toruk Maktu Golf League
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
                Where Champions
                <span className="block text-tmgl-gold">Compete</span>
              </h1>

              <p className="text-lg text-tmgl-charcoal-300 mb-8 max-w-lg leading-relaxed">
                The complete golf league platform. Live scoring, handicap tracking, tournament management, and real-time leaderboards — all in your pocket.
              </p>

              <div className="flex flex-wrap gap-4">
                <Button variant="gold" size="lg" onClick={() => navigate('/login')}>
                  Get Started Free
                  <ArrowRight className="w-5 h-5 ml-2" />
                </Button>
                <a href="https://github.com/abdullahafsar5002/TMGL/releases/download/v1.0.0/app-debug.apk" target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    size="lg"
                    className="bg-white/10 border-white/20 text-white hover:bg-white/20 backdrop-blur-sm"
                  >
                    <Download className="w-5 h-5 mr-2" />
                    Download APK
                  </Button>
                </a>
              </div>
            </div>

            <div className="relative hidden lg:block">
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
                <div className="grid grid-cols-2 gap-4">
                  {STATS.map(({ value, label }) => (
                    <div key={label} className="bg-white/10 rounded-2xl p-6 text-center border border-white/5 hover:bg-white/15 transition-colors">
                      <div className="text-3xl font-extrabold text-tmgl-gold mb-1">{value}</div>
                      <div className="text-sm text-tmgl-charcoal-300">{label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <section className="bg-white border-b border-tmgl-charcoal-200">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-2 sm:grid-cols-4 gap-6">
          {STATS.map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold text-tmgl-green-800">{value}</div>
              <div className="text-sm text-tmgl-charcoal-500 mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-24 bg-tmgl-charcoal-50">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-tmgl-green-100 text-tmgl-green-800 text-sm font-semibold mb-4">
              Everything You Need
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-tmgl-charcoal-900 mb-4">
              Built for Competitive Golf
            </h2>
            <p className="text-lg text-tmgl-charcoal-500 max-w-2xl mx-auto">
              From casual rounds to championship tournaments, TMGL has the tools to run your league like a pro.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc, color, bg }) => (
              <div
                key={title}
                className="group bg-white rounded-2xl p-6 border border-tmgl-charcoal-200 hover:border-tmgl-green-300 hover:shadow-lg transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl ${bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                  <Icon className={`w-6 h-6 ${color}`} />
                </div>
                <h3 className="text-lg font-bold text-tmgl-charcoal-900 mb-2">{title}</h3>
                <p className="text-sm text-tmgl-charcoal-500 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 sm:py-24 bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-tmgl-gold-100 text-tmgl-gold-800 text-sm font-semibold mb-4">
              Simple Process
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-tmgl-charcoal-900 mb-4">
              Start in 3 Easy Steps
            </h2>
          </div>

          <div className="grid sm:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create Account', desc: 'Sign up in seconds with your email or phone number.' },
              { step: '02', title: 'Join a League', desc: 'Find your league or create one and invite your friends.' },
              { step: '03', title: 'Start Scoring', desc: 'Track every hole, every round, every victory.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="relative text-center">
                <div className="text-6xl font-extrabold text-tmgl-green-100 mb-4">{step}</div>
                <h3 className="text-xl font-bold text-tmgl-charcoal-900 mb-2">{title}</h3>
                <p className="text-sm text-tmgl-charcoal-500 max-w-xs mx-auto">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-24 bg-gradient-to-br from-tmgl-green-800 via-tmgl-green-900 to-tmgl-green-950">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-6">
            Ready to Elevate Your Game?
          </h2>
          <p className="text-lg text-tmgl-charcoal-300 mb-8 max-w-2xl mx-auto">
            Join hundreds of golfers who are already competing, tracking scores, and climbing the leaderboard.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Button variant="gold" size="lg" onClick={() => navigate('/login')}>
              Sign Up Now
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <a href="https://github.com/abdullahafsar5002/TMGL/releases/download/v1.0.0/app-debug.apk" target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="lg"
                className="bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Download className="w-5 h-5 mr-2" />
                Download for Android
              </Button>
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-tmgl-charcoal-900 text-tmgl-charcoal-400 py-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <img src="/logo.png" alt="TMGL" className="w-8 h-8 rounded-full" />
              <span className="text-white font-bold">Toruk Maktu Golf League</span>
            </div>
            <div className="flex gap-6 text-sm">
              <a href="https://github.com/abdullahafsar5002/TMGL" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                GitHub
              </a>
              <span className="text-tmgl-charcoal-700">|</span>
              <span>Built with passion for the game</span>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-tmgl-charcoal-800 text-center text-sm text-tmgl-charcoal-500">
            © {new Date().getFullYear()} TMGL. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
