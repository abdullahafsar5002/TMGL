import { Camera, Image } from 'lucide-react';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { EmptyState } from '@/components/common/EmptyState';

export function GalleryPage() {
  return (
    <Container className="py-12">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-tmgl-charcoal-900 mb-2">Gallery</h1>
        <p className="text-tmgl-charcoal-600 mb-8">Tournament highlights and memorable moments</p>

        <EmptyState
          icon={Camera}
          title="Gallery coming soon"
          description="Tournament photos and highlights will be available here after upcoming events."
        />

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="opacity-40">
              <CardContent className="p-4 flex flex-col items-center justify-center aspect-square">
                <Image className="w-8 h-8 text-tmgl-charcoal-300 mb-2" />
                <p className="text-xs text-tmgl-charcoal-400">Coming soon</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </Container>
  );
}
