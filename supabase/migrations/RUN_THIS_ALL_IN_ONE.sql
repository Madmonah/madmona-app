-- ============================================================================
-- Madmona — All Required SQL in One File
-- Run this ONCE in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
-- ============================================================================

-- 1. Site settings table (idempotent — safe to re-run)
CREATE TABLE IF NOT EXISTS site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id) ON DELETE SET NULL
);

-- 2. Insert default values for ALL 8 images
INSERT INTO site_settings (key, value)
VALUES
  ('hero_image_url', 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=1600&q=85&auto=format&fit=crop'),
  ('marketplace_image_url', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85&auto=format&fit=crop'),
  ('spaces_image_url', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=85&auto=format&fit=crop'),
  ('category_spaces_image_url', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop'),
  ('category_properties_image_url', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format&fit=crop'),
  ('category_vehicles_image_url', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80&auto=format&fit=crop'),
  ('category_equipment_image_url', 'https://images.unsplash.com/photo-1533422902779-aff35862e462?w=600&q=80&auto=format&fit=crop'),
  ('category_events_image_url', 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&q=80&auto=format&fit=crop')
ON CONFLICT (key) DO NOTHING;

-- 3. RLS policies for site_settings
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "site_settings_public_read" ON site_settings;
CREATE POLICY "site_settings_public_read" ON site_settings FOR SELECT USING (true);

DROP POLICY IF EXISTS "site_settings_admin_write" ON site_settings;
CREATE POLICY "site_settings_admin_write" ON site_settings FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 4. Storage bucket for site assets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('site-assets', 'site-assets', true, 10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/avif']::text[])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "site_assets_public_read" ON storage.objects;
CREATE POLICY "site_assets_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'site-assets');

DROP POLICY IF EXISTS "site_assets_admin_write" ON storage.objects;
CREATE POLICY "site_assets_admin_write" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'))
  WITH CHECK (bucket_id = 'site-assets' AND EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin'));

-- 5. Verification — should show 8 rows
SELECT key, LEFT(value, 50) AS preview FROM site_settings ORDER BY key;
