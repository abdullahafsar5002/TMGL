import { useState, useEffect, useCallback } from 'react';
import { Camera, Image, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Container } from '@/components/common/Container';
import { Card, CardContent } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { LoadingState } from '@/components/common/LoadingState';
import { getGalleries, getGalleryImages, uploadGalleryImage, deleteGalleryImage, createGallery } from '@/lib/gallery';
import { supabase } from '@/lib/supabase';
import type { Gallery, GalleryImage } from '@/lib/gallery';
import type { Profile } from '@/types/database';

export function GalleryPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedGallery, setSelectedGallery] = useState<Gallery | null>(null);
  const [images, setImages] = useState<GalleryImage[]>([]);
  const [isManager, setIsManager] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const loadData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();
      const role = (profile as Profile | null)?.role;
      setIsManager(role === 'super_admin' || role === 'league_manager');

      const result = await getGalleries();
      if (result.data) setGalleries(result.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { loadData(); }, [loadData]);

  const loadImages = useCallback(async (galleryId: string) => {
    const result = await getGalleryImages(galleryId);
    if (result.data) setImages(result.data);
  }, []);

  useEffect(() => {
    if (selectedGallery) loadImages(selectedGallery.id);
  }, [selectedGallery, loadImages]);

  const handleCreateGallery = async () => {
    if (!user || !newTitle.trim()) return;
    const result = await createGallery({ title: newTitle.trim(), created_by: user.id });
    if (result.data) {
      setGalleries(prev => [result.data!, ...prev]);
      setNewTitle('');
      setShowCreate(false);
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user || !selectedGallery || !e.target.files?.length) return;
    setUploading(true);
    const file = e.target.files[0];
    const ext = file.name.split('.').pop();
    const path = `gallery/${selectedGallery.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('team-logos')
      .upload(path, file, { contentType: file.type });

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('team-logos')
        .getPublicUrl(path);
      await uploadGalleryImage(selectedGallery.id, urlData.publicUrl, null, user.id);
      await loadImages(selectedGallery.id);
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleDeleteImage = async (imageId: string) => {
    await deleteGalleryImage(imageId);
    setImages(prev => prev.filter(i => i.id !== imageId));
  };

  if (loading) return <LoadingState message="Loading gallery..." />;

  return (
    <Container className="py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gallery</h1>
          <p className="text-gray-500 mt-1">Tournament highlights and memorable moments</p>
        </div>
        {isManager && (
          <Button variant="primary" onClick={() => setShowCreate(!showCreate)}>
            <Plus className="h-4 w-4 mr-2" /> New Gallery
          </Button>
        )}
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex gap-3">
              <input
                type="text"
                placeholder="Gallery title"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-green-700"
              />
              <Button variant="primary" onClick={handleCreateGallery} disabled={!newTitle.trim()}>Create</Button>
              <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedGallery ? (
        <div>
          <button onClick={() => { setSelectedGallery(null); setImages([]); }} className="text-sm text-green-700 hover:underline mb-4">
            &larr; Back to galleries
          </button>
          <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedGallery.title}</h2>

          {isManager && (
            <label className="inline-flex items-center gap-2 px-4 py-2 bg-green-800 text-white rounded-lg cursor-pointer hover:bg-green-700 text-sm mb-4">
              <Camera className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload Photo'}
              <input type="file" accept="image/*" onChange={handleUpload} className="hidden" disabled={uploading} />
            </label>
          )}

          {images.length === 0 ? (
            <EmptyState icon={Image} title="No photos yet" description="Upload photos to this gallery." />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {images.map(img => (
                <div key={img.id} className="relative group">
                  <img src={img.url} alt={img.caption ?? ''} className="w-full aspect-square object-cover rounded-xl" />
                  {isManager && (
                    <button
                      onClick={() => handleDeleteImage(img.id)}
                      className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                  {img.caption && <p className="text-xs text-gray-500 mt-1 truncate">{img.caption}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <>
          {galleries.length === 0 ? (
            <EmptyState
              icon={Camera}
              title="No galleries yet"
              description={isManager ? "Create a gallery to start uploading photos." : "Galleries will appear after events."}
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {galleries.map(gallery => (
                <Card key={gallery.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedGallery(gallery)}>
                  <CardContent className="p-5">
                    <h3 className="font-bold text-gray-900">{gallery.title}</h3>
                    {gallery.description && <p className="text-sm text-gray-500 mt-1">{gallery.description}</p>}
                    <p className="text-xs text-gray-400 mt-2">{new Date(gallery.created_at).toLocaleDateString()}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Container>
  );
}
