import { useCallback, useEffect, useState } from 'react';
import { BackLink } from '@/components/common/BackLink';
import { Camera, Image as ImageIcon, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/context/ToastContext';
import { canManageLeague } from '@/lib/roleGuards';
import { getGalleries, getGalleryImages, uploadGalleryImage, deleteGalleryImage, createGallery } from '@/lib/gallery';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import type { Gallery, GalleryImage } from '@/lib/gallery';

export function GalleryPage() {
  const { user, profile } = useAuth();
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isManager = canManageLeague(profile?.role);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await getGalleries();
    if (result.error) setError(result.error);
    else if (result.data) setGalleries(result.data);
    setLoading(false);
  }, [user]);

  useEffect(() => { void loadData(); }, [loadData]);

  const loadImages = useCallback(async (galleryId: string) => {
    const result = await getGalleryImages(galleryId);
    if (result.error) setError(result.error);
    else setImages(result.data ?? []);
  }, []);

  useEffect(() => {
    if (selectedGallery) void loadImages(selectedGallery.id);
  }, [selectedGallery, loadImages]);

  const handleCreateGallery = async () => {
    if (!user || !newTitle.trim()) return;
    setError(null);
    const result = await createGallery({ title: newTitle.trim(), created_by: profile?.id ?? user.id });
    if (result.error || !result.data) {
      setError(result.error ?? 'Unable to create the gallery.');
      return;
    }
    setGalleries((previous) => [result.data as Gallery, ...previous]);
    setNewTitle('');
    setShowCreate(false);
    toast.success('Gallery created.');
  };

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedGallery || !event.target.files?.length) return;
    const file = event.target.files[0];
    setUploading(true);
    setError(null);
    const result = await uploadGalleryImage(selectedGallery.id, file, profile?.id ?? user.id);
    if (result.error || !result.data) {
      setError(result.error ?? 'The photo was not saved.');
    } else {
      await loadImages(result.data.gallery_id);
      toast.success('Photo uploaded.');
    }
    setUploading(false);
    event.target.value = '';
  };

  const handleDeleteImage = async (image: GalleryImage) => {
    const result = await deleteGalleryImage(image.id, image.image_url);
    if (result.error) {
      setError(result.error);
      return;
    }
    setImages((previous) => previous.filter((entry) => entry.id !== image.id));
    toast.success('Photo removed.');
  };

  if (loading) return <LoadingState message="Loading gallery..." />;

  return (
    <Container className="py-8">
      <BackLink fallbackTo="/" label="Back" />
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-tmgl-charcoal-950">Gallery</h1>
          <p className="mt-1 text-tmgl-charcoal-500">Tournament highlights and memorable moments</p>
        </div>
        {isManager && <Button variant="gold" onClick={() => setShowCreate((open) => !open)}><Plus className="mr-2 h-4 w-4" /> New Gallery</Button>}
      </div>

      {error && <div role="alert" className="mb-6 flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />{error}</div>}

      {showCreate && isManager && <Card className="mb-6"><CardContent className="p-4"><div className="flex flex-col gap-3 sm:flex-row"><label htmlFor="gallery-title" className="sr-only">Gallery title</label><input id="gallery-title" type="text" placeholder="Gallery title" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} className="min-h-[44px] flex-1 rounded-lg border border-tmgl-charcoal-300 px-3 py-2 text-sm focus:border-tmgl-gold-500 focus:outline-none focus:ring-2 focus:ring-tmgl-gold-500" /><Button variant="primary" onClick={() => void handleCreateGallery()} disabled={!newTitle.trim()}>Create</Button><Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button></div></CardContent></Card>}

      {selectedGallery ? <div>
        <button onClick={() => { setSelectedGallery(null); setImages([]); }} className="mb-4 text-sm text-tmgl-gold-700 hover:underline">&larr; Back to galleries</button>
        <h2 className="mb-4 text-xl font-bold text-tmgl-charcoal-950">{selectedGallery.title}</h2>
        {isManager && <label className="mb-4 inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg bg-tmgl-charcoal-950 px-4 py-2 text-sm text-white hover:bg-tmgl-charcoal-800"><Camera className="h-4 w-4" />{uploading ? 'Uploading...' : 'Upload Photo'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void handleUpload(event)} className="hidden" disabled={uploading} /></label>}
        {images.length === 0 ? <EmptyState icon={ImageIcon} title="No photos yet" description="Upload a photo to this gallery." /> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{images.map((image) => <div key={image.id} className="group relative"><img src={image.image_url} alt={image.caption ?? selectedGallery.title} className="aspect-square w-full rounded-xl object-cover" />{isManager && <button type="button" onClick={() => void handleDeleteImage(image)} className="absolute right-2 top-2 rounded-full bg-red-600 p-2 text-white opacity-100 transition-opacity hover:bg-red-700 sm:opacity-0 sm:group-hover:opacity-100" aria-label="Remove gallery photo"><Trash2 className="h-3 w-3" /></button>}{image.caption && <p className="mt-1 truncate text-xs text-tmgl-charcoal-500">{image.caption}</p>}</div>)}</div>}
      </div> : galleries.length === 0 ? <EmptyState icon={Camera} title="No galleries yet" description={isManager ? 'Create a gallery to start uploading photos.' : 'Galleries will appear after events.'} /> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">{galleries.map((gallery) => <div key={gallery.id} role="button" tabIndex={0} onClick={() => setSelectedGallery(gallery)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setSelectedGallery(gallery); } }} className="text-left"><Card variant="hover" className="h-full cursor-pointer"><CardContent className="p-5"><h3 className="font-bold text-tmgl-charcoal-950">{gallery.title}</h3>{gallery.description && <p className="mt-1 text-sm text-tmgl-charcoal-500">{gallery.description}</p>}<p className="mt-2 text-xs text-tmgl-charcoal-400">{new Date(gallery.created_at).toLocaleDateString()}</p></CardContent></Card></div>)}</div>}
    </Container>
  );
}
