-- ============================================================================
-- Madmona — Delete Fake Seed Listings
--
-- Removes 8 demo listings that are NOT actually Madmona's services.
-- Keeps the 4 real Madmona listings (Spaces only).
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
-- ============================================================================

-- The 8 fake listings to delete:
-- a0000005 — شقة الساحل مارينا
-- a0000006 — استوديو مدينة نصر
-- a0000007 — شاليه الجونة
-- a0000008 — ميكروباص H1
-- a0000009 — مرسيدس S-Class
-- a0000010 — كاميرا Sony A7IV
-- a0000011 — DJ Sound System
-- a0000012 — مصور أفراح

-- The 4 listings being KEPT:
-- a0000001 — Madmona Hot Desk        ✅
-- a0000002 — Madmona Private Office  ✅
-- a0000003 — Meeting Room            ✅
-- a0000004 — Garden Event Space      ✅

-- ============================================================================

-- 1. Delete pricing rules for the 8 fake listings
DELETE FROM pricing_rules WHERE listing_id IN (
  'a0000005-0000-0000-0000-000000000005',
  'a0000006-0000-0000-0000-000000000006',
  'a0000007-0000-0000-0000-000000000007',
  'a0000008-0000-0000-0000-000000000008',
  'a0000009-0000-0000-0000-000000000009',
  'a0000010-0000-0000-0000-000000000010',
  'a0000011-0000-0000-0000-000000000011',
  'a0000012-0000-0000-0000-000000000012'
);

-- 2. Delete photos for the 8 fake listings
DELETE FROM listing_photos WHERE listing_id IN (
  'a0000005-0000-0000-0000-000000000005',
  'a0000006-0000-0000-0000-000000000006',
  'a0000007-0000-0000-0000-000000000007',
  'a0000008-0000-0000-0000-000000000008',
  'a0000009-0000-0000-0000-000000000009',
  'a0000010-0000-0000-0000-000000000010',
  'a0000011-0000-0000-0000-000000000011',
  'a0000012-0000-0000-0000-000000000012'
);

-- 3. Delete attribute values (if any exist) for the 8 fake listings
DELETE FROM listing_values WHERE listing_id IN (
  'a0000005-0000-0000-0000-000000000005',
  'a0000006-0000-0000-0000-000000000006',
  'a0000007-0000-0000-0000-000000000007',
  'a0000008-0000-0000-0000-000000000008',
  'a0000009-0000-0000-0000-000000000009',
  'a0000010-0000-0000-0000-000000000010',
  'a0000011-0000-0000-0000-000000000011',
  'a0000012-0000-0000-0000-000000000012'
);

-- 4. Delete the 8 fake listings themselves
DELETE FROM listings WHERE id IN (
  'a0000005-0000-0000-0000-000000000005',
  'a0000006-0000-0000-0000-000000000006',
  'a0000007-0000-0000-0000-000000000007',
  'a0000008-0000-0000-0000-000000000008',
  'a0000009-0000-0000-0000-000000000009',
  'a0000010-0000-0000-0000-000000000010',
  'a0000011-0000-0000-0000-000000000011',
  'a0000012-0000-0000-0000-000000000012'
);

-- ============================================================================
-- ✅ Verification — should show ONLY the 4 real Madmona listings
-- ============================================================================
SELECT
  l.title,
  c.name_ar AS category,
  l.city,
  l.district,
  l.status,
  (SELECT MIN(price) FROM pricing_rules WHERE listing_id = l.id) AS min_price,
  (SELECT COUNT(*) FROM listing_photos WHERE listing_id = l.id) AS photos_count
FROM listings l
LEFT JOIN categories c ON c.id = l.category_id
WHERE l.slug LIKE 'seed-%'
ORDER BY c.display_order, l.title;
