import { env } from '@/config/env';
import { supabase } from '@/lib/supabase';
import { deleteImage, uploadImage } from '@/lib/storage';
import { getErrorMessage, toUserFacingServiceError } from '@/lib/errors';
import type { ServiceResult } from '@/types/service';

export interface Gallery {
  id: string;
  title: string;
  description: string | null;
  tournament_id: string | null;
  created_by: string;
  image_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GalleryImage {
  id: string;
  gallery_id: string;
  image_url: string;
  url?: string | null;
  caption: string | null;
  uploaded_by: string;
  created_at: string;
}

type GalleryImageRow = Omit<GalleryImage, 'image_url' | 'url'> & { image_url: string | null; url?: string | null };

function pathFromPublicUrl(value: string, bucket: string): string | null {
  try {
    const url = new URL(value);
    const marker = `/object/public/${bucket}/`;
    const index = url.pathname.indexOf(marker);
    if (index >= 0) return decodeURIComponent(url.pathname.slice(index + marker.length));
  } catch {
    return null;
  }
  return null;
}

function normalizeImage(row: GalleryImageRow): GalleryImage | null {
  const imageUrl = row.image_url ?? row.url;
  if (!imageUrl) return null;
  return {
    id: row.id,
    gallery_id: row.gallery_id,
    image_url: imageUrl,
    url: row.url,
    caption: row.caption,
    uploaded_by: row.uploaded_by,
    created_at: row.created_at,
  };
}

export async function getGalleries(): Promise<ServiceResult<Gallery[]>> {
  const { data, error } = await supabase
    .from('galleries')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load galleries.') };
  return { data: (data ?? []) as Gallery[], error: null };
}

export async function getGalleryImages(galleryId: string): Promise<ServiceResult<GalleryImage[]>> {
  const { data, error } = await supabase
    .from('gallery_images')
    .select('id, gallery_id, image_url, caption, uploaded_by, created_at')
    .eq('gallery_id', galleryId)
    .order('created_at', { ascending: true });
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to load gallery photos.') };
  return { data: ((data ?? []) as unknown as GalleryImageRow[]).map(normalizeImage).filter((image): image is GalleryImage => image !== null), error: null };
}

export async function createGallery(gallery: {
  title: string;
  description?: string;
  tournament_id?: string | null;
  created_by: string;
}): Promise<ServiceResult<Gallery>> {
  if (!gallery.created_by) return { data: null, error: 'A gallery owner is required.' };
  const { data, error } = await supabase
    .from('galleries')
    .insert({
      title: gallery.title.trim(),
      description: gallery.description?.trim() || null,
      tournament_id: gallery.tournament_id ?? null,
      created_by: gallery.created_by,
    })
    .select()
    .single();
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to create the gallery.') };
  return { data: data as Gallery, error: null };
}

export async function uploadGalleryImage(
  galleryId: string,
  image: File | string,
  uploadedBy: string,
  caption: string | null = null
): Promise<ServiceResult<GalleryImage>> {
  if (!uploadedBy) return { data: null, error: 'A gallery owner is required.' };
  let imageUrl: string;
  let uploadedPath: string | null = null;
  if (typeof image === 'string') {
    imageUrl = image;
  } else {
    const uploadResult = await uploadImage(image, env.galleryStorageBucket, `gallery/${galleryId}`);
    if (uploadResult.error || !uploadResult.data) {
      return { data: null, error: uploadResult.error ?? 'Unable to upload the gallery photo.' };
    }
    imageUrl = uploadResult.data;
    uploadedPath = pathFromPublicUrl(imageUrl, env.galleryStorageBucket);
  }

  const { data, error } = await supabase
    .from('gallery_images')
    .insert({
      gallery_id: galleryId,
      image_url: imageUrl,
      caption,
      uploaded_by: uploadedBy,
    })
    .select('id, gallery_id, image_url, caption, uploaded_by, created_at')
    .single();

  if (error || !data) {
    let cleanupError: string | null = null;
    if (uploadedPath) {
      const cleanup = await deleteImage(env.galleryStorageBucket, uploadedPath);
      cleanupError = cleanup.error;
    }
    const message = toUserFacingServiceError(error ?? new Error('Gallery photo record was not saved.'), 'Unable to save the gallery photo.');
    return { data: null, error: cleanupError ? `${message} ${cleanupError}` : message };
  }
  const normalized = normalizeImage(data as unknown as GalleryImageRow);
  if (!normalized) return { data: null, error: 'The gallery photo record did not include an image URL.' };
  return { data: normalized, error: null };
}

export async function deleteGalleryImage(imageId: string, imageUrl: string | null): Promise<ServiceResult<null>> {
  const { error } = await supabase.from('gallery_images').delete().eq('id', imageId);
  if (error) return { data: null, error: toUserFacingServiceError(error, 'Unable to remove the gallery photo.') };
  if (imageUrl) {
    const path = pathFromPublicUrl(imageUrl, env.galleryStorageBucket);
    if (path) {
      const cleanup = await deleteImage(env.galleryStorageBucket, path);
      if (cleanup.error) return { data: null, error: getErrorMessage(cleanup.error, 'The photo record was removed but its file could not be cleaned up.') };
    }
  }
  return { data: null, error: null };
}
