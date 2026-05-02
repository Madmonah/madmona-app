-- ============================================================================
-- Madmona — Seed Listings (12 professional sample listings)
--
-- Purpose: Populate marketplace with content so customers find listings 
-- when they visit. ALL listings are under Madmona supplier so they can 
-- be edited/deleted later.
--
-- Run AFTER 01_CATEGORIES_TO_ADD.sql in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
--
-- v2: Fixed listing #10 column count bug (added min_booking_hours)
-- ============================================================================

-- Madmona supplier_id (constant throughout)
-- supplier_id: 7310f6ef-e474-4ef8-8b8a-388b5e1f5694

-- Clean up any previous seed listings (idempotent re-run safe)
DELETE FROM pricing_rules WHERE listing_id IN (
  SELECT id FROM listings WHERE slug LIKE 'seed-%'
);
DELETE FROM listing_photos WHERE listing_id IN (
  SELECT id FROM listings WHERE slug LIKE 'seed-%'
);
DELETE FROM listings WHERE slug LIKE 'seed-%';

-- ============================================================================
-- 🏢 SPACES (4 listings)
-- ============================================================================

-- 1. Madmona Hot Desk
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at, min_booking_hours)
VALUES (
  'a0000001-0000-0000-0000-000000000001'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'spaces'),
  'مكتب مشترك (Hot Desk) - مضمونة كوويركينج',
  'مكتب مشترك في قلب مصر الجديدة. إنترنت 200 ميجا، قهوة بدون حدود، تكييف، وجو هادي للشغل والتركيز. مفتوح 9 ص → 11 م. اليوم الأول مجاناً للمحاولة.',
  'القاهرة', 'مصر الجديدة', '٧ شارع سليمان عَزْمي، النزهة',
  'published', 'seed-madmona-hot-desk', NOW(), 1
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=1200&q=85', true, 0),
  ('a0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1497366811353-6870744d04b2?w=1200&q=85', false, 1),
  ('a0000001-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1521737604893-d14cc237f11d?w=1200&q=85', false, 2);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000001-0000-0000-0000-000000000001', 'hourly', 1, 50, 'EGP', true, 0),
  ('a0000001-0000-0000-0000-000000000001', 'daily', 1, 350, 'EGP', true, 1),
  ('a0000001-0000-0000-0000-000000000001', 'monthly', 1, 4500, 'EGP', true, 2);

-- 2. Madmona Private Office
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000002-0000-0000-0000-000000000002'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'spaces'),
  'مكتب خاص لـ3 أفراد - مضمونة',
  'مكتب خاص مغلق يستوعب 3-4 أشخاص بشكل مريح. مكتب، 4 كراسي، شاشة 32" للعرض، إنترنت سريع، وخصوصية كاملة. مناسب لـstartups صغيرة أو فريق remote.',
  'القاهرة', 'مصر الجديدة', '٧ شارع سليمان عَزْمي، النزهة',
  'published', 'seed-madmona-private-office', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000002-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1568992687947-868a62a9f521?w=1200&q=85', true, 0),
  ('a0000002-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000002-0000-0000-0000-000000000002', 'daily', 1, 350, 'EGP', true, 0),
  ('a0000002-0000-0000-0000-000000000002', 'monthly', 1, 6500, 'EGP', true, 1);

-- 3. Meeting Room
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at, min_booking_hours)
VALUES (
  'a0000003-0000-0000-0000-000000000003'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'spaces'),
  'قاعة اجتماعات (8 أفراد) - مضمونة',
  'قاعة اجتماعات احترافية تستوعب 8 أشخاص. شاشة 55" للعرض، whiteboard، نظام صوت، إنترنت ممتاز. مثالية لـclient meetings، interviews، أو workshops صغيرة.',
  'القاهرة', 'مصر الجديدة', '٧ شارع سليمان عَزْمي، النزهة',
  'published', 'seed-meeting-room-8', NOW(), 1
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000003-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1200&q=85', true, 0),
  ('a0000003-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1604328698692-f76ea9498e76?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000003-0000-0000-0000-000000000003', 'hourly', 1, 200, 'EGP', true, 0),
  ('a0000003-0000-0000-0000-000000000003', 'daily', 1, 1200, 'EGP', true, 1);

-- 4. Garden Event Space
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000004-0000-0000-0000-000000000004'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'spaces'),
  'جاردن للمناسبات (50 ضيف) - مضمونة',
  'جاردن مفتوح في قلب مصر الجديدة، مثالي للمناسبات الصغيرة، عيد ميلاد، خطوبة، أو فعاليات شركات. يستوعب 50 ضيف بشكل مريح. إضاءة جميلة، تكييف للمسطح المغطى، وموسيقى. Catering متاح بسعر إضافي.',
  'القاهرة', 'مصر الجديدة', '٧ شارع سليمان عَزْمي، النزهة',
  'published', 'seed-garden-event', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000004-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?w=1200&q=85', true, 0),
  ('a0000004-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1530023367847-a683933f4172?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000004-0000-0000-0000-000000000004', 'per_event', 1, 1500, 'EGP', true, 0),
  ('a0000004-0000-0000-0000-000000000004', 'daily', 1, 2500, 'EGP', true, 1);

-- ============================================================================
-- 🏠 PROPERTIES (3 listings)
-- ============================================================================

-- 5. Sahel Apartment
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000005-0000-0000-0000-000000000005'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'properties'),
  'شقة فاخرة بإطلالة على البحر - مارينا، الساحل الشمالي',
  'شقة 3 غرف نوم بإطلالة مباشرة على البحر في مارينا. تشطيب فاخر، تكييف في كل الغرف، مطبخ كامل، حمام سباحة في الكمباوند. تستوعب 6 أشخاص بشكل مريح. مثالية لإجازة عيلية. 5 دقايق من الشاطئ.',
  'الإسكندرية', 'مارينا', 'مارينا 4، الساحل الشمالي',
  'published', 'seed-sahel-marina-apt', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000005-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=85', true, 0),
  ('a0000005-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=1200&q=85', false, 1),
  ('a0000005-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=85', false, 2);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000005-0000-0000-0000-000000000005', 'daily', 1, 4500, 'EGP', true, 0),
  ('a0000005-0000-0000-0000-000000000005', 'weekly', 1, 25000, 'EGP', true, 1);

-- 6. Studio in Nasr City
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000006-0000-0000-0000-000000000006'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'properties'),
  'استوديو مفروش حديث - مدينة نصر',
  'استوديو 60 متر مفروش بالكامل في موقع متميز. مناسب لـbusiness travelers والـremote workers. غرفة نوم منفصلة، مطبخ مفتوح، حمام كامل، وبلكونة. إنترنت سريع، تكييف، وSmart TV. قريب من Citystars ومحطة المترو.',
  'القاهرة', 'مدينة نصر', 'المنطقة العاشرة',
  'published', 'seed-nasr-city-studio', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000006-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=1200&q=85', true, 0),
  ('a0000006-0000-0000-0000-000000000006', 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000006-0000-0000-0000-000000000006', 'daily', 1, 250, 'EGP', true, 0),
  ('a0000006-0000-0000-0000-000000000006', 'weekly', 1, 1500, 'EGP', true, 1),
  ('a0000006-0000-0000-0000-000000000006', 'monthly', 1, 6000, 'EGP', true, 2);

-- 7. El Gouna Chalet
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000007-0000-0000-0000-000000000007'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'properties'),
  'شاليه راقي بالجونة - 4 غرف نوم',
  'شاليه على البحر مباشرة في الجونة، 4 غرف نوم تستوعب 8 أشخاص. حديقة خاصة، حمام سباحة شخصي، Jacuzzi، وBBQ. مناسب لإجازة عيلية أو weekend hangout. أقرب نقطة لـMarina ومطاعم Downtown 5 دقايق بالعربية.',
  'الغردقة', 'الجونة', 'East Golf, El Gouna',
  'published', 'seed-elgouna-chalet', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000007-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&q=85', true, 0),
  ('a0000007-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1200&q=85', false, 1),
  ('a0000007-0000-0000-0000-000000000007', 'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=85', false, 2);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000007-0000-0000-0000-000000000007', 'daily', 1, 2500, 'EGP', true, 0),
  ('a0000007-0000-0000-0000-000000000007', 'weekly', 1, 14000, 'EGP', true, 1);

-- ============================================================================
-- 🚗 VEHICLES (2 listings)
-- ============================================================================

-- 8. Hyundai H1 Minibus
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000008-0000-0000-0000-000000000008'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'vehicles'),
  'ميكروباص هيونداي H1 (14 راكب) للرحلات',
  'ميكروباص هيونداي H1 موديل 2023 مع سواق محترف. مناسب لرحلات العيلات، الشركات، ورحلات الساحل والعين السخنة. تكييف ممتاز، صوت ستيريو، ومقاعد مريحة. السعر يشمل السواق والبنزين لمسافة 200 كم. يومي أو أسبوعي.',
  'القاهرة', 'متاح في كل المحافظات', NULL,
  'published', 'seed-h1-minibus', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000008-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=1200&q=85', true, 0),
  ('a0000008-0000-0000-0000-000000000008', 'https://images.unsplash.com/photo-1606220945770-b5b6c2c55bf1?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000008-0000-0000-0000-000000000008', 'daily', 1, 1200, 'EGP', true, 0),
  ('a0000008-0000-0000-0000-000000000008', 'weekly', 1, 7000, 'EGP', true, 1);

-- 9. Mercedes S-Class
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000009-0000-0000-0000-000000000009'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'vehicles'),
  'مرسيدس S-Class بسواق - للأفراح والمناسبات',
  'مرسيدس S-Class أبيض موديل 2024 بسواق رسمي. تشطيب VIP، مقاعد جلد، تكييف مزدوج. مثالية للعرايس، التخرج، مناسبات الشركات الفخمة. السعر يشمل السواق + بنزين لمسافة 100 كم + ديكور بسيط للعرايس.',
  'القاهرة', 'متاح في الإسكندرية والساحل بسعر إضافي', NULL,
  'published', 'seed-mercedes-sclass', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000009-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1563720223185-11003d516935?w=1200&q=85', true, 0),
  ('a0000009-0000-0000-0000-000000000009', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000009-0000-0000-0000-000000000009', 'per_event', 1, 1500, 'EGP', true, 0),
  ('a0000009-0000-0000-0000-000000000009', 'daily', 1, 2200, 'EGP', true, 1);

-- ============================================================================
-- 📸 EQUIPMENT (2 listings)
-- ============================================================================

-- 10. Sony A7IV Kit  ← FIXED: added min_booking_hours to columns
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at, min_booking_hours)
VALUES (
  'a0000010-0000-0000-0000-000000000010'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'equipment'),
  'Sony A7IV + عدسة 24-70mm f/2.8 - تأجير يومي',
  'كاميرا Sony A7IV (33MP، 4K 60fps) مع عدسة Sony G Master 24-70mm f/2.8. مثالية لـcontent creators، مصورين فلاش، يوتيوبرز. السعر يشمل: كاميرا + عدسة + 2 بطاريات + شاحن + memory card 128GB + شنطة حماية + tripod. تسليم في أي مكان في القاهرة الكبرى.',
  'القاهرة', 'متاح في كل القاهرة الكبرى', NULL,
  'published', 'seed-sony-a7iv', NOW(), 1
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000010-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1606983340126-99ab4feaa64a?w=1200&q=85', true, 0),
  ('a0000010-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1502920917128-1aa500764cbd?w=1200&q=85', false, 1),
  ('a0000010-0000-0000-0000-000000000010', 'https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=85', false, 2);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000010-0000-0000-0000-000000000010', 'daily', 1, 350, 'EGP', true, 0),
  ('a0000010-0000-0000-0000-000000000010', 'weekly', 1, 1800, 'EGP', true, 1);

-- 11. DJ Sound System
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000011-0000-0000-0000-000000000011'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'equipment'),
  'DJ Sound System كامل (5KW) - للمناسبات',
  'نظام صوت احترافي 5KW مناسب للمناسبات اللي توصل لـ200 شخص. السعر يشمل: 4 سماعات JBL، Subwoofer، Mixer Pioneer، 2 ميكروفون لاسلكي، إضاءة LED، ومهندس صوت أثناء المناسبة. تسليم وتركيب وفك في أي مكان في القاهرة الكبرى.',
  'القاهرة', 'متاح في كل القاهرة الكبرى والإسكندرية', NULL,
  'published', 'seed-dj-sound-system', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000011-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1571266028243-d220c6a7b6ee?w=1200&q=85', true, 0),
  ('a0000011-0000-0000-0000-000000000011', 'https://images.unsplash.com/photo-1493676304819-0d7a8d026dcf?w=1200&q=85', false, 1);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000011-0000-0000-0000-000000000011', 'per_event', 1, 1200, 'EGP', true, 0),
  ('a0000011-0000-0000-0000-000000000011', 'daily', 1, 1800, 'EGP', true, 1);

-- ============================================================================
-- 🎉 EVENTS (1 listing)
-- ============================================================================

-- 12. Wedding Photographer
INSERT INTO listings (id, supplier_id, category_id, title, description, city, district, address, status, slug, published_at)
VALUES (
  'a0000012-0000-0000-0000-000000000012'::uuid,
  '7310f6ef-e474-4ef8-8b8a-388b5e1f5694',
  (SELECT id FROM categories WHERE slug = 'events'),
  'مصور أفراح + ألبوم + فيديو - باقة كاملة',
  'مصور فرح محترف بـ8 سنين خبرة. الباقة تشمل: تغطية كاملة لليوم (8 ساعات)، 300+ صورة professional، فيديو highlight 5 دقايق، ألبوم 30 صفحة، USB بكل الصور والفيديوهات الخام. كاميرا Canon R5 + إضاءة احترافية. متاح في القاهرة، الإسكندرية، والساحل.',
  'القاهرة', 'متاح في كل المحافظات', NULL,
  'published', 'seed-wedding-photographer', NOW()
);

INSERT INTO listing_photos (listing_id, url, is_primary, display_order)
VALUES
  ('a0000012-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=85', true, 0),
  ('a0000012-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?w=1200&q=85', false, 1),
  ('a0000012-0000-0000-0000-000000000012', 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=1200&q=85', false, 2);

INSERT INTO pricing_rules (listing_id, period_type, period_count, price, currency, is_active, display_order)
VALUES
  ('a0000012-0000-0000-0000-000000000012', 'per_event', 1, 6500, 'EGP', true, 0);

-- ============================================================================
-- ✅ Verification — should show 12 published listings
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
