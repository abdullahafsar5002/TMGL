import { useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Download,
  Trophy,
  Users,
  Activity,
  Gauge,
  LayoutGrid,
  WifiOff,
} from 'lucide-react';
import { Button } from '@/components/common/Button';

const FORMATS = [
  'Stroke Play',
  'Match Play',
  'Stableford',
  'Nassau',
  'Best Ball',
  'Scramble',
];

const FEATURES = [
  {
    icon: Activity,
    title: 'Live scoring',
    desc: 'Enter scores hole by hole during the round. Standings update as you play, not after the card is collected.',
  },
  {
    icon: Gauge,
    title: 'Handicap tracking',
    desc: 'Differentials, course ratings and slope are applied automatically from verified scorecards.',
  },
  {
    icon: Trophy,
    title: 'Tournament management',
    desc: 'Rounds, pairings, tee sheets, cut lines and official results — from qualifiers to the final.',
  },
  {
    icon: Users,
    title: 'Flights and pairings',
    desc: 'Split the field into flights, assign courses and tee times, then publish the draw to everyone.',
  },
  {
    icon: LayoutGrid,
    title: 'Every competition format',
    desc: 'Set the format per round. Standings, tie-breaks and scoring rules adapt on their own.',
  },
  {
    icon: WifiOff,
    title: 'Works without signal',
    desc: 'Score on the course with no reception. Rounds sync the moment the device reconnects.',
  },
];

const STEPS = [
  {
    step: '01',
    title: 'Create your account',
    desc: 'Register with your email, set your handicap details and pick your home course.',
  },
  {
    step: '02',
    title: 'Enter your round',
    desc: 'Pick the event and course, then record each hole. Your card stays editable until a manager verifies it.',
  },
  {
    step: '03',
    title: 'Watch the standings',
    desc: 'Net and gross leaders, flights and cuts update live as verified cards come in.',
  },
];

const PREVIEW = [
  { pos: 1, name: 'A. Rahman', net: -6, toPar: '−6', gross: 68 },
  { pos: 2, name: 'K. Malik', net: -3, toPar: '−3', gross: 71 },
  { pos: 3, name: 'S. Iqbal', net: -1, toPar: '−1', gross: 73 },
  { pos: 4, name: 'H. Nasir', net: 0, toPar: 'E', gross: 74 },
  { pos: 5, name: 'M. Tariq', net: +2, toPar: '+2', gross: 76 },
];

export function HomePage() {
  const navigate = useNavigate();

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-tmgl-charcoal-200 bg-[var(--surface-public)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-40 -top-40 h-[32rem] w-[32rem] rounded-full bg-tmgl-green-100 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -left-32 bottom-0 h-72 w-72 rounded-full bg-tmgl-gold-100 blur-3xl"
        />

        <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 lg:py-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.05fr_1fr]">
            <div>
              <span className="inline-flex items-center gap-2 rounded-pill border border-tmgl-green-200 bg-white px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-tmgl-green-700">
                <img src="/logo-mark.svg" alt="" className="h-4 w-4" />
                Toruk Maktu Golf League
              </span>

              <h1 className="mt-6 font-display text-display-2xl text-tmgl-green-950">
                Run the season
                <span className="block text-tmgl-green-700">like the pros do.</span>
              </h1>

              <p className="mt-6 max-w-lg text-lg leading-relaxed text-tmgl-charcoal-600">
                Pairings, tee sheets, live scoring and verified handicaps in one place —
                built for a real league with real members, not a spreadsheet.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button variant="primary" size="lg" onClick={() => navigate('/login')}>
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/leaderboard')}>
                  View leaderboard
                </Button>
                <a
                  href="https://github.com/abdullahafsar5002/TMGL/releases/download/v1.0.0/app-debug.apk"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-tmgl-charcoal-600 underline-offset-4 hover:text-tmgl-green-800 hover:underline"
                >
                  <Download className="h-4 w-4" />
                  Android app
                </a>
              </div>
            </div>

            {/* Product preview */}
            <div className="relative">
              <div className="rounded-panel border border-tmgl-charcoal-200 bg-white p-5 shadow-panel sm:p-6">
                <div className="flex items-center justify-between border-b border-tmgl-charcoal-100 pb-4">
                  <div className="flex items-center gap-3">
                    <img src="/logo-mark.svg" alt="" className="h-9 w-9" />
                    <div>
                      <div className="text-sm font-semibold text-tmgl-green-950">
                        Main Tournament · DAC&amp;GC
                      </div>
                      <div className="text-xs text-tmgl-charcoal-500">Round 2 · Stroke Play</div>
                    </div>
                  </div>
                  <span className="rounded-pill bg-tmgl-green-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-tmgl-green-700">
                    Live
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-[2rem_1fr_auto_auto] gap-x-3 px-1 text-[11px] font-semibold uppercase tracking-wider text-tmgl-charcoal-400">
                  <span>#</span>
                  <span>Player</span>
                  <span className="text-right">Net</span>
                  <span className="text-right">Gross</span>
                </div>

                <ul className="mt-1 divide-y divide-tmgl-charcoal-100">
                  {PREVIEW.map((row) => (
                    <li
                      key={row.pos}
                      className="grid grid-cols-[2rem_1fr_auto_auto] items-center gap-x-3 rounded-md py-2.5 text-sm tabular"
                    >
                      <span
                        className={
                          row.pos === 1
                            ? 'flex h-5 w-5 items-center justify-center rounded-full bg-tmgl-gold text-[11px] font-bold text-tmgl-green-950'
                            : 'text-tmgl-charcoal-400'
                        }
                      >
                        {row.pos}
                      </span>
                      <span className="font-medium text-tmgl-charcoal-800">{row.name}</span>
                      <span className="text-right font-semibold text-tmgl-green-700">
                        {row.toPar}
                      </span>
                      <span className="text-right text-tmgl-charcoal-500">{row.gross}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex items-center justify-between rounded-card bg-tmgl-charcoal-50 px-3.5 py-2.5">
                  <span className="text-xs text-tmgl-charcoal-500">
                    5 of 13 players through 9 holes
                  </span>
                  <span className="text-xs font-semibold text-tmgl-green-700">Auto-synced</span>
                </div>
              </div>

              <p className="mt-3 text-center text-xs text-tmgl-charcoal-400">
                Interface preview — sample standings
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Formats strip */}
      <section className="border-b border-tmgl-charcoal-200 bg-tmgl-green-950">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6">
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-sm sm:gap-x-8">
            <span className="font-medium uppercase tracking-[0.18em] text-tmgl-gold-400 text-xs">
              Formats
            </span>
            {FORMATS.map((format) => (
              <span key={format} className="text-tmgl-charcoal-200">
                {format}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
              What you get
            </span>
            <h2 className="mt-3 font-display text-display-lg text-tmgl-green-950">
              Everything a league actually needs
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-tmgl-charcoal-600">
              No dashboards you will never open. Every screen maps to a job the committee
              already does on paper.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="group rounded-card border border-tmgl-charcoal-200 bg-white p-6 transition-all duration-300 hover:-translate-y-0.5 hover:border-tmgl-green-300 hover:shadow-card-hover"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-tmgl-green-50 text-tmgl-green-700 transition-colors group-hover:bg-tmgl-green-800 group-hover:text-white">
                  <Icon className="h-5 w-5" />
                </span>
                <h3 className="mt-5 font-display text-lg font-semibold text-tmgl-green-950">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-tmgl-charcoal-600">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-y border-tmgl-charcoal-200 bg-white py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="max-w-2xl">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-gold-600">
              How it works
            </span>
            <h2 className="mt-3 font-display text-display-lg text-tmgl-green-950">
              Three steps from tee to standings
            </h2>
          </div>

          <ol className="mt-12 grid gap-10 sm:grid-cols-3">
            {STEPS.map(({ step, title, desc }) => (
              <li key={step} className="relative">
                <span className="font-display text-5xl font-semibold text-tmgl-green-100">
                  {step}
                </span>
                <div className="mt-4 h-px w-12 bg-tmgl-gold" />
                <h3 className="mt-4 font-display text-xl font-semibold text-tmgl-green-950">
                  {title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-tmgl-charcoal-600">{desc}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-tmgl-green-950 py-16 sm:py-20 lg:py-24">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 text-center">
          <h2 className="font-display text-display-lg text-white">
            Set up your next event tonight
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-tmgl-charcoal-300">
            Create the tournament, assign courses and tee times, and send players the link.
            The scoring handles the rest.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Button variant="gold" size="lg" onClick={() => navigate('/login')}>
              Sign in
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              onClick={() => navigate('/tournaments')}
            >
              Browse tournaments
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
