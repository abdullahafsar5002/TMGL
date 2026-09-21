import { supabase } from '@/lib/supabase';
import type { ServiceResult } from '@/types/service';

export interface Gallery {
  id: string;
  title: string;
  description: string | null;
  tournament_id: string | null;
  created_by: string;
  created_at: string;
}

export interface GalleryImage {
  id: string;
  gallery_id: string;
  url: string;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
}

export async function getGalleries(): Promise<ServiceResult<Gallery[]>> {
  const { data, error } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as Gallery[], error: null };
}

export async function getGalleryImages(galleryId: string): Promise<ServiceResult<GalleryImage[]>> {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('*')
    .eq('gallery_id', galleryId)
    .order('created_at', { ascending: true });
  if (error) return { data: null, error: error.message };
  return { data: (data ?? []) as GalleryImage[], error: null };
}

export async function createGallery(gallery: { title: string; description?: string; tournament_id?: string; created_by: string }): Promise<ServiceResult<Gallery>> {
  const { data, error } = await supabase
    .from('galleries')
    .insert({
      title: gallery.title,
      description: gallery.description ?? null,
      tournament_id: gallery.tournament_id ?? null,
      created_by: gallery.created_by,
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as Gallery, error: null };
}

export async function uploadGalleryImage(galleryId: string, url: string, caption: string | null, uploadedBy: string): Promise<ServiceResult<GalleryImage>> {
  const { data, error } = await supabase
    .from('gallery_images')
    .insert({
      gallery_id: galleryId,
      url,
      caption,
      uploaded_by: uploadedBy,
    })
    .select()
    .single();
  if (error) return { data: null, error: error.message };
  return { data: data as GalleryImage, error: null };
}

export async function deleteGalleryImage(id: string): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('gallery_images').delete().eq('id', id);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}
