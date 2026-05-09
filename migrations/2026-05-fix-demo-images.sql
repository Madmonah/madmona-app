-- ============================================================================
-- Madmona DEMO Listings: Image Refresh + Remove Kids Products
-- Date: 2026-05-06
--
-- Two-phase script:
--   Phase 1: Remove all children/kids related listings + disable categories
--   Phase 2: Update remaining DEMO listings with category-specific images
-- ============================================================================
-- Run as a single transaction
-- ============================================================================

-- ============================================================================
-- PHASE 1: Remove children/kids products
-- ============================================================================

DO $$
DECLARE
  child_cat_ids UUID[];
  child_count INT;
  listing_count INT;
BEGIN
  -- Find all categories matching children/kids patterns
  SELECT array_agg(id) INTO child_cat_ids
  FROM categories
  WHERE
    slug ILIKE '%child%' OR slug ILIKE '%kid%' OR slug ILIKE '%baby%'
    OR slug ILIKE '%toddler%' OR slug ILIKE '%infant%'
    OR slug ILIKE '%tfl%' OR slug ILIKE '%atfal%'
    OR slug ILIKE '%bouncy%' OR slug ILIKE '%inflatable%' OR slug ILIKE '%playground%'
    OR slug ILIKE '%natit%' OR slug ILIKE '%mlhi%'
    OR name_ar LIKE '%أطفال%' OR name_ar LIKE '%طفل%' OR name_ar LIKE '%بيبي%'
    OR name_ar LIKE '%رضّع%' OR name_ar LIKE '%مواليد%' OR name_ar LIKE '%صغار%'
    OR name_ar LIKE '%نطيطات%' OR name_ar LIKE '%ملاهي%';

  IF child_cat_ids IS NULL OR array_length(child_cat_ids, 1) IS NULL THEN
    RAISE NOTICE 'No children-related categories found.';
  ELSE
    child_count := array_length(child_cat_ids, 1);

    -- Count listings to be deleted
    SELECT COUNT(*) INTO listing_count
    FROM listings WHERE category_id = ANY(child_cat_ids);

    RAISE NOTICE 'Found % children categories with % listings - cleaning up...', child_count, listing_count;

    -- Delete pricing rules
    DELETE FROM pricing_rules WHERE listing_id IN (
      SELECT id FROM listings WHERE category_id = ANY(child_cat_ids)
    );

    -- Delete photos
    DELETE FROM listing_photos WHERE listing_id IN (
      SELECT id FROM listings WHERE category_id = ANY(child_cat_ids)
    );

    -- Delete listings (any other related rows: bookings/reviews FKs should be ON DELETE CASCADE or restrict)
    DELETE FROM listings WHERE category_id = ANY(child_cat_ids);

    -- Mark categories as inactive (soft delete - safer than hard delete)
    UPDATE categories SET is_active = FALSE WHERE id = ANY(child_cat_ids);

    RAISE NOTICE 'Disabled % children categories and their % listings', child_count, listing_count;
  END IF;
END $$;

-- ============================================================================
-- PHASE 2: Update DEMO listings with category-specific images
-- ============================================================================
--
-- Strategy: match each DEMO listing's category (by slug + Arabic name)
-- to a specific Unsplash photo that visually represents that category.
-- Also rotates through 3 different images per category (#1, #2, #3) to avoid
-- having identical photos for the 3 listings in each category.
-- ============================================================================

UPDATE listing_photos lp
SET url = subq.new_url
FROM (
  SELECT
    lp2.id AS photo_id,
    CASE
      -- BOATS / لانش
      WHEN c.slug ILIKE '%lansh%' OR c.name_ar LIKE '%لانش%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800&q=80'
        END

      -- YACHT / يخت
      WHEN c.slug ILIKE '%yacht%' OR c.name_ar LIKE '%يخت%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1542397284385-6010376c5337?w=800&q=80'
        END

      -- VILLA / فيلا
      WHEN c.slug ILIKE '%villa%' OR c.name_ar LIKE '%فيلا%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80'
        END

      -- APARTMENT / شقة
      WHEN c.slug ILIKE '%apartment%' OR c.name_ar LIKE '%شقة%' OR c.name_ar LIKE '%شقق%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80'
        END

      -- REAL ESTATE GENERIC / عقارات
      WHEN c.slug ILIKE '%real_estate%' OR c.slug ILIKE '%property%' OR c.name_ar LIKE '%عقارات%' OR c.name_ar LIKE '%عقار%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
        END

      -- CHALET / شاليه
      WHEN c.slug ILIKE '%chalet%' OR c.name_ar LIKE '%شاليه%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1505691938895-1758d7feb511?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1502672023488-70e25813eb80?w=800&q=80'
        END

      -- PRIVATE OFFICE / مكتب خاص
      WHEN c.slug ILIKE '%private_office%' OR c.slug ILIKE '%maktab_khas%' OR c.name_ar LIKE '%مكتب خاص%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80'
        END

      -- SHARED OFFICE / مكتب مشترك / COWORKING
      WHEN c.slug ILIKE '%coworking%' OR c.slug ILIKE '%shared%' OR c.name_ar LIKE '%مكتب مشترك%' OR c.name_ar LIKE '%كوركينج%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?w=800&q=80'
        END

      -- WORKSPACES / مساحات عمل
      WHEN c.slug ILIKE '%workspace%' OR c.name_ar LIKE '%مساحات عمل%' OR c.name_ar LIKE '%مساحة عمل%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80'
        END

      -- LUXURY CAR / سيارة فاخرة
      WHEN c.slug ILIKE '%luxury_car%' OR c.name_ar LIKE '%سيارة فاخرة%' OR c.name_ar LIKE '%سيارات فاخرة%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80'
        END

      -- CAR / سيارة (regular)
      WHEN c.slug ILIKE '%car%' OR c.slug ILIKE '%vehicle%' OR c.name_ar LIKE '%سيارة%' OR c.name_ar LIKE '%سيارات%' OR c.name_ar LIKE '%عربية%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'
        END

      -- CAMERAS / كاميرات
      WHEN c.slug ILIKE '%camera%' OR c.name_ar LIKE '%كاميرا%' OR c.name_ar LIKE '%كاميرات%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'
        END

      -- DRONE / درون
      WHEN c.slug ILIKE '%drone%' OR c.name_ar LIKE '%درون%' OR c.name_ar LIKE '%طيار%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800&q=80'
        END

      -- MEDIA EQUIPMENT / معدات ميديا
      WHEN c.slug ILIKE '%media%' OR c.name_ar LIKE '%معدات ميديا%' OR c.name_ar LIKE '%ميديا%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1499914485622-a88fac536970?w=800&q=80'
        END

      -- SOUND EQUIPMENT / معدات صوت
      WHEN c.slug ILIKE '%sound%' OR c.slug ILIKE '%audio%' OR c.name_ar LIKE '%صوت%' OR c.name_ar LIKE '%صوتيات%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1487215078519-e21cc028cb29?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&q=80'
        END

      -- WEDDING DRESS / فستان فرح
      WHEN c.slug ILIKE '%wedding_dress%' OR c.slug ILIKE '%fustan%' OR c.name_ar LIKE '%فستان%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1594552072238-7b9da94d70d6?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1525258801524-c14ee5e6b3aa?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80'
        END

      -- GROOM SUIT / بدلة عريس
      WHEN c.slug ILIKE '%groom%' OR c.slug ILIKE '%suit%' OR c.name_ar LIKE '%بدلة عريس%' OR c.name_ar LIKE '%بدلة%' OR c.name_ar LIKE '%عريس%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80'
        END

      -- WEDDING / EVENTS GENERIC / فرح
      WHEN c.slug ILIKE '%event%' OR c.slug ILIKE '%wedding%' OR c.slug ILIKE '%farah%' OR c.name_ar LIKE '%فرح%' OR c.name_ar LIKE '%أعراس%' OR c.name_ar LIKE '%مناسبات%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80'
        END

      -- CAMPING / معدات تخييم
      WHEN c.slug ILIKE '%camping%' OR c.slug ILIKE '%takhyim%' OR c.name_ar LIKE '%تخييم%' OR c.name_ar LIKE '%خيام%' OR c.name_ar LIKE '%رحلات%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1496545672447-f699b503d270?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=800&q=80'
        END

      -- HOME GYM / أجهزة جيم منزلية
      WHEN c.slug ILIKE '%gym%' OR c.slug ILIKE '%fitness%' OR c.slug ILIKE '%home_gym%' OR c.name_ar LIKE '%جيم%' OR c.name_ar LIKE '%رياضي%' OR c.name_ar LIKE '%رياضة%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'
        END

      -- BOATS GENERIC / مراكب
      WHEN c.slug ILIKE '%boat%' OR c.slug ILIKE '%marine%' OR c.name_ar LIKE '%مراكب%' OR c.name_ar LIKE '%قارب%' OR c.name_ar LIKE '%بحري%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1542397284385-6010376c5337?w=800&q=80'
        END

      -- HEAVY EQUIPMENT
      WHEN c.slug ILIKE '%heavy%' OR c.slug ILIKE '%construction%' OR c.name_ar LIKE '%ثقيلة%' OR c.name_ar LIKE '%مقاولات%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1429497419816-9ca5cfb4571a?w=800&q=80'
        END

      -- TOOLS / EQUIPMENT GENERIC / أدوات / معدات
      WHEN c.slug ILIKE '%tool%' OR c.slug ILIKE '%equipment%' OR c.name_ar LIKE '%أدوات%' OR c.name_ar LIKE '%معدات%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1530124566582-a618bc2615dc?w=800&q=80'
        END

      -- LOUNGE / قاعات
      WHEN c.slug ILIKE '%lounge%' OR c.slug ILIKE '%hall%' OR c.name_ar LIKE '%قاعة%' OR c.name_ar LIKE '%قاعات%' OR c.name_ar LIKE '%استراحة%' THEN
        CASE (RIGHT(l.slug, 1))
          WHEN '1' THEN 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80'
          WHEN '2' THEN 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80'
          ELSE 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80'
        END

      -- DEFAULT (no match) - keep current image
      ELSE lp2.url
    END AS new_url
  FROM listing_photos lp2
  JOIN listings l ON l.id = lp2.listing_id
  JOIN categories c ON c.id = l.category_id
  WHERE
    l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
    AND l.title LIKE 'DEMO%'
    AND lp2.is_primary = TRUE
) AS subq
WHERE lp.id = subq.photo_id;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- 1. Confirm kids categories disabled
SELECT id, name_ar, slug, is_active
FROM categories
WHERE name_ar LIKE '%أطفال%' OR name_ar LIKE '%نطيطات%' OR name_ar LIKE '%ملاهي%'
   OR name_ar LIKE '%طفل%' OR name_ar LIKE '%بيبي%';

-- 2. Confirm no kids listings remain
SELECT COUNT(*) AS remaining_kids_listings
FROM listings l
JOIN categories c ON c.id = l.category_id
WHERE c.is_active = FALSE
   OR c.name_ar LIKE '%أطفال%' OR c.name_ar LIKE '%نطيطات%';

-- 3. Total DEMO listings remaining
SELECT COUNT(*) AS total_demo_listings
FROM listings
WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND title LIKE 'DEMO%';

-- 4. Sample 10 listings with their new images
SELECT
  l.title,
  c.name_ar AS category,
  lp.url AS photo
FROM listings l
LEFT JOIN categories c ON c.id = l.category_id
LEFT JOIN listing_photos lp ON lp.listing_id = l.id AND lp.is_primary = TRUE
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
ORDER BY c.name_ar, l.title
LIMIT 15;
