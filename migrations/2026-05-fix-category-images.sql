-- ============================================================================
-- Madmona: Fix Main Category Images
-- Date: 2026-05-06
--
-- The homepage category cards were all showing the same generic office image
-- because categories.image_url was NULL for all main categories. This SQL
-- assigns a unique, themed Unsplash image to each main category.
-- ============================================================================

UPDATE categories
SET image_url = CASE
  -- 📷 MEDIA EQUIPMENT / معدات ميديا
  WHEN slug ILIKE '%media%' OR name_ar LIKE '%معدات ميديا%' OR name_ar LIKE '%ميديا%'
    THEN 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=1200&q=85&auto=format&fit=crop'

  -- 🏢 WORKSPACES / مساحات عمل
  WHEN slug ILIKE '%workspace%' OR slug ILIKE '%coworking%' OR name_ar LIKE '%مساحات عمل%' OR name_ar LIKE '%مساحة عمل%'
    THEN 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=85&auto=format&fit=crop'

  -- 🏠 PROPERTIES / عقارات للإيجار
  WHEN slug ILIKE '%property%' OR slug ILIKE '%real_estate%' OR slug ILIKE '%properties%' OR name_ar LIKE '%عقارات%' OR name_ar LIKE '%عقار%'
    THEN 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=85&auto=format&fit=crop'

  -- 🚗 VEHICLES / مركبات ونقل
  WHEN slug ILIKE '%vehicle%' OR slug ILIKE '%car%' OR slug ILIKE '%transport%' OR name_ar LIKE '%مركبات ونقل%' OR (name_ar LIKE '%مركبات%' AND name_ar NOT LIKE '%بحرية%')
    THEN 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=85&auto=format&fit=crop'

  -- 🚜 HEAVY MACHINERY / معدات ثقيلة
  WHEN slug ILIKE '%heavy%' OR slug ILIKE '%machinery%' OR slug ILIKE '%construction%' OR name_ar LIKE '%معدات ثقيلة%' OR name_ar LIKE '%ثقيله%'
    THEN 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=1200&q=85&auto=format&fit=crop'

  -- 💒 WEDDINGS & EVENTS / أعراس وتجهيزات
  WHEN slug ILIKE '%wedding%' OR slug ILIKE '%event%' OR name_ar LIKE '%أعراس%' OR name_ar LIKE '%تجهيز%' OR name_ar LIKE '%فرح%'
    THEN 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=85&auto=format&fit=crop'

  -- 🎯 RECREATION / ترفيه ورياضة
  WHEN slug ILIKE '%recreation%' OR slug ILIKE '%entertainment%' OR slug ILIKE '%sport%' OR name_ar LIKE '%ترفيه%' OR (name_ar LIKE '%رياضة%' AND name_ar NOT LIKE '%بحرية%')
    THEN 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=1200&q=85&auto=format&fit=crop'

  -- ⛵ MARINE VEHICLES / مركبات بحرية
  WHEN slug ILIKE '%marine%' OR slug ILIKE '%boat%' OR slug ILIKE '%water%' OR name_ar LIKE '%بحرية%' OR name_ar LIKE '%بحري%'
    THEN 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=1200&q=85&auto=format&fit=crop'

  ELSE image_url
END
WHERE parent_id IS NULL  -- Only update root/main categories
  AND is_active = TRUE;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  name_ar,
  slug,
  CASE
    WHEN image_url IS NULL THEN '❌ NULL'
    ELSE '✅ ' || RIGHT(image_url, 50)
  END AS image_status
FROM categories
WHERE parent_id IS NULL AND is_active = TRUE
ORDER BY display_order;
