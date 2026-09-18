-- Migration 0007: Supabase Storage setup for team logos
-- Run: supabase db push

-- 1. Create public bucket for team logos
INSERT INTO storage.buckets (id, name, public)
VALUES ('team-logos', 'team-logos', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Allow authenticated users to upload team logos
CREATE POLICY "Authenticated users can upload team logos"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'team-logos');

-- 3. Allow anyone to view team logos (public bucket)
CREATE POLICY "Public can view team logos"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'team-logos');

-- 4. Allow authenticated users to update their own uploads
CREATE POLICY "Authenticated users can update team logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'team-logos');

-- 5. Allow authenticated users to delete team logos
CREATE POLICY "Authenticated users can delete team logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'team-logos');
