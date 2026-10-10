import { useState } from 'react';
import { Mail, MapPin, Send, CheckCircle, Users } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { createNotification } from '@/lib/notifications';
import { supabase } from '@/lib/supabase';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError(null);

    const name = form.name.trim();
    const email = form.email.trim();
    const subject = form.subject.trim();
    const message = form.message.trim();
    if (!name || !email || !subject || !message) {
      setError('Please complete every field before sending your message.');
      setSending(false);
      return;
    }

    try {
      const { data: admins, error: adminsError } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['super_admin', 'league_manager'])
        .limit(5);

      if (adminsError) throw new Error(adminsError.message);
      if (!admins || admins.length === 0) throw new Error('No league contact is currently available.');

      const results = await Promise.all(admins.map((admin) => createNotification({
        recipient_id: admin.id,
        type: 'system',
        title: `Contact: ${subject}`,
        message: `From: ${name} (${email})\n\n${message}`,
      })));
      const failed = results.find((result) => result.error);
      if (failed?.error) throw new Error(failed.error);
      setSubmitted(true);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const resetForm = () => {
    setSubmitted(false);
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <Container className="py-12">
      <div className="max-w-4xl mx-auto">
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-tmgl-green-700">Get in touch</p>
        <h1 className="mb-3 font-display text-display-lg text-tmgl-charcoal-950">Contact us</h1>
        <p className="mb-10 max-w-xl text-base text-tmgl-charcoal-600">
          Send a message straight to the league team. Everything is handled inside TMGL — no
          external inbox, nothing to get lost.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="mb-4 font-display text-lg font-semibold text-tmgl-charcoal-950">How delivery works</h2>
                <div className="space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tmgl-green-100">
                      <Mail className="h-5 w-5 text-tmgl-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">Delivered in-app</p>
                      <p className="text-sm text-tmgl-charcoal-600">
                        Your message reaches league administrators directly — no public email
                        address to share or scrape.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tmgl-green-100">
                      <Users className="h-5 w-5 text-tmgl-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">Routed to the right people</p>
                      <p className="text-sm text-tmgl-charcoal-600">
                        Super admins and league managers are notified, so scoring, pairings, and
                        fee questions land where they belong.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-tmgl-green-100">
                      <MapPin className="h-5 w-5 text-tmgl-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">Coverage</p>
                      <p className="text-sm text-tmgl-charcoal-600">Pakistan</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6 text-tmgl-green-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Message Sent!</h3>
                  <p className="text-sm text-tmgl-charcoal-600 mt-2">We'll get back to you shortly.</p>
                  <Button variant="outline" className="mt-4" onClick={resetForm}>
                    Send Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="font-display text-lg font-semibold text-tmgl-charcoal-950">Send a message</h2>
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>
                  )}
                  <input
                    type="text"
                    placeholder="Your Name"
                    required
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                  />
                  <input
                    type="text"
                    placeholder="Subject"
                    required
                    value={form.subject}
                    onChange={(e) => setForm({ ...form, subject: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700"
                  />
                  <textarea
                    placeholder="Your Message"
                    required
                    rows={4}
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-tmgl-charcoal-200 focus:outline-none focus:ring-2 focus:ring-tmgl-green-700 resize-none"
                  />
                  <Button type="submit" className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white" disabled={sending}>
                    <Send className="w-4 h-4 mr-2" />
                    {sending ? 'Sending...' : 'Send Message'}
                  </Button>
                </form>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Container>
  );
}
