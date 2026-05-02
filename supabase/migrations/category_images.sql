-- ============================================================================
-- Add dynamic category images to site_settings
-- Run once in Supabase SQL Editor
-- ============================================================================

INSERT INTO site_settings (key, value)
VALUES
  ('category_spaces_image_url', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=600&q=80&auto=format&fit=crop'),
  ('category_properties_image_url', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format&fit=crop'),
  ('category_vehicles_image_url', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=600&q=80&auto=format&fit=crop'),
  ('category_equipment_image_url', 'https://images.unsplash.com/photo-1533422902779-aff35862e462?w=600&q=80&auto=format&fit=crop'),
  ('category_events_image_url', 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=600&q=80&auto=format&fit=crop')
ON CONFLICT (key) DO NOTHING;
