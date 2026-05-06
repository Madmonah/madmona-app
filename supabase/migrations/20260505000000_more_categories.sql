-- ============================================================================
-- Madmona — Additional Rental Categories
-- Expands the marketplace from coworking-focused to general rental.
-- Run AFTER 20260430000004_seed_data.sql
-- Idempotent: safe to run multiple times.
-- ============================================================================

-- ============================================================================
-- 1. NEW ROOT CATEGORIES
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('11111111-0000-0000-0000-000000000006', NULL, 'أعراس وتجهيزات', 'Weddings & Events', 'weddings',    '💒', 6),
  ('11111111-0000-0000-0000-000000000007', NULL, 'ترفيه ورياضة',  'Recreation',        'recreation',  '🎯', 7),
  ('11111111-0000-0000-0000-000000000008', NULL, 'أطفال وعائلة',   'Kids & Family',     'kids-family', '👶', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 2. EVENT VENUES → sub-categories (root existed but had no children)
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('99999999-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000005', 'قاعة أفراح',     'Wedding Hall',  'event-venues-wedding-hall', '💍', 1),
  ('99999999-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000005', 'مزرعة',          'Farm',          'event-venues-farm',         '🌾', 2),
  ('99999999-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000005', 'يخت / مركب',     'Yacht / Boat',  'event-venues-yacht',        '🛥️', 3),
  ('99999999-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000005', 'استوديو تصوير',  'Photo Studio',  'event-venues-photo-studio', '📸', 4),
  ('99999999-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000005', 'قاعة محاضرات',   'Lecture Hall',  'event-venues-lecture',      '🎤', 5),
  ('99999999-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000005', 'حديقة خاصة',     'Private Garden','event-venues-garden',       '🌳', 6),
  ('99999999-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000005', 'كافيه / مطعم',   'Cafe / Restaurant','event-venues-cafe',      '☕', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 3. WEDDINGS → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('66666666-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000006', 'فستان فرح',         'Wedding Dress',     'weddings-dress',       '👰', 1),
  ('66666666-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000006', 'بدلة عريس',          'Groom Suit',        'weddings-suit',        '🤵', 2),
  ('66666666-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000006', 'كوشة وديكور',       'Stage & Decor',     'weddings-decor',       '🎀', 3),
  ('66666666-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000006', 'معدات صوت وإضاءة', 'Sound & Lighting',  'weddings-av',          '💡', 4),
  ('66666666-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000006', 'تجهيزات ضيافة',    'Catering Equipment','weddings-catering',    '🍽️', 5),
  ('66666666-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000006', 'إكسسوارات',         'Accessories',       'weddings-accessories', '💎', 6),
  ('66666666-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000006', 'ميك أب وتسريحات',  'Makeup',            'weddings-makeup',      '💄', 7),
  ('66666666-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000006', 'أرابيسك ومفروشات', 'Furniture & Decor', 'weddings-furniture',   '🪑', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 4. RECREATION → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('77777777-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000007', 'معدات تخييم',     'Camping Gear',     'recreation-camping',     '⛺', 1),
  ('77777777-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000007', 'معدات سباحة وغطس', 'Swim & Dive Gear', 'recreation-swim',        '🤿', 2),
  ('77777777-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000007', 'أجهزة جيم منزلية','Gym Equipment',   'recreation-gym',         '💪', 3),
  ('77777777-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000007', 'دراجات هوائية',  'Bicycles',         'recreation-bicycles',    '🚲', 4),
  ('77777777-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000007', 'معدات رياضية',   'Sports Equipment', 'recreation-sports',      '⚽', 5),
  ('77777777-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000007', 'معدات صيد',       'Fishing Gear',     'recreation-fishing',     '🎣', 6),
  ('77777777-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000007', 'ألعاب لوحية',     'Board Games',      'recreation-boardgames',  '🎲', 7),
  ('77777777-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000007', 'كاياك وقوارب صغيرة','Kayaks',          'recreation-kayak',       '🛶', 8)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 5. KIDS & FAMILY → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('88888888-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000008', 'نطيطات وملاهي',                'Bouncy Castles',    'kids-bouncy',     '🎪', 1),
  ('88888888-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000008', 'عربيات أطفال',                  'Strollers',         'kids-strollers',  '🚼', 2),
  ('88888888-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000008', 'مهد ومستلزمات حديثي الولادة', 'Baby Gear',         'kids-baby-gear',  '🍼', 3),
  ('88888888-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000008', 'ألعاب أطفال كبيرة',             'Large Toys',        'kids-toys',       '🛝', 4),
  ('88888888-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000008', 'فساتين وبدل أطفال',             'Kids Costumes',     'kids-costumes',   '👗', 5),
  ('88888888-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000008', 'كرسي عربية',                    'Car Seat',          'kids-car-seat',   '🚗', 6),
  ('88888888-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000008', 'تجهيزات سبوع',                  'Sebou Decor',       'kids-sebou',      '🎉', 7)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 6. ADDITIONAL SUB-CATEGORIES FOR EXISTING ROOTS
-- ============================================================================

-- ── Workspaces extras ──
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('22222222-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000001', 'استوديو بودكاست', 'Podcast Studio', 'workspaces-podcast', '🎙️', 6),
  ('22222222-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000001', 'مساحة تصوير',     'Photo Space',    'workspaces-photo',   '📸', 7)
ON CONFLICT (id) DO NOTHING;

-- ── Properties extras ──
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('33333333-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000002', 'تاون هاوس',     'Townhouse',     'properties-townhouse', '🏘️', 6),
  ('33333333-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000002', 'روف',            'Penthouse',     'properties-penthouse', '🌃', 7),
  ('33333333-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000002', 'سكن طلابي',     'Student Housing','properties-student',  '🎓', 8),
  ('33333333-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000002', 'مساحة تخزين',  'Storage Space', 'properties-storage',  '📦', 9)
ON CONFLICT (id) DO NOTHING;

-- ── Vehicles extras ──
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('44444444-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000003', 'تروسيكل',         'Tuk-tuk',         'vehicles-tuktuk',     '🛺', 6),
  ('44444444-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000003', 'عربية نقل',      'Truck',           'vehicles-truck',      '🚛', 7),
  ('44444444-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000003', 'سيارة دفع رباعي', '4x4',            'vehicles-4x4',        '🚙', 8),
  ('44444444-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000003', 'ليموزين',         'Limousine',       'vehicles-limousine',  '🚘', 9)
ON CONFLICT (id) DO NOTHING;

-- ── Equipment extras ──
INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('55555555-0000-0000-0000-000000000006', '11111111-0000-0000-0000-000000000004', 'معدات لحام',      'Welding',           'equipment-welding',  '🔥', 6),
  ('55555555-0000-0000-0000-000000000007', '11111111-0000-0000-0000-000000000004', 'معدات تكييف',     'HVAC Equipment',    'equipment-hvac',     '❄️', 7),
  ('55555555-0000-0000-0000-000000000008', '11111111-0000-0000-0000-000000000004', 'أدوات حدائق',     'Garden Tools',      'equipment-garden',   '🌱', 8),
  ('55555555-0000-0000-0000-000000000009', '11111111-0000-0000-0000-000000000004', 'معدات تنظيف',     'Cleaning Equipment','equipment-cleaning', '🧹', 9),
  ('55555555-0000-0000-0000-00000000000a', '11111111-0000-0000-0000-000000000004', 'معدات مطبخ',      'Kitchen Equipment', 'equipment-kitchen',  '🍳', 10),
  ('55555555-0000-0000-0000-00000000000b', '11111111-0000-0000-0000-000000000004', 'معدات طبية',      'Medical Equipment', 'equipment-medical',  '🏥', 11)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 7. ATTRIBUTES (essentials for new categories)
-- ============================================================================

-- ── Wedding Dress ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('66666666-0000-0000-0000-000000000001', 'المقاس', 'Size', 'size', 'select',
    '[{"key":"xs","label_ar":"XS"},{"key":"s","label_ar":"S"},{"key":"m","label_ar":"M"},{"key":"l","label_ar":"L"},{"key":"xl","label_ar":"XL"},{"key":"xxl","label_ar":"XXL"}]'::jsonb,
    TRUE, 1),
  ('66666666-0000-0000-0000-000000000001', 'الطراز', 'Style', 'style', 'select',
    '[{"key":"classic","label_ar":"كلاسيك"},{"key":"princess","label_ar":"أميرة"},{"key":"mermaid","label_ar":"حورية"},{"key":"a-line","label_ar":"A-Line"},{"key":"modern","label_ar":"عصري"}]'::jsonb,
    TRUE, 2),
  ('66666666-0000-0000-0000-000000000001', 'اللون',           'Color',             'color',             'text',    '[]'::jsonb, FALSE, 3),
  ('66666666-0000-0000-0000-000000000001', 'يشمل التنظيف',  'Cleaning included', 'cleaning_included', 'boolean', '[]'::jsonb, FALSE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Groom Suit ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('66666666-0000-0000-0000-000000000002', 'المقاس', 'Size', 'size', 'select',
    '[{"key":"s","label_ar":"S"},{"key":"m","label_ar":"M"},{"key":"l","label_ar":"L"},{"key":"xl","label_ar":"XL"},{"key":"xxl","label_ar":"XXL"}]'::jsonb,
    TRUE, 1),
  ('66666666-0000-0000-0000-000000000002', 'اللون', 'Color', 'color', 'text', '[]'::jsonb, TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Stage & Decor ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('66666666-0000-0000-0000-000000000003', 'سعة الكوشة',    'Stage capacity',    'capacity',         'number',  TRUE,  1),
  ('66666666-0000-0000-0000-000000000003', 'يشمل التركيب', 'Includes setup',    'setup_included',   'boolean', TRUE,  2),
  ('66666666-0000-0000-0000-000000000003', 'يشمل التفكيك', 'Includes teardown', 'teardown_included','boolean', FALSE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Sound & Lighting ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('66666666-0000-0000-0000-000000000004', 'نوع المعدة', 'Equipment type', 'equipment_type', 'select',
    '[{"key":"speakers","label_ar":"سماعات"},{"key":"mics","label_ar":"مايكات"},{"key":"mixer","label_ar":"ميكسر"},{"key":"lights","label_ar":"إضاءة"},{"key":"full_setup","label_ar":"سيت كامل"}]'::jsonb,
    TRUE, 1),
  ('66666666-0000-0000-0000-000000000004', 'مع فني', 'With technician', 'with_tech', 'boolean', '[]'::jsonb, TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Catering Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('66666666-0000-0000-0000-000000000005', 'نوع التجهيزات', 'Type', 'catering_type', 'select',
    '[{"key":"icecream","label_ar":"ايس كريم ماشين"},{"key":"popcorn","label_ar":"فشار"},{"key":"cotton_candy","label_ar":"غزل البنات"},{"key":"chafing","label_ar":"شيفنج ديش"},{"key":"glassware","label_ar":"كاسات وأطباق"}]'::jsonb,
    TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Camping Gear ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('77777777-0000-0000-0000-000000000001', 'نوع المعدة', 'Type', 'gear_type', 'select',
    '[{"key":"tent","label_ar":"خيمة"},{"key":"sleeping_bag","label_ar":"سليبنج باج"},{"key":"cooler","label_ar":"ثلاجة"},{"key":"stove","label_ar":"موقد"},{"key":"complete_set","label_ar":"سيت كامل"}]'::jsonb,
    TRUE, 1),
  ('77777777-0000-0000-0000-000000000001', 'السعة', 'Capacity', 'capacity', 'number', '[]'::jsonb, FALSE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Gym Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('77777777-0000-0000-0000-000000000003', 'نوع الجهاز', 'Equipment type', 'gym_type', 'select',
    '[{"key":"treadmill","label_ar":"تريد ميل"},{"key":"bike","label_ar":"عجلة ثابتة"},{"key":"weights","label_ar":"دامبلز / حديد"},{"key":"bench","label_ar":"بنش"},{"key":"multi_gym","label_ar":"جهاز متعدد"}]'::jsonb,
    TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Bicycles ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('77777777-0000-0000-0000-000000000004', 'نوع الدراجة', 'Type', 'bike_type', 'select',
    '[{"key":"road","label_ar":"رود"},{"key":"mountain","label_ar":"جبلية"},{"key":"hybrid","label_ar":"هايبرد"},{"key":"electric","label_ar":"كهربائية"},{"key":"kids","label_ar":"أطفال"}]'::jsonb,
    TRUE, 1),
  ('77777777-0000-0000-0000-000000000004', 'الماركة', 'Brand', 'brand', 'text', '[]'::jsonb, FALSE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Bouncy Castle ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('88888888-0000-0000-0000-000000000001', 'حجم النطيطة',  'Size',         'size',          'text',    TRUE,  1),
  ('88888888-0000-0000-0000-000000000001', 'سن المناسب',   'Age range',    'age_range',     'text',    TRUE,  2),
  ('88888888-0000-0000-0000-000000000001', 'يشمل التركيب', 'Setup',        'setup_included','boolean', TRUE,  3),
  ('88888888-0000-0000-0000-000000000001', 'يشمل المراقب', 'With operator','with_operator', 'boolean', FALSE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Strollers ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('88888888-0000-0000-0000-000000000002', 'الماركة',         'Brand',        'brand',     'text',    FALSE, 1),
  ('88888888-0000-0000-0000-000000000002', 'سن المناسب',      'Age range',    'age_range', 'text',    TRUE,  2),
  ('88888888-0000-0000-0000-000000000002', 'مزدوجة (لتوأم)', 'Twin stroller','is_twin',   'boolean', FALSE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Yacht / Boat (event venue) ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('99999999-0000-0000-0000-000000000003', 'السعة',  'Capacity', 'capacity', 'number',  TRUE, 1),
  ('99999999-0000-0000-0000-000000000003', 'مع طاقم','With crew','with_crew','boolean', TRUE, 2),
  ('99999999-0000-0000-0000-000000000003', 'الموقع', 'Location', 'location', 'text',    TRUE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Wedding Hall (event venue) ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('99999999-0000-0000-0000-000000000001', 'السعة القصوى', 'Max capacity', 'capacity', 'number',  TRUE, 1),
  ('99999999-0000-0000-0000-000000000001', 'يشمل ديكور',   'Decor included','decor_included','boolean', FALSE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Truck ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('44444444-0000-0000-0000-000000000007', 'الحمولة بالكيلو','Load capacity','load_kg',     'number',  TRUE, 1),
  ('44444444-0000-0000-0000-000000000007', 'مع سائق',         'With driver',  'with_driver', 'boolean', TRUE, 2)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Welding Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('55555555-0000-0000-0000-000000000006', 'نوع اللحام', 'Welding type', 'welding_type', 'select',
    '[{"key":"arc","label_ar":"قوس كهربي"},{"key":"mig","label_ar":"MIG"},{"key":"tig","label_ar":"TIG"},{"key":"gas","label_ar":"أكسجين"}]'::jsonb,
    TRUE, 1)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL)     AS root_categories,
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) AS sub_categories,
  (SELECT COUNT(*) FROM attributes)                              AS total_attributes;
