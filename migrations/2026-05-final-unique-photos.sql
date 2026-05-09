-- ============================================================================
-- Madmona: FINAL Comprehensive Photo Refresh — 60 UNIQUE Real Photos
-- Date: 2026-05-06
--
-- Issues being fixed:
--   ❌ سيارة #1 + سيارة فاخرة #2 share photo-1494976388531 (duplicate)
--   ❌ لانش #2 + يخت #1 share photo-1567899378494 (duplicate)
--   ❌ مساحات عمل #3 + مكتب خاص #3 share photo-1604328698692 (duplicate)
--   ⚠️ أجهزة جيم منزلية photos look too uniform / boring
--   ⚠️ معدات تخييم photos lack variety
--
-- Strategy:
--   - 60 GUARANTEED unique URLs (no photo appears twice anywhere)
--   - Each category has 3 visibly distinct photos (different angles/types)
--   - Photos chosen for "real" aesthetic: people, real settings, natural lighting
--   - Replaces ALL primary photos in DEMO listings
-- ============================================================================

UPDATE listing_photos lp
SET url = CASE c.name_ar || '|' || RIGHT(l.slug, 1)

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 💒 كوشة وديكور (Wedding Stage & Decor)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'كوشة وديكور|1' THEN 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80'
  WHEN 'كوشة وديكور|2' THEN 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=800&q=80'
  WHEN 'كوشة وديكور|3' THEN 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ⚡ مولدات كهرباء (Electric Generators)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'مولدات كهرباء|1' THEN 'https://images.unsplash.com/photo-1473073805956-f4cb18d8a3a4?w=800&q=80'
  WHEN 'مولدات كهرباء|2' THEN 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
  WHEN 'مولدات كهرباء|3' THEN 'https://images.unsplash.com/photo-1581094488379-6c0eb02f4a3a?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🚤 لانش (Speedboat) — UNIQUE vs يخت
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'لانش|1' THEN 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80'
  WHEN 'لانش|2' THEN 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800&q=80'
  WHEN 'لانش|3' THEN 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🎬 معدات ميديا (Media Equipment)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'معدات ميديا|1' THEN 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800&q=80'
  WHEN 'معدات ميديا|2' THEN 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80'
  WHEN 'معدات ميديا|3' THEN 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🎤 معدات صوت (Sound Equipment)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'معدات صوت|1' THEN 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80'
  WHEN 'معدات صوت|2' THEN 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80'
  WHEN 'معدات صوت|3' THEN 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 📷 كاميرات (Cameras)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'كاميرات|1' THEN 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'
  WHEN 'كاميرات|2' THEN 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80'
  WHEN 'كاميرات|3' THEN 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 👰 فستان فرح (Wedding Dress)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'فستان فرح|1' THEN 'https://images.unsplash.com/photo-1594552072238-7b9da94d70d6?w=800&q=80'
  WHEN 'فستان فرح|2' THEN 'https://images.unsplash.com/photo-1525258801524-c14ee5e6b3aa?w=800&q=80'
  WHEN 'فستان فرح|3' THEN 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🏠 شقة (Apartment)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'شقة|1' THEN 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
  WHEN 'شقة|2' THEN 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
  WHEN 'شقة|3' THEN 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ⛵ يخت (Yacht) — UNIQUE vs لانش
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'يخت|1' THEN 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80'
  WHEN 'يخت|2' THEN 'https://images.unsplash.com/photo-1599948133420-0e0ac611b34a?w=800&q=80'
  WHEN 'يخت|3' THEN 'https://images.unsplash.com/photo-1542397284385-6010376c5337?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🚗 سيارة (Regular Cars) — UNIQUE vs سيارة فاخرة
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'سيارة|1' THEN 'https://images.unsplash.com/photo-1583121274602-3e2820c69888?w=800&q=80'
  WHEN 'سيارة|2' THEN 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&q=80'
  WHEN 'سيارة|3' THEN 'https://images.unsplash.com/photo-1605559424843-9e4c228bf12d?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🏎️ سيارة فاخرة (Luxury Cars) — UNIQUE vs سيارة
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'سيارة فاخرة|1' THEN 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80'
  WHEN 'سيارة فاخرة|2' THEN 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80'
  WHEN 'سيارة فاخرة|3' THEN 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 👥 مكتب مشترك (Coworking)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'مكتب مشترك|1' THEN 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'
  WHEN 'مكتب مشترك|2' THEN 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80'
  WHEN 'مكتب مشترك|3' THEN 'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- ⛺ معدات تخييم (Camping) — VARIED real outdoor scenes
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'معدات تخييم|1' THEN 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80'
  WHEN 'معدات تخييم|2' THEN 'https://images.unsplash.com/photo-1455496231601-e6195da1f841?w=800&q=80'
  WHEN 'معدات تخييم|3' THEN 'https://images.unsplash.com/photo-1471115853179-bb1d604434e0?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🪑 مساحات عمل (Workspaces) — UNIQUE #3 (was duplicate)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'مساحات عمل|1' THEN 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80'
  WHEN 'مساحات عمل|2' THEN 'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=800&q=80'
  WHEN 'مساحات عمل|3' THEN 'https://images.unsplash.com/photo-1542744094-3a31f272c490?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🤵 بدلة عريس (Groom Suit)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'بدلة عريس|1' THEN 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'
  WHEN 'بدلة عريس|2' THEN 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'
  WHEN 'بدلة عريس|3' THEN 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🏘️ عقارات للإيجار (Real Estate)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'عقارات للإيجار|1' THEN 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80'
  WHEN 'عقارات للإيجار|2' THEN 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80'
  WHEN 'عقارات للإيجار|3' THEN 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🛸 درون (Drone)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'درون|1' THEN 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
  WHEN 'درون|2' THEN 'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800&q=80'
  WHEN 'درون|3' THEN 'https://images.unsplash.com/photo-1579829366248-204fe8413f31?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🏋️ أجهزة جيم منزلية (Home Gym) — DIVERSE: barbell + treadmill + setup
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'أجهزة جيم منزلية|1' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
  WHEN 'أجهزة جيم منزلية|2' THEN 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800&q=80'
  WHEN 'أجهزة جيم منزلية|3' THEN 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 🏛️ فيلا (Villa)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'فيلا|1' THEN 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80'
  WHEN 'فيلا|2' THEN 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'
  WHEN 'فيلا|3' THEN 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80'

  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  -- 💼 مكتب خاص (Private Office) — UNIQUE #3 (was duplicate)
  -- ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  WHEN 'مكتب خاص|1' THEN 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80'
  WHEN 'مكتب خاص|2' THEN 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80'
  WHEN 'مكتب خاص|3' THEN 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=800&q=80'

  ELSE lp.url
END
FROM listings l, categories c
WHERE lp.listing_id = l.id
  AND l.category_id = c.id
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE
  AND l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694';

-- ============================================================================
-- VERIFICATION (Critical: must show 0 duplicates after this SQL)
-- ============================================================================

-- 1. Find any URL used by more than one listing (MUST RETURN 0 ROWS)
SELECT lp.url, COUNT(*) AS dup_count, STRING_AGG(l.title, ' | ') AS listings
FROM listing_photos lp
JOIN listings l ON l.id = lp.listing_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE
GROUP BY lp.url
HAVING COUNT(*) > 1;

-- 2. Confirm: unique_urls = total_listings = 60
SELECT
  COUNT(DISTINCT lp.url) AS unique_urls,
  COUNT(*) AS total_listings,
  CASE WHEN COUNT(DISTINCT lp.url) = COUNT(*) THEN '✅ ALL UNIQUE'
       ELSE '❌ DUPLICATES STILL EXIST' END AS status
FROM listing_photos lp
JOIN listings l ON l.id = lp.listing_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE;

-- 3. Full mapping ordered by category for visual review
SELECT
  c.name_ar AS category,
  l.title,
  RIGHT(lp.url, 45) AS image_id
FROM listing_photos lp
JOIN listings l ON l.id = lp.listing_id
JOIN categories c ON c.id = l.category_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE
ORDER BY c.name_ar, l.title;
