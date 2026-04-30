-- ==========================================================================
-- Madmona — Storage setup + utility functions for Phase 1c
-- Run AFTER 20260430000004_seed_data.sql
-- Idempotent — safe to run multiple times.
-- ==========================================================================

-- ============================================================================
-- 1. Create the public bucket for listing photos
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'listing-photos',
  'listing-photos',
  true,
  5242880, -- 5 MB per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- ============================================================================
-- 2. RLS policies on storage.objects for listing-photos bucket
-- ============================================================================

DROP POLICY IF EXISTS "listing_photos_public_read" ON storage.objects;
CREATE POLICY "listing_photos_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'listing-photos');

DROP POLICY IF EXISTS "listing_photos_auth_insert" ON storage.objects;
CREATE POLICY "listing_photos_auth_insert"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'listing-photos'
    AND auth.role() = 'authenticated'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "listing_photos_owner_update" ON storage.objects;
CREATE POLICY "listing_photos_owner_update"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "listing_photos_owner_delete" ON storage.objects;
CREATE POLICY "listing_photos_owner_delete"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'listing-photos'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "listing_photos_admin_all" ON storage.objects;
CREATE POLICY "listing_photos_admin_all"
  ON storage.objects FOR ALL
  USING (bucket_id = 'listing-photos' AND public.is_admin())
  WITH CHECK (bucket_id = 'listing-photos' AND public.is_admin());

-- ============================================================================
-- 3. View count increment function (called from listing detail page)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.increment_view_count(listing_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE listings
  SET view_count = view_count + 1
  WHERE id = listing_id;
END;
$$;

-- Allow anyone (including anon) to call this
GRANT EXECUTE ON FUNCTION public.increment_view_count(UUID) TO anon, authenticated;

-- ============================================================================
-- DONE
-- ============================================================================

SELECT 'Storage + view count function ready' AS status;
