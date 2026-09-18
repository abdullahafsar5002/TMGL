/**
 * Supabase Storage helpers for image uploads.
 */

import { supabase } from '@/lib/supabase';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateFile(file: File): string | null {
  if (!ALLOWED_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, and WebP images are allowed.';
  }
  if (file.size > MAX_FILE_SIZE) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

function generatePath(originalName: string): string {
  const ext = originalName.split('.').pop()?.toLowerCase() ?? 'jpg';
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}.${ext}`;
}

export async function uploadImage(
  file: File,
  bucket: string,
  path: string
): Promise<{ data: string; error: null } | { data: null; error: string }> {
  const validationError = validateFile(file);
  if (validationError) return { data: null, error: validationError };

  const filePath = `${path}/${generatePath(file.name)}`;

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(filePath, file, { upsert: true });

  if (uploadError) return { data: null, error: uploadError.message };

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(filePath);

  return { data: urlData.publicUrl, error: null };
}

export async function deleteImage(
  bucket: string,
  path: string
): Promise<{ data: null; error: null } | { data: null; error: string }> {
  const { error } = await supabase.storage.from(bucket).remove([path]);
  if (error) return { data: null, error: error.message };
  return { data: null, error: null };
}
