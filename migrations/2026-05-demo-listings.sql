-- ============================================================================
-- Madmona DEMO Listings Generator
-- Date: 2026-05-06
--
-- Creates 3 demo listings per category (subcategory) under Madmona supplier.
-- Each listing has:
--   - Realistic title in Arabic
--   - DEMO badge in title for clear identification
--   - Realistic price tied to category
--   - Cairo city by default
--   - Themed Unsplash photo per category
--   - Active pricing rule
-- ============================================================================
--
-- Madmona supplier ID: 7310f6ef-e474-4ef8-8b8a-388b5e1f5694
-- Run this AFTER all migrations have been applied.
-- It's idempotent: skips listings that already exist (by slug).
-- ============================================================================

DO $$
DECLARE
  v_supplier_id UUID := '7310f6ef-e474-4ef8-8b8a-388b5e1f5694';
  v_listing_id UUID;
  v_slug TEXT;
  v_idx INT;
  cat RECORD;

  -- Title templates per slug (fallback to category name if not specific)
  v_titles TEXT[];
  v_prices NUMERIC[];
  v_period TEXT;
  v_image TEXT;
  v_district TEXT;

BEGIN
  -- Loop through every active category (root + subs)
  FOR cat IN
    SELECT id, slug, name_ar, parent_id, icon
    FROM categories
    WHERE is_active = TRUE
    ORDER BY display_order
  LOOP
    -- Decide template based on category slug (lowercased)
    v_titles := ARRAY[
      'DEMO · ' || cat.name_ar || ' #1 — مضمونة',
      'DEMO · ' || cat.name_ar || ' #2 — مضمونة',
      'DEMO · ' || cat.name_ar || ' #3 — مضمونة'
    ];

    -- Default district + period
    v_district := 'مصر الجديدة';
    v_period := 'daily';
    v_image := 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=800&q=80';

    -- Pricing varies by category type
    IF cat.slug ILIKE '%coworking%' OR cat.slug ILIKE '%office%' OR cat.slug ILIKE '%lounge%' THEN
      v_prices := ARRAY[200, 350, 500];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80';
    ELSIF cat.slug ILIKE '%car%' OR cat.slug ILIKE '%vehicle%' OR cat.slug ILIKE '%transport%' THEN
      v_prices := ARRAY[800, 1500, 2500];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80';
    ELSIF cat.slug ILIKE '%apartment%' OR cat.slug ILIKE '%real_estate%' OR cat.slug ILIKE '%villa%' OR cat.slug ILIKE '%chalet%' OR cat.slug ILIKE '%property%' THEN
      v_prices := ARRAY[1500, 3500, 8000];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80';
    ELSIF cat.slug ILIKE '%camera%' OR cat.slug ILIKE '%media%' OR cat.slug ILIKE '%photography%' OR cat.slug ILIKE '%video%' THEN
      v_prices := ARRAY[300, 700, 1500];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80';
    ELSIF cat.slug ILIKE '%event%' OR cat.slug ILIKE '%wedding%' OR cat.slug ILIKE '%party%' THEN
      v_prices := ARRAY[2000, 5000, 12000];
      v_period := 'per_event';
      v_image := 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80';
    ELSIF cat.slug ILIKE '%equipment%' OR cat.slug ILIKE '%tool%' OR cat.slug ILIKE '%machine%' THEN
      v_prices := ARRAY[150, 400, 1000];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=800&q=80';
    ELSIF cat.slug ILIKE '%sport%' OR cat.slug ILIKE '%entertainment%' OR cat.slug ILIKE '%recreation%' THEN
      v_prices := ARRAY[100, 300, 700];
      v_period := 'hourly';
      v_image := 'https://images.unsplash.com/photo-1518611012118-696072aa579a?w=800&q=80';
    ELSIF cat.slug ILIKE '%marine%' OR cat.slug ILIKE '%boat%' OR cat.slug ILIKE '%water%' THEN
      v_prices := ARRAY[3000, 8000, 20000];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1552074284-5e88ef1aef18?w=800&q=80';
    ELSIF cat.slug ILIKE '%heavy%' OR cat.slug ILIKE '%construction%' THEN
      v_prices := ARRAY[1500, 4000, 8000];
      v_period := 'daily';
      v_image := 'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?w=800&q=80';
    ELSE
      -- generic fallback
      v_prices := ARRAY[150, 400, 800];
      v_period := 'daily';
    END IF;

    -- Create 3 listings for this category
    FOR v_idx IN 1..3 LOOP
      v_slug := 'demo-' || cat.slug || '-' || v_idx;
      v_listing_id := gen_random_uuid();

      -- Skip if already exists
      IF NOT EXISTS (SELECT 1 FROM listings WHERE slug = v_slug) THEN
        -- Insert listing
        INSERT INTO listings (
          id, supplier_id, category_id, title, slug, description,
          city, district, status, published_at,
          rating, reviews_count, views_count, created_at, updated_at
        ) VALUES (
          v_listing_id,
          v_supplier_id,
          cat.id,
          v_titles[v_idx],
          v_slug,
          'هذا listing تجريبي (DEMO) للفئة "' || cat.name_ar || '". الـlistings الحقيقية هتظهر هنا قريباً جداً. تواصل واتساب: 01002229982',
          'القاهرة',
          v_district,
          'published',
          NOW(),
          0,
          0,
          0,
          NOW(),
          NOW()
        );

        -- Insert primary photo
        INSERT INTO listing_photos (
          listing_id, url, is_primary, display_order, caption
        ) VALUES (
          v_listing_id,
          v_image,
          TRUE,
          0,
          'صورة توضيحية - ' || cat.name_ar
        );

        -- Insert pricing rule
        INSERT INTO pricing_rules (
          listing_id, period_type, period_count, price, currency, is_active, display_order
        ) VALUES (
          v_listing_id,
          v_period,
          1,
          v_prices[v_idx],
          'EGP',
          TRUE,
          0
        );

        RAISE NOTICE 'Created DEMO listing: % (price: % EGP %)', v_slug, v_prices[v_idx], v_period;
      ELSE
        RAISE NOTICE 'Skipped (already exists): %', v_slug;
      END IF;
    END LOOP;
  END LOOP;

  RAISE NOTICE '=== DEMO listings creation complete ===';
END $$;

-- ============================================================================
-- Verification queries
-- ============================================================================

-- Total DEMO listings created under Madmona
SELECT COUNT(*) AS total_demo_listings
FROM listings
WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND title LIKE 'DEMO%';

-- Per-category breakdown
SELECT
  c.name_ar AS category,
  COUNT(l.id) AS listings_count
FROM listings l
JOIN categories c ON c.id = l.category_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
GROUP BY c.name_ar
ORDER BY c.name_ar;

-- Sample 5 listings to check they look right
SELECT
  l.title,
  l.city,
  l.district,
  l.status,
  c.name_ar AS category,
  pr.price,
  pr.period_type,
  lp.url AS photo
FROM listings l
LEFT JOIN categories c ON c.id = l.category_id
LEFT JOIN pricing_rules pr ON pr.listing_id = l.id AND pr.is_active = TRUE
LEFT JOIN listing_photos lp ON lp.listing_id = l.id AND lp.is_primary = TRUE
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
ORDER BY l.created_at DESC
LIMIT 5;

-- ============================================================================
-- ROLLBACK (only if needed - removes ALL demo listings)
-- ============================================================================
-- DELETE FROM pricing_rules WHERE listing_id IN (
--   SELECT id FROM listings
--   WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
--     AND title LIKE 'DEMO%'
-- );
-- DELETE FROM listing_photos WHERE listing_id IN (
--   SELECT id FROM listings
--   WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
--     AND title LIKE 'DEMO%'
-- );
-- DELETE FROM listings
-- WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
--   AND title LIKE 'DEMO%';
