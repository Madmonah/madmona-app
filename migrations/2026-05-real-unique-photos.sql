-- ============================================================================
-- Madmona: Real & Unique Photos for ALL 60 DEMO Listings
-- Date: 2026-05-06
--
-- Issues to fix:
--   ❌ سيارة فاخرة #2 had SAME photo as سيارة #1 (photo-1494976388531)
--   ❌ Cars in general looked boring/repetitive
--   ❌ User wants every listing to look "real" (like a real person posted it)
--
-- Strategy:
--   - Use category name + position (#1/#2/#3) for unique mapping
--   - Each listing gets a UNIQUE Unsplash photo (no duplicates anywhere)
--   - Photos chosen for "real-world" feel: street angles, real lighting,
--     casual framing, different angles per listing in same category
-- ============================================================================

UPDATE listing_photos lp
SET url = CASE c.name_ar || '|' || RIGHT(l.slug, 1)

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🚗 سيارة (Regular Cars) — diverse: sedan, SUV, hatchback           ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'سيارة|1' THEN 'https://images.unsplash.com/photo-1605559424843-9e4c228bf12d?w=800&q=80'
  WHEN 'سيارة|2' THEN 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800&q=80'
  WHEN 'سيارة|3' THEN 'https://images.unsplash.com/photo-1502877338535-766e1452684a?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🏎️ سيارة فاخرة (Luxury Cars) — Mercedes black, Range Rover, BMW    ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'سيارة فاخرة|1' THEN 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&q=80'
  WHEN 'سيارة فاخرة|2' THEN 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&q=80'
  WHEN 'سيارة فاخرة|3' THEN 'https://images.unsplash.com/photo-1614162692292-7ac56d7f7f1e?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🚤 لانش (Speedboat)                                                ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'لانش|1' THEN 'https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&q=80'
  WHEN 'لانش|2' THEN 'https://images.unsplash.com/photo-1542856391-010fb87dcfed?w=800&q=80'
  WHEN 'لانش|3' THEN 'https://images.unsplash.com/photo-1564769625905-50e93615e769?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ ⛵ يخت (Yacht) — different yacht angles                             ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'يخت|1' THEN 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&q=80'
  WHEN 'يخت|2' THEN 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80'
  WHEN 'يخت|3' THEN 'https://images.unsplash.com/photo-1599948133420-0e0ac611b34a?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🏠 شقة (Apartment) — interior/different rooms                      ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'شقة|1' THEN 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80'
  WHEN 'شقة|2' THEN 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
  WHEN 'شقة|3' THEN 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🏘️ عقارات للإيجار (Real Estate) — exterior/buildings               ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'عقارات للإيجار|1' THEN 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80'
  WHEN 'عقارات للإيجار|2' THEN 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80'
  WHEN 'عقارات للإيجار|3' THEN 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🏛️ فيلا (Villa) — luxury homes, different angles                    ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'فيلا|1' THEN 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80'
  WHEN 'فيلا|2' THEN 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80'
  WHEN 'فيلا|3' THEN 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 💼 مكتب خاص (Private Office)                                       ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'مكتب خاص|1' THEN 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=800&q=80'
  WHEN 'مكتب خاص|2' THEN 'https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=800&q=80'
  WHEN 'مكتب خاص|3' THEN 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 👥 مكتب مشترك (Coworking)                                          ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'مكتب مشترك|1' THEN 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80'
  WHEN 'مكتب مشترك|2' THEN 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=800&q=80'
  WHEN 'مكتب مشترك|3' THEN 'https://images.unsplash.com/photo-1600508774634-4e11d34730e2?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🪑 مساحات عمل (Workspaces)                                          ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'مساحات عمل|1' THEN 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&q=80'
  WHEN 'مساحات عمل|2' THEN 'https://images.unsplash.com/photo-1497366858526-0766cadbe8fa?w=800&q=80'
  WHEN 'مساحات عمل|3' THEN 'https://images.unsplash.com/photo-1531973576160-7125cd663d86?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 📷 كاميرات (Cameras)                                                ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'كاميرات|1' THEN 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=800&q=80'
  WHEN 'كاميرات|2' THEN 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=800&q=80'
  WHEN 'كاميرات|3' THEN 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🛸 درون (Drone)                                                     ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'درون|1' THEN 'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=800&q=80'
  WHEN 'درون|2' THEN 'https://images.unsplash.com/photo-1508444845599-5c89863b1c44?w=800&q=80'
  WHEN 'درون|3' THEN 'https://images.unsplash.com/photo-1507582020474-9a35b7d455d9?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🎬 معدات ميديا (Media Equipment)                                    ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'معدات ميديا|1' THEN 'https://images.unsplash.com/photo-1492619375914-88005aa9e8fb?w=800&q=80'
  WHEN 'معدات ميديا|2' THEN 'https://images.unsplash.com/photo-1485846234645-a62644f84728?w=800&q=80'
  WHEN 'معدات ميديا|3' THEN 'https://images.unsplash.com/photo-1574717024653-61fd2cf4d44d?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🎤 معدات صوت (Sound Equipment)                                      ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'معدات صوت|1' THEN 'https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=800&q=80'
  WHEN 'معدات صوت|2' THEN 'https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=800&q=80'
  WHEN 'معدات صوت|3' THEN 'https://images.unsplash.com/photo-1545454675-3531b543be5d?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 👰 فستان فرح (Wedding Dress)                                        ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'فستان فرح|1' THEN 'https://images.unsplash.com/photo-1594552072238-7b9da94d70d6?w=800&q=80'
  WHEN 'فستان فرح|2' THEN 'https://images.unsplash.com/photo-1525258801524-c14ee5e6b3aa?w=800&q=80'
  WHEN 'فستان فرح|3' THEN 'https://images.unsplash.com/photo-1606216794074-735e91aa2c92?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🤵 بدلة عريس (Groom Suit)                                           ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'بدلة عريس|1' THEN 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=800&q=80'
  WHEN 'بدلة عريس|2' THEN 'https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&q=80'
  WHEN 'بدلة عريس|3' THEN 'https://images.unsplash.com/photo-1593032465175-481ac7f401a0?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 💒 كوشة وديكور (Wedding Stage & Decor)                              ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'كوشة وديكور|1' THEN 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=800&q=80'
  WHEN 'كوشة وديكور|2' THEN 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=800&q=80'
  WHEN 'كوشة وديكور|3' THEN 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ ⛺ معدات تخييم (Camping Equipment)                                  ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'معدات تخييم|1' THEN 'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80'
  WHEN 'معدات تخييم|2' THEN 'https://images.unsplash.com/photo-1496545672447-f699b503d270?w=800&q=80'
  WHEN 'معدات تخييم|3' THEN 'https://images.unsplash.com/photo-1487730116645-74489c95b41b?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ 🏋️ أجهزة جيم منزلية (Home Gym Equipment)                            ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'أجهزة جيم منزلية|1' THEN 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80'
  WHEN 'أجهزة جيم منزلية|2' THEN 'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=800&q=80'
  WHEN 'أجهزة جيم منزلية|3' THEN 'https://images.unsplash.com/photo-1583454110551-21f2fa2afe61?w=800&q=80'

  -- ╔════════════════════════════════════════════════════════════════════╗
  -- ║ ⚡ مولدات كهرباء (Electric Generators) — REAL generator photos      ║
  -- ╚════════════════════════════════════════════════════════════════════╝
  WHEN 'مولدات كهرباء|1' THEN 'https://images.unsplash.com/photo-1473073805956-f4cb18d8a3a4?w=800&q=80'
  WHEN 'مولدات كهرباء|2' THEN 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80'
  WHEN 'مولدات كهرباء|3' THEN 'https://images.unsplash.com/photo-1558002038-1055907df827?w=800&q=80'

  ELSE lp.url
END
FROM listings l, categories c
WHERE lp.listing_id = l.id
  AND l.category_id = c.id
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE
  AND l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694';

-- ============================================================================
-- VERIFICATION: Check for duplicate URLs across all DEMO listings
-- ============================================================================

-- 1. Verify NO duplicate URLs (should return 0 rows)
SELECT lp.url, COUNT(*) AS dup_count
FROM listing_photos lp
JOIN listings l ON l.id = lp.listing_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE
GROUP BY lp.url
HAVING COUNT(*) > 1;

-- 2. Show full mapping
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
ORDER BY c.name_ar, l.title;

-- 3. Confirm count = 60
SELECT COUNT(DISTINCT lp.url) AS unique_urls,
       COUNT(*) AS total_listings
FROM listing_photos lp
JOIN listings l ON l.id = lp.listing_id
WHERE l.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
  AND l.title LIKE 'DEMO%'
  AND lp.is_primary = TRUE;
-- unique_urls should equal total_listings (60 = 60)
