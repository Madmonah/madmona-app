-- ============================================================================
-- Madmona: Targeted Image Fix for Mismatched DEMO Listings
-- Date: 2026-05-06
--
-- Audited findings:
--   ❌ معدات صوت — uses identical photos as معدات ميديا (media production)
--      ROOT CAUSE: category slug contains "media" so SQL CASE matched MEDIA
--      branch first before SOUND branch.
--
--   ⚠️ مكتب خاص #1 — uses photo-1497366754035 (the generic fallback that was
--      previously used everywhere). Could be more specific.
--
--   ⚠️ مولدات كهرباء — uses generic tools/workshop photos. Acceptable but not
--      specific enough — replacing with actual generator/industrial photos.
--
-- This SQL uses EXACT name_ar match (no pattern matching) to avoid any
-- collision with parent slug paths.
-- ============================================================================

-- ============================================================================
-- FIX 1: معدات صوت (Sound Equipment)
-- ============================================================================
-- Replace media-production photos with actual sound equipment photos:
--   #1 → professional microphone
--   #2 → mixer/audio console
--   #3 → studio speakers

UPDATE listing_photos
SET url = CASE (RIGHT(l.slug, 1))
  WHEN '1' THEN 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80'
  WHEN '2' THEN 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80'
  ELSE 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'
END
FROM listings l, categories c
WHERE listing_photos.listing_id = l.id
  AND l.category_id = c.id
  AND c.name_ar = 'معدات صوت'
  AND l.title LIKE 'DEMO%'
  AND listing_photos.is_primary = TRUE;

-- ============================================================================
-- FIX 2: مكتب خاص (Private Office)
-- ============================================================================
-- Replace the generic fallback office (#1) and meeting room (#3) with photos
-- that are clearly "private offices" — single desk, executive chair, etc.

UPDATE listing_photos
SET url = CASE (RIGHT(l.slug, 1))
  WHEN '1' THEN 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80'
  WHEN '2' THEN 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80'
  ELSE 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80'
END
FROM listings l, categories c
WHERE listing_photos.listing_id = l.id
  AND l.category_id = c.id
  AND c.name_ar = 'مكتب خاص'
  AND l.title LIKE 'DEMO%'
  AND listing_photos.is_primary = TRUE;

-- ============================================================================
-- FIX 3: مولدات كهرباء (Electric Generators)
-- ============================================================================
-- Replace generic tool photos with actual generator/power equipment photos:
--   #1 → portable generator
--   #2 → industrial generator
--   #3 → power station/electrical panel

UPDATE listing_photos
SET url = CASE (RIGHT(l.slug, 1))
  WHEN '1' THEN 'https://images.unsplash.com/photo-1620283085439-39620a1e21c4?w=800&q=80'
  WHEN '2' THEN 'https://images.unsplash.com/photo-1473073805956-f4cb18d8a3a4?w=800&q=80'
  ELSE 'https://images.unsplash.com/photo-1581094488379-6c0eb02f4a3a?w=800&q=80'
END
FROM listings l, categories c
WHERE listing_photos.listing_id = l.id
  AND l.category_id = c.id
  AND c.name_ar = 'مولدات كهرباء'
  AND l.title LIKE 'DEMO%'
  AND listing_photos.is_primary = TRUE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  c.name_ar AS category,
  l.title,
  RIGHT(lp.url, 50) AS image_id
FROM listing_photos lp
JOIN listings l ON l.id = lp.listing_id
JOIN categories c ON c.id = l.category_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE
  AND c.name_ar IN ('معدات صوت', 'مكتب خاص', 'مولدات كهرباء')
ORDER BY c.name_ar, l.title;
