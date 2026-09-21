import { Trophy, Users, Zap } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Link } from 'react-router-dom';
import { Button } from '@/components/common/Button';

export function AboutPage() {
  return (
    <Container className="py-12">
      <div className="max-w-4xl mx-auto">
        {/* Hero */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-tmgl-charcoal-900">Toruk Maktu Golf League</h1>
          <p className="text-xl text-tmgl-green-700 mt-3 font-medium">Where Legends Are Forged</p>
          <p className="text-tmgl-charcoal-600 mt-4 max-w-2xl mx-auto">
            The premier competitive golf league in Pakistan, bringing together the finest golfers
            for thrilling tournaments, rigorous competition, and the pursuit of excellence on the green.
          </p>
        </div>

        {/* Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { icon: Trophy, title: 'Excellence', desc: 'We uphold the highest standards of competitive golf, ensuring every match is conducted with integrity and professionalism.' },
            { icon: Users, title: 'Community', desc: 'Building lasting connections among golfers through shared passion, sportsmanship, and friendly competition.' },
            { icon: Zap, title: 'Innovation', desc: 'Leveraging modern technology to enhance the golf experience — live scoring, real-time leaderboards, and comprehensive analytics.' },
          ].map((item) => (
            <Card key={item.title}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                  <item.icon className="w-6 h-6 text-tmgl-green-700" />
                </div>
                <h3 className="text-lg font-semibold text-tmgl-charcoal-900 mb-2">{item.title}</h3>
                <p className="text-sm text-tmgl-charcoal-600">{item.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Story */}
        <Card>
          <CardContent className="p-8">
            <h2 className="text-2xl font-bold text-tmgl-charcoal-900 mb-4">Our Story</h2>
            <p className="text-tmgl-charcoal-600 leading-relaxed mb-4">
              The Toruk Maktu Golf League was founded with a singular vision: to bring the spirit of competitive
              golf to Pakistan and create a platform where golfers of all skill levels can compete, improve,
              and celebrate the beautiful game. Named after the legendary Toruk — a symbol of power and mastery
              — our league embodies the pursuit of greatness.
            </p>
            <p className="text-tmgl-charcoal-600 leading-relaxed">
              From local friendly matches to high-stakes tournament play, TMGL provides the infrastructure,
              community, and technology to make every round count. Whether you're a seasoned pro or picking
              up a club for the first time, TMGL welcomes you to the fairway.
            </p>
          </CardContent>
        </Card>

        {/* CTA */}
        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold text-tmgl-charcoal-900 mb-4">Ready to Join?</h2>
          <p className="text-tmgl-charcoal-600 mb-6">Become part of the most exciting golf league in Pakistan.</p>
          <Link to="/register">
            <Button className="bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white px-8 py-3 text-lg">
              Get Started
            </Button>
          </Link>
        </div>
      </div>
    </Container>
  );
}
