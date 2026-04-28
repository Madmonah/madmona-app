-- ================================================
-- مضمونة (Madmona) - Space Images Storage Bucket
-- ================================================
-- Creates a public bucket where Mohamed can upload real photos
-- of each space. The Next.js app will read from this bucket
-- using URLs like:
--   https://mjhflxpxunwycbiquoig.supabase.co/storage/v1/object/public/space-images/<filename>
--
-- File naming convention (recommended):
--   indoor-coworking-1.jpg, indoor-coworking-2.jpg, ...
--   outdoor-garden-1.jpg, ...
--   private-office-1.jpg, ...
--   meeting-room-1.jpg, ...
-- ================================================

-- 1. Create the bucket (public read, authenticated write)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'space-images',
  'space-images',
  true,                              -- public read
  10 * 1024 * 1024,                  -- 10 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Public read policy (anyone can view images)
DROP POLICY IF EXISTS "Public can read space images" ON storage.objects;
CREATE POLICY "Public can read space images"
  ON storage.objects
  FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'space-images');

-- 3. Authenticated upload policy (only logged-in admins can upload)
DROP POLICY IF EXISTS "Authenticated can upload space images" ON storage.objects;
CREATE POLICY "Authenticated can upload space images"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'space-images');

DROP POLICY IF EXISTS "Authenticated can update space images" ON storage.objects;
CREATE POLICY "Authenticated can update space images"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'space-images')
  WITH CHECK (bucket_id = 'space-images');

DROP POLICY IF EXISTS "Authenticated can delete space images" ON storage.objects;
CREATE POLICY "Authenticated can delete space images"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'space-images');

-- Verification
SELECT id, name, public, file_size_limit
FROM storage.buckets
WHERE id = 'space-images';
