import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { Container } from '@/components/common/Container';

export function NotFoundPage() {
  return (
    <Container size="sm" className="flex min-h-[70vh] flex-col items-center justify-center py-12 text-center">
      <img src="/logo-mark.svg" alt="" className="mb-6 h-14 w-14 opacity-60" />
      <p className="font-display text-display-2xl text-tmgl-green-800">404</p>
      <h1 className="mt-2 font-display text-display-md text-tmgl-charcoal-950">Page not found</h1>
      <p className="mx-auto mt-3 max-w-sm text-sm text-tmgl-charcoal-600">
        The page you are looking for does not exist, or it has moved.
      </p>
      <Link to="/" className="mt-7">
        <Button variant="primary" className="gap-2">
          <Home className="h-4 w-4" />
          Back to home
        </Button>
      </Link>
    </Container>
  );
}
