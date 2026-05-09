-- ============================================================================
-- Site Settings (key/value)
-- ============================================================================
-- Stores dynamic site-wide content the admin can edit:
--   - hero_image_url
--   - hero_title (future)
--   - announcement_banner (future)
--   - etc.
--
-- Run once in Supabase SQL Editor.
-- ============================================================================

CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- Default seed values
INSERT INTO site_settings (key, value)
VALUES
  ('hero_image_url', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop'),
  ('marketplace_image_url', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85&auto=format&fit=crop'),
  ('spaces_image_url', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=85&auto=format&fit=crop')
ON CONFLICT (key) DO NOTHING;

-- ============================================================================
-- RLS: public can read, only admins can write
-- ============================================================================

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read"
  ON site_settings
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write"
  ON site_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );

-- ============================================================================
-- Storage bucket for site assets (hero images, banners, etc.)
-- ============================================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'site-assets',
  'site-assets',
  true,
  10485760,  -- 10MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[]
)
ON CONFLICT (id) DO NOTHING;

-- Anyone can read site assets
DROP POLICY IF EXISTS "site_assets_public_read" ON storage.objects;
CREATE POLICY "site_assets_public_read"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'site-assets');

-- Only admins can upload/update/delete
DROP POLICY IF EXISTS "site_assets_admin_write" ON storage.objects;
CREATE POLICY "site_assets_admin_write"
  ON storage.objects
  FOR ALL
  TO authenticated
  USING (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    bucket_id = 'site-assets'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
    )
  );
