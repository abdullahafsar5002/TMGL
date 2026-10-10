import { Trophy, Users, Zap } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';

const VALUES = [
  {
    icon: Trophy,
    title: 'Excellence',
    desc: 'The highest standards of competitive golf, so every match is played with integrity and professionalism.',
  },
  {
    icon: Users,
    title: 'Community',
    desc: 'Lasting connections between golfers through shared passion, sportsmanship, and friendly competition.',
  },
  {
    icon: Zap,
    title: 'Innovation',
    desc: 'Modern technology behind the game — live scoring, real-time leaderboards, and full-season analytics.',
  },
];

export function AboutPage() {
  return (
    <Container className="py-12 sm:py-16">
      <div className="mx-auto max-w-4xl">
        <header className="mb-14 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">
            About the league
          </p>
          <h1 className="mt-3 font-display text-display-xl text-tmgl-charcoal-950">
            Toruk Maktu Golf League
          </h1>
          <p className="mt-4 font-display text-display-md text-tmgl-green-700">
            Where legends are forged
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-base leading-relaxed text-tmgl-charcoal-600">
            Pakistan's competitive golf league — tournaments, rigorous match play, and the pursuit
            of excellence on the green.
          </p>
        </header>

        <section className="mb-14 grid grid-cols-1 gap-5 md:grid-cols-3">
          {VALUES.map((item) => (
            <article
              key={item.title}
              className="group rounded-card border border-tmgl-charcoal-200 bg-white p-6 text-center shadow-card transition-all hover:-translate-y-0.5 hover:border-tmgl-green-300 hover:shadow-card-hover"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-tmgl-green-50 transition-colors group-hover:bg-tmgl-green-800">
                <item.icon className="h-6 w-6 text-tmgl-green-700 transition-colors group-hover:text-tmgl-gold" />
              </div>
              <h2 className="mb-2 font-display text-lg font-semibold text-tmgl-charcoal-950">
                {item.title}
              </h2>
              <p className="text-sm leading-relaxed text-tmgl-charcoal-600">{item.desc}</p>
            </article>
          ))}
        </section>

        <section className="rounded-panel bg-tmgl-green-950 p-8 text-white shadow-panel sm:p-10">
          <h2 className="mb-5 font-display text-display-lg text-white">Our story</h2>
          <div className="space-y-4 text-base leading-relaxed text-tmgl-charcoal-300">
            <p>
              The Toruk Maktu Golf League was founded on a simple idea: bring competitive golf to
              Pakistan and give golfers of every level a place to compete, improve, and celebrate
              the game. Named after Toruk — a symbol of power and mastery — the league is built
              around the pursuit of greatness.
            </p>
            <p>
              From local friendly matches to high-stakes tournament play, TMGL supplies the
              infrastructure, community, and technology that make every round count. Whether you
              are a seasoned pro or picking up a club for the first time, there is a tee time
              waiting for you.
            </p>
          </div>
        </section>

        <section className="mt-14 text-center">
          <h2 className="font-display text-display-lg text-tmgl-charcoal-950">Ready to join?</h2>
          <p className="mx-auto mt-3 max-w-lg text-base text-tmgl-charcoal-600">
            Become part of the most exciting golf league in Pakistan.
          </p>
          <Link to="/register" className="mt-7 inline-block">
            <Button size="lg" className="bg-tmgl-green-800 px-9 text-white hover:bg-tmgl-green-700">
              Get started
            </Button>
          </Link>
        </section>
      </div>
    </Container>
  );
}
