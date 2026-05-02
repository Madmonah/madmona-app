-- ============================================================================
-- Madmona — Delete OLD test listings
--
-- Removes 5 old test listings under Madmona that were created during
-- early development. These have title fields containing only addresses
-- (no service name) so they confuse customers.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
-- ============================================================================

-- The 5 old test listings to delete (all under Madmona supplier):
--   ٧ش الدكتور سليمان عزمي بجوار مدرسه مودرن سكول
--   ٧ ش سليمان عزمي بجوار الكلية الحربية
--   بجوار المطار وسور الكلية الحربية
--   في ارقي موقع بمصر الجديدة
--   في ارقي مناطق مصر الجديدة بجوار مترو شارع عمار بن ياسر

-- The 4 listings being KEPT (real Madmona services, all under Spaces):
--   مكتب مشترك (Hot Desk) - مضمونة كوويركينج     ✅
--   مكتب خاص لـ3 أفراد - مضمونة                  ✅
--   قاعة اجتماعات (8 أفراد) - مضمونة             ✅
--   جاردن للمناسبات (50 ضيف) - مضمونة             ✅

-- ============================================================================

-- 1. Delete pricing rules
DELETE FROM pricing_rules WHERE listing_id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- 2. Delete photos
DELETE FROM listing_photos WHERE listing_id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- 3. Delete attribute values (if any)
DELETE FROM listing_values WHERE listing_id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- 4. Delete bookings on these listings (if any) before deleting the listings
DELETE FROM marketplace_bookings WHERE listing_id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- 5. Delete favorites referencing these listings (if any)
DELETE FROM favorites WHERE listing_id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- 6. Delete reviews referencing these listings (if any)
DELETE FROM reviews WHERE listing_id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- 7. Delete the listings themselves
DELETE FROM listings WHERE id IN (
  'ee3a486e-74c7-44c9-9704-eb5bf306231c',
  '414d37f0-d493-4e50-bf99-9256b1eea0ce',
  'b2eaafca-c22c-4609-9908-51c9d11c47d0',
  'cf66d033-3681-4b4b-a3a8-84c8baad6d89',
  '922bd3b0-5d0e-4bc5-83ca-d6c0e04a986c'
);

-- ============================================================================
-- ✅ Verification — should show ONLY the 4 real Madmona Spaces listings
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
WHERE l.status = 'published'
ORDER BY c.display_order NULLS LAST, l.title;
