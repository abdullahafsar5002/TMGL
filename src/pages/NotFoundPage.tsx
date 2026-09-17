import { Link } from 'react-router-dom';
import { Trophy, Home } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Container } from '@/components/common/Container';

export function NotFoundPage() {
  return (
    <Container size="sm" className="min-h-[70vh] flex flex-col items-center justify-center py-12 text-center space-y-6">
      <div className="w-16 h-16 rounded-2xl bg-tmgl-green-900 flex items-center justify-center mx-auto">
        <Trophy className="w-8 h-8 text-tmgl-gold opacity-50" />
      </div>
      <div className="space-y-2">
        <h1 className="text-5xl font-extrabold text-tmgl-charcoal-800">404</h1>
        <p className="text-lg font-semibold text-tmgl-charcoal-700">Page not found</p>
        <p className="text-sm text-tmgl-charcoal-500">
          The page you're looking for doesn't exist or has been moved.
        </p>
      </div>
      <Link to="/">
        <Button variant="primary" className="gap-2 bg-tmgl-green-800 hover:bg-tmgl-green-700">
          <Home className="w-4 h-4" />
          Back to home
        </Button>
      </Link>
    </Container>
  );
}
