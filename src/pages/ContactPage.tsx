import { useState } from 'react';
import { Mail, MapPin, Phone, Send } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';

export function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <Container className="py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-tmgl-charcoal-900 mb-2">Contact Us</h1>
        <p className="text-tmgl-charcoal-600 mb-8">Get in touch with the TMGL team</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Contact Info */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h2 className="text-lg font-semibold text-tmgl-charcoal-900 mb-4">League Information</h2>
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tmgl-green-100 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-tmgl-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">Email</p>
                      <p className="text-sm text-tmgl-charcoal-600">info@tmgl.pk</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tmgl-green-100 flex items-center justify-center">
                      <Phone className="w-5 h-5 text-tmgl-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">Phone</p>
                      <p className="text-sm text-tmgl-charcoal-600">+92 300 1234567</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-tmgl-green-100 flex items-center justify-center">
                      <MapPin className="w-5 h-5 text-tmgl-green-700" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-tmgl-charcoal-900">Location</p>
                      <p className="text-sm text-tmgl-charcoal-600">Pakistan</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <Card>
            <CardContent className="p-6">
              {submitted ? (
                <div className="text-center py-8">
                  <div className="w-12 h-12 rounded-full bg-tmgl-green-100 flex items-center justify-center mx-auto mb-4">
                    <Send className="w-6 h-6 text-tmgl-green-700" />
                  </div>
                  <h3 className="text-lg font-semibold text-tmgl-charcoal-900">Message Sent!</h3>
                  <p className="text-sm text-tmgl-charcoal-600 mt-2">We'll get back to you shortly.</p>
                  <Button variant="outline" className="mt-4" onClick={() => { setSubmitted(false); setForm({ name: '', email: '', subject: '', message: '' }); }}>
                    Send Another
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <h2 className="text-lg font-semibold text-tmgl-charcoal-900">Send a Message</h2>
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
                  <Button type="submit" className="w-full bg-tmgl-green-800 hover:bg-tmgl-green-700 text-white">
                    <Send className="w-4 h-4 mr-2" />
                    Send Message
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
