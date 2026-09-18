import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockUpload = vi.fn().mockResolvedValue({ error: null });
const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/img.jpg' } });
const mockRemove = vi.fn().mockResolvedValue({ error: null });

vi.mock('@/lib/supabase', () => ({
  supabase: {
    storage: {
      from: vi.fn(() => ({
        upload: mockUpload,
        getPublicUrl: mockGetPublicUrl,
        remove: mockRemove,
      })),
    },
  },
}));

import { uploadImage, deleteImage } from './storage';

function makeFile(name: string, type: string, size: number): File {
  const buffer = new ArrayBuffer(size);
  return new File([buffer], name, { type });
}

describe('Storage — Image Upload Utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('uploadImage — file validation', () => {
    it('rejects file with invalid type', async () => {
      const file = makeFile('doc.pdf', 'application/pdf', 1000);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBe('Only JPG, PNG, and WebP images are allowed.');
      expect(result.data).toBeNull();
    });

    it('accepts JPEG file', async () => {
      const file = makeFile('photo.jpg', 'image/jpeg', 1000);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBeNull();
      expect(result.data).toBe('https://example.com/img.jpg');
    });

    it('accepts PNG file', async () => {
      const file = makeFile('photo.png', 'image/png', 1000);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBeNull();
      expect(result.data).toBe('https://example.com/img.jpg');
    });

    it('accepts WebP file', async () => {
      const file = makeFile('photo.webp', 'image/webp', 1000);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBeNull();
      expect(result.data).toBe('https://example.com/img.jpg');
    });

    it('rejects file exceeding 5 MB', async () => {
      const file = makeFile('huge.jpg', 'image/jpeg', 6 * 1024 * 1024);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBe('Image must be 5 MB or smaller.');
      expect(result.data).toBeNull();
    });

    it('accepts file exactly at 5 MB limit', async () => {
      const file = makeFile('limit.jpg', 'image/jpeg', 5 * 1024 * 1024);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBeNull();
      expect(result.data).toBe('https://example.com/img.jpg');
    });

    it('rejects GIF files', async () => {
      const file = makeFile('anim.gif', 'image/gif', 1000);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBe('Only JPG, PNG, and WebP images are allowed.');
    });

    it('rejects SVG files', async () => {
      const file = makeFile('icon.svg', 'image/svg+xml', 1000);
      const result = await uploadImage(file, 'avatars', 'profiles');
      expect(result.error).toBe('Only JPG, PNG, and WebP images are allowed.');
    });
  });

  describe('uploadImage — path generation', () => {
    it('generates path with correct prefix', async () => {
      const file = makeFile('photo.jpg', 'image/jpeg', 1000);
      await uploadImage(file, 'avatars', 'profiles');

      expect(mockUpload).toHaveBeenCalledOnce();
      const calledPath = mockUpload.mock.calls[0][0] as string;
      expect(calledPath).toMatch(/^profiles\/\d+-[a-z0-9]+\.jpg$/);
    });

    it('preserves file extension', async () => {
      const file = makeFile('photo.png', 'image/png', 1000);
      await uploadImage(file, 'bucket', 'path');

      const calledPath = mockUpload.mock.calls[0][0] as string;
      expect(calledPath).toMatch(/\.png$/);
    });
  });

  describe('uploadImage — supabase interaction', () => {
    it('returns public URL on success', async () => {
      const file = makeFile('photo.jpg', 'image/jpeg', 1000);
      const result = await uploadImage(file, 'bucket', 'path');
      expect(result.data).toBe('https://example.com/img.jpg');
      expect(result.error).toBeNull();
    });

    it('returns error when upload fails', async () => {
      const errorMsg = 'Storage quota exceeded';
      mockUpload.mockResolvedValueOnce({ error: { message: errorMsg } });

      const file = makeFile('photo.jpg', 'image/jpeg', 1000);
      const result = await uploadImage(file, 'bucket', 'path');
      expect(result.error).toBe(errorMsg);
      expect(result.data).toBeNull();
    });
  });

  describe('deleteImage', () => {
    it('returns null error on success', async () => {
      const result = await deleteImage('bucket', 'path/file.jpg');
      expect(result.error).toBeNull();
    });

    it('returns error message on failure', async () => {
      const errorMsg = 'File not found';
      mockRemove.mockResolvedValueOnce({ error: { message: errorMsg } });

      const result = await deleteImage('bucket', 'missing.jpg');
      expect(result.error).toBe(errorMsg);
    });
  });
});
