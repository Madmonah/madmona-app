-- ============================================================================
-- Madmona — Categories Expansion (FINAL CLEAN v3)
-- Verified DB state (2026-05-06):
--   5 root categories present: media, workspaces, properties, vehicles, equipment
--   26 sub-categories
--
-- This migration:
--   1. Adds 3 NEW root categories (uses display_order 6, 7, 8 — display_order 5
--      is intentionally LEFT EMPTY because the previous "event-venues" slot
--      needs to be discussed separately).
--   2. Adds new sub-categories under both NEW and EXISTING roots.
--   3. Adds image_url (Unsplash hero photo) to every NEW sub-category.
--   4. Adds attributes (filterable customer-facing fields) to each new sub.
--
-- Idempotent: ON CONFLICT DO NOTHING everywhere. Safe to re-run.
-- ============================================================================

-- ============================================================================
-- 1) NEW ROOT CATEGORIES
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('11111111-0000-0000-0000-000000000006', NULL, 'أعراس وتجهيزات', 'Weddings & Events', 'weddings',     '💒',
   'https://images.unsplash.com/photo-1519225421980-715cb0215aed?w=1200&q=80', 6),
  ('11111111-0000-0000-0000-000000000007', NULL, 'ترفيه ورياضة',   'Recreation',         'recreation',   '🎯',
   'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80', 7),
  ('11111111-0000-0000-0000-000000000008', NULL, 'أطفال وعائلة',    'Kids & Family',      'kids-family',  '👶',
   'https://images.unsplash.com/photo-1519689680058-324335c77eba?w=1200&q=80', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2) WEDDINGS → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('66666666-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', 'فستان فرح',         'Wedding Dress',     'weddings-dress',       '👰',
   'https://images.unsplash.com/photo-1594552072238-b8a33785b261?w=1200&q=80', 1),
  ('66666666-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006', 'بدلة عريس',          'Groom Suit',        'weddings-suit',        '🤵',
   'https://images.unsplash.com/photo-1507679799987-c73779587ccf?w=1200&q=80', 2),
  ('66666666-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000006', 'كوشة وديكور',       'Stage & Decor',     'weddings-decor',       '🎀',
   'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80', 3),
  ('66666666-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000006', 'معدات صوت وإضاءة', 'Sound & Lighting',  'weddings-av',          '💡',
   'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80', 4),
  ('66666666-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000006', 'تجهيزات ضيافة',    'Catering Equipment','weddings-catering',    '🍽️',
   'https://images.unsplash.com/photo-1555244162-803834f70033?w=1200&q=80', 5),
  ('66666666-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'إكسسوارات',         'Accessories',       'weddings-accessories', '💎',
   'https://images.unsplash.com/photo-1535632787350-4e68ef0ac584?w=1200&q=80', 6),
  ('66666666-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000006', 'أرابيسك ومفروشات', 'Furniture & Decor', 'weddings-furniture',   '🪑',
   'https://images.unsplash.com/photo-1517824806704-9040b037703b?w=1200&q=80', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3) RECREATION → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('77777777-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000007', 'معدات تخييم',     'Camping Gear',     'recreation-camping',     '⛺',
   'https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80', 1),
  ('77777777-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000007', 'أجهزة جيم منزلية','Gym Equipment',   'recreation-gym',         '💪',
   'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1200&q=80', 2),
  ('77777777-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000007', 'دراجات هوائية',  'Bicycles',         'recreation-bicycles',    '🚲',
   'https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80', 3),
  ('77777777-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000007', 'سكوتر كهربائي',   'E-Scooter',        'recreation-scooter',     '🛴',
   'https://images.unsplash.com/photo-1604868189265-219ba7bf7ea3?w=1200&q=80', 4),
  ('77777777-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000007', 'معدات سباحة وغطس', 'Swim & Dive Gear', 'recreation-swim',        '🤿',
   'https://images.unsplash.com/photo-1530549387789-4c1017266635?w=1200&q=80', 5),
  ('77777777-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000007', 'كاياك وقوارب صغيرة','Kayaks',          'recreation-kayak',       '🛶',
   'https://images.unsplash.com/photo-1493558103817-58b2924bce98?w=1200&q=80', 6),
  ('77777777-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'بلايستيشن وألعاب', 'PlayStation/Gaming','recreation-gaming',     '🎮',
   'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=1200&q=80', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4) KIDS & FAMILY → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('88888888-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000008', 'نطيطات وملاهي',                'Bouncy Castles', 'kids-bouncy',     '🎪',
   'https://images.unsplash.com/photo-1573481959998-b5e3eb12a543?w=1200&q=80', 1),
  ('88888888-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000008', 'عربيات أطفال',                  'Strollers',      'kids-strollers',  '🚼',
   'https://images.unsplash.com/photo-1591147834701-aaa6cf3b3045?w=1200&q=80', 2),
  ('88888888-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000008', 'مهد ومستلزمات حديثي الولادة', 'Baby Gear',      'kids-baby-gear',  '🍼',
   'https://images.unsplash.com/photo-1522771930-78848d9293e8?w=1200&q=80', 3),
  ('88888888-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000008', 'كرسي عربية للأطفال',           'Car Seat',       'kids-car-seat',   '🚗',
   'https://images.unsplash.com/photo-1591131544324-5d3c54de8c2c?w=1200&q=80', 4),
  ('88888888-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000008', 'فساتين وبدل أطفال',             'Kids Costumes',  'kids-costumes',   '👗',
   'https://images.unsplash.com/photo-1518831959646-742c3a14ebf7?w=1200&q=80', 5),
  ('88888888-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000008', 'تجهيزات سبوع',                  'Sebou Decor',    'kids-sebou',      '🎉',
   'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80', 6)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5) ADDITIONS to EXISTING roots (only what genuinely fits and isn't there yet)
-- ============================================================================

-- Workspaces: podcast studio + photo studio (relevant for content creators / freelancers)
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 'استوديو بودكاست', 'Podcast Studio', 'workspaces-podcast', '🎙️',
   'https://images.unsplash.com/photo-1590602847861-f357a9332bbc?w=1200&q=80', 6)
ON CONFLICT (id) DO NOTHING;

-- Properties: penthouse, storage space (clear gaps)
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'روف',           'Penthouse',     'properties-penthouse', '🌃',
   'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1200&q=80', 6),
  ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002', 'مساحة تخزين',  'Storage Space', 'properties-storage',   '📦',
   'https://images.unsplash.com/photo-1611273426858-450d8e3c9fce?w=1200&q=80', 7)
ON CONFLICT (id) DO NOTHING;

-- Vehicles: tuk-tuk, 4x4 (real Egyptian rental demand)
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('44444444-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', 'تروسيكل',         'Tuk-tuk', 'vehicles-tuktuk', '🛺',
   'https://images.unsplash.com/photo-1555685812-4b943f1cb0eb?w=1200&q=80', 8),
  ('44444444-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', 'سيارة دفع رباعي', '4x4',     'vehicles-4x4',    '🚙',
   'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=1200&q=80', 9)
ON CONFLICT (id) DO NOTHING;

-- Equipment (heavy): welding (real construction demand)
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('55555555-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000004', 'معدات لحام', 'Welding', 'equipment-welding', '🔥',
   'https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80', 9)
ON CONFLICT (id) DO NOTHING;

-- Media: drone, projector, lighting, podcast mics (sister to existing camera/audio)
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, image_url, display_order) VALUES
  ('a0a0a0a0-0000-0000-0000-000000000001', '8685bc4b-7356-4402-91bf-cc8504d91245', 'درون',           'Drone',          'media-drone',     '📡',
   'https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80', 2),
  ('a0a0a0a0-0000-0000-0000-000000000002', '8685bc4b-7356-4402-91bf-cc8504d91245', 'بروجيكتور وشاشة','Projector',       'media-projector', '📽️',
   'https://images.unsplash.com/photo-1517502884422-41eaead166d4?w=1200&q=80', 3),
  ('a0a0a0a0-0000-0000-0000-000000000003', '8685bc4b-7356-4402-91bf-cc8504d91245', 'إضاءة تصوير',    'Photo Lighting', 'media-lighting',  '💡',
   'https://images.unsplash.com/photo-1492724724894-7464c27d0ceb?w=1200&q=80', 4)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6) ATTRIBUTES (filterable, customer-facing fields)
-- ============================================================================

-- ── Wedding Dress ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('66666666-0000-0000-0000-000000000001', 'المقاس', 'Size', 'size', 'select',
    '[{"key":"xs","label_ar":"XS"},{"key":"s","label_ar":"S"},{"key":"m","label_ar":"M"},{"key":"l","label_ar":"L"},{"key":"xl","label_ar":"XL"},{"key":"xxl","label_ar":"XXL"}]'::jsonb, TRUE, TRUE, 1),
  ('66666666-0000-0000-0000-000000000001', 'الطراز', 'Style', 'style', 'select',
    '[{"key":"classic","label_ar":"كلاسيك"},{"key":"princess","label_ar":"أميرة"},{"key":"mermaid","label_ar":"حورية"},{"key":"a-line","label_ar":"A-Line"},{"key":"modern","label_ar":"عصري"}]'::jsonb, TRUE, TRUE, 2),
  ('66666666-0000-0000-0000-000000000001', 'اللون',          'Color',             'color',             'text',    '[]'::jsonb, FALSE, TRUE, 3),
  ('66666666-0000-0000-0000-000000000001', 'يشمل التنظيف',   'Cleaning included', 'cleaning_included', 'boolean', '[]'::jsonb, FALSE, TRUE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Groom Suit ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('66666666-0000-0000-0000-000000000002', 'المقاس', 'Size', 'size', 'select',
    '[{"key":"s","label_ar":"S"},{"key":"m","label_ar":"M"},{"key":"l","label_ar":"L"},{"key":"xl","label_ar":"XL"},{"key":"xxl","label_ar":"XXL"}]'::jsonb, TRUE, TRUE, 1),
  ('66666666-0000-0000-0000-000000000002', 'اللون', 'Color', 'color', 'text', '[]'::jsonb, TRUE, TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Stage & Decor ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('66666666-0000-0000-0000-000000000003', 'سعة الكوشة',     'Stage capacity',    'capacity',          'number',  '[]'::jsonb, TRUE,  TRUE,  1),
  ('66666666-0000-0000-0000-000000000003', 'يشمل التركيب',  'Includes setup',    'setup_included',    'boolean', '[]'::jsonb, TRUE,  TRUE,  2),
  ('66666666-0000-0000-0000-000000000003', 'يشمل التفكيك',  'Includes teardown', 'teardown_included', 'boolean', '[]'::jsonb, FALSE, FALSE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Sound & Lighting ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('66666666-0000-0000-0000-000000000004', 'نوع المعدة', 'Equipment type', 'equipment_type', 'select',
    '[{"key":"speakers","label_ar":"سماعات"},{"key":"mics","label_ar":"مايكات"},{"key":"mixer","label_ar":"ميكسر"},{"key":"lights","label_ar":"إضاءة"},{"key":"full_setup","label_ar":"سيت كامل"}]'::jsonb, TRUE, TRUE, 1),
  ('66666666-0000-0000-0000-000000000004', 'مع فني', 'With technician', 'with_tech', 'boolean', '[]'::jsonb, TRUE, TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Catering Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('66666666-0000-0000-0000-000000000005', 'نوع التجهيزات', 'Type', 'catering_type', 'select',
    '[{"key":"icecream","label_ar":"ايس كريم ماشين"},{"key":"popcorn","label_ar":"فشار"},{"key":"cotton_candy","label_ar":"غزل البنات"},{"key":"chafing","label_ar":"شيفنج ديش"},{"key":"glassware","label_ar":"كاسات وأطباق"}]'::jsonb, TRUE, TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Camping Gear ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('77777777-0000-0000-0000-000000000001', 'نوع المعدة', 'Type', 'gear_type', 'select',
    '[{"key":"tent","label_ar":"خيمة"},{"key":"sleeping_bag","label_ar":"سليبنج باج"},{"key":"cooler","label_ar":"ثلاجة محمولة"},{"key":"stove","label_ar":"موقد"},{"key":"complete_set","label_ar":"سيت كامل"}]'::jsonb, TRUE, TRUE, 1),
  ('77777777-0000-0000-0000-000000000001', 'سعة الخيمة', 'Tent capacity', 'capacity', 'number', '[]'::jsonb, FALSE, TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Gym Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('77777777-0000-0000-0000-000000000002', 'نوع الجهاز', 'Equipment type', 'gym_type', 'select',
    '[{"key":"treadmill","label_ar":"تريد ميل"},{"key":"bike","label_ar":"عجلة ثابتة"},{"key":"weights","label_ar":"دامبلز / حديد"},{"key":"bench","label_ar":"بنش"},{"key":"multi_gym","label_ar":"جهاز متعدد"}]'::jsonb, TRUE, TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Bicycles ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('77777777-0000-0000-0000-000000000003', 'نوع الدراجة', 'Type', 'bike_type', 'select',
    '[{"key":"road","label_ar":"رود"},{"key":"mountain","label_ar":"جبلية"},{"key":"hybrid","label_ar":"هايبرد"},{"key":"electric","label_ar":"كهربائية"},{"key":"kids","label_ar":"أطفال"}]'::jsonb, TRUE, TRUE, 1),
  ('77777777-0000-0000-0000-000000000003', 'الماركة', 'Brand', 'brand', 'text', '[]'::jsonb, FALSE, FALSE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Gaming (PlayStation/VR) ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('77777777-0000-0000-0000-000000000007', 'الجهاز', 'Console', 'console_type', 'select',
    '[{"key":"ps5","label_ar":"PS5"},{"key":"ps4","label_ar":"PS4"},{"key":"xbox","label_ar":"Xbox"},{"key":"vr","label_ar":"VR"},{"key":"switch","label_ar":"Nintendo Switch"}]'::jsonb, TRUE, TRUE, 1),
  ('77777777-0000-0000-0000-000000000007', 'عدد الذراعات', 'Controllers', 'controllers_count', 'number', '[]'::jsonb, TRUE, TRUE, 2),
  ('77777777-0000-0000-0000-000000000007', 'يشمل ألعاب', 'Includes games', 'includes_games', 'boolean', '[]'::jsonb, FALSE, TRUE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Bouncy Castles ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('88888888-0000-0000-0000-000000000001', 'حجم النطيطة',  'Size',         'size',          'text',    '[]'::jsonb, TRUE,  FALSE, 1),
  ('88888888-0000-0000-0000-000000000001', 'سن المناسب',    'Age range',    'age_range',     'text',    '[]'::jsonb, TRUE,  FALSE, 2),
  ('88888888-0000-0000-0000-000000000001', 'يشمل التركيب', 'Setup',        'setup_included','boolean', '[]'::jsonb, TRUE,  TRUE,  3),
  ('88888888-0000-0000-0000-000000000001', 'يشمل المراقب', 'With operator','with_operator', 'boolean', '[]'::jsonb, FALSE, TRUE,  4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Strollers ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('88888888-0000-0000-0000-000000000002', 'الماركة',          'Brand',        'brand',     'text',    '[]'::jsonb, FALSE, FALSE, 1),
  ('88888888-0000-0000-0000-000000000002', 'سن المناسب',       'Age range',    'age_range', 'text',    '[]'::jsonb, TRUE,  TRUE,  2),
  ('88888888-0000-0000-0000-000000000002', 'مزدوجة (لتوأم)',  'Twin stroller','is_twin',   'boolean', '[]'::jsonb, FALSE, TRUE,  3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Penthouse ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, unit, is_required, is_filterable, display_order) VALUES
  ('33333333-0000-0000-0000-000000000006', 'عدد غرف النوم', 'Bedrooms', 'bedrooms', 'number', '[]'::jsonb, NULL, TRUE,  TRUE,  1),
  ('33333333-0000-0000-0000-000000000006', 'المساحة',        'Area',     'area_sqm', 'number', '[]'::jsonb, 'م²', TRUE,  TRUE,  2),
  ('33333333-0000-0000-0000-000000000006', 'يوجد رووف',     'Has roof', 'has_roof', 'boolean','[]'::jsonb, NULL, TRUE,  TRUE,  3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Storage Space ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, unit, is_required, is_filterable, display_order) VALUES
  ('33333333-0000-0000-0000-000000000007', 'المساحة',          'Area',           'area_sqm',   'number', '[]'::jsonb, 'م²', TRUE, TRUE, 1),
  ('33333333-0000-0000-0000-000000000007', 'وصول 24 ساعة',    '24h access',     'access_24h', 'boolean','[]'::jsonb, NULL, TRUE, TRUE, 2),
  ('33333333-0000-0000-0000-000000000007', 'نظام أمان',         'Security',       'has_security', 'boolean','[]'::jsonb, NULL, TRUE, TRUE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Tuk-tuk ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('44444444-0000-0000-0000-000000000008', 'مع سائق', 'With driver', 'with_driver', 'boolean','[]'::jsonb, TRUE, TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── 4x4 ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('44444444-0000-0000-0000-000000000009', 'الماركة',     'Make',         'make',         'text', '[]'::jsonb, TRUE, TRUE, 1),
  ('44444444-0000-0000-0000-000000000009', 'سنة الصنع',  'Year',         'year',         'number','[]'::jsonb, TRUE, TRUE, 2),
  ('44444444-0000-0000-0000-000000000009', 'مع سائق',     'With driver',  'with_driver',  'boolean','[]'::jsonb, FALSE, TRUE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Welding Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('55555555-0000-0000-0000-000000000009', 'نوع اللحام', 'Welding type', 'welding_type', 'select',
    '[{"key":"arc","label_ar":"قوس كهربي"},{"key":"mig","label_ar":"MIG"},{"key":"tig","label_ar":"TIG"},{"key":"gas","label_ar":"أكسجين"}]'::jsonb, TRUE, TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Drone ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('a0a0a0a0-0000-0000-0000-000000000001', 'الماركة',         'Brand',          'brand',          'text', '[]'::jsonb, TRUE, TRUE, 1),
  ('a0a0a0a0-0000-0000-0000-000000000001', 'دقة الكاميرا',   'Camera quality', 'camera_quality', 'select',
    '[{"key":"hd","label_ar":"HD"},{"key":"4k","label_ar":"4K"},{"key":"6k","label_ar":"6K"},{"key":"8k","label_ar":"8K"}]'::jsonb, TRUE, TRUE, 2),
  ('a0a0a0a0-0000-0000-0000-000000000001', 'مع طيار',        'With pilot',     'with_pilot',     'boolean','[]'::jsonb, FALSE, TRUE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Projector ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, is_filterable, display_order) VALUES
  ('a0a0a0a0-0000-0000-0000-000000000002', 'دقة العرض', 'Resolution', 'resolution', 'select',
    '[{"key":"hd","label_ar":"HD"},{"key":"fhd","label_ar":"Full HD"},{"key":"4k","label_ar":"4K"}]'::jsonb, TRUE, TRUE, 1),
  ('a0a0a0a0-0000-0000-0000-000000000002', 'يشمل شاشة', 'Includes screen', 'with_screen', 'boolean', '[]'::jsonb, TRUE, TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ============================================================================
-- 7) VERIFICATION
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL)     AS root_count,
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) AS sub_count,
  (SELECT COUNT(*) FROM categories WHERE image_url IS NOT NULL) AS with_image,
  (SELECT COUNT(*) FROM attributes)                              AS attr_count;
