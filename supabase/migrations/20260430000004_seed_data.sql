-- ==========================================================================
-- Madmona — Seed Data (IDEMPOTENT VERSION)
-- Run AFTER 20260430000003_rls_policies.sql
-- Safe to run multiple times.
-- ==========================================================================

-- ============================================================================
-- ROOT CATEGORIES
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('11111111-0000-0000-0000-000000000001', NULL, 'مساحات عمل', 'Workspaces', 'workspaces', '🏢', 1),
  ('11111111-0000-0000-0000-000000000002', NULL, 'عقارات',     'Properties', 'properties', '🏠', 2),
  ('11111111-0000-0000-0000-000000000003', NULL, 'مركبات',     'Vehicles',   'vehicles',   '🚗', 3),
  ('11111111-0000-0000-0000-000000000004', NULL, 'معدات',      'Equipment',  'equipment',  '🚜', 4),
  ('11111111-0000-0000-0000-000000000005', NULL, 'مساحات تنظيم فعاليات', 'Event Venues', 'event-venues', '🎉', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- WORKSPACES → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('22222222-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001', 'مكتب مشترك',     'Hot Desk',         'workspaces-hot-desk',  '🪑', 1),
  ('22222222-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001', 'مكتب خاص',        'Private Office',   'workspaces-office',    '🚪', 2),
  ('22222222-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000001', 'قاعة اجتماعات',   'Meeting Room',     'workspaces-meeting',   '👥', 3),
  ('22222222-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000001', 'قاعة تدريب',      'Training Room',    'workspaces-training',  '🎓', 4),
  ('22222222-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000001', 'مساحة خارجية',    'Outdoor Space',    'workspaces-outdoor',   '🌳', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- PROPERTIES → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('33333333-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000002', 'شقة',         'Apartment',    'properties-apartment',  '🏢', 1),
  ('33333333-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000002', 'فيلا',         'Villa',        'properties-villa',      '🏡', 2),
  ('33333333-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000002', 'شاليه',        'Chalet',       'properties-chalet',     '🏖️', 3),
  ('33333333-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000002', 'استوديو',     'Studio',        'properties-studio',     '🛏️', 4),
  ('33333333-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000002', 'محل تجاري',   'Retail Space', 'properties-retail',     '🏪', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- VEHICLES → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('44444444-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000003', 'سيارة',         'Car',         'vehicles-car',        '🚗', 1),
  ('44444444-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000003', 'سيارة فاخرة',   'Luxury Car',  'vehicles-luxury',     '🏎️', 2),
  ('44444444-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000003', 'أوتوبيس',        'Bus',         'vehicles-bus',        '🚌', 3),
  ('44444444-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000003', 'ميكروباص',     'Microbus',    'vehicles-microbus',   '🚐', 4),
  ('44444444-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000003', 'موتوسيكل',     'Motorcycle',  'vehicles-motorcycle', '🏍️', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- EQUIPMENT → sub-categories
-- ============================================================================

INSERT INTO categories (id, parent_id, name_ar, name_en, slug, icon, display_order) VALUES
  ('55555555-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000004', 'معدات ثقيلة',     'Heavy Equipment',  'equipment-heavy',      '🏗️', 1),
  ('55555555-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000004', 'مولدات كهرباء',  'Generators',       'equipment-generators', '⚡', 2),
  ('55555555-0000-0000-0000-000000000003', '11111111-0000-0000-0000-000000000004', 'معدات تصوير',    'Camera Gear',      'equipment-camera',     '📷', 3),
  ('55555555-0000-0000-0000-000000000004', '11111111-0000-0000-0000-000000000004', 'معدات صوت',      'Audio Gear',       'equipment-audio',      '🎤', 4),
  ('55555555-0000-0000-0000-000000000005', '11111111-0000-0000-0000-000000000004', 'أدوات ورش',      'Workshop Tools',   'equipment-tools',      '🔧', 5)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ATTRIBUTES (dynamic fields per category)
-- ============================================================================

-- ── Hot Desk ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('22222222-0000-0000-0000-000000000001', 'يوجد واي فاي',      'Wi-Fi available',  'has_wifi',       'boolean', TRUE,  1),
  ('22222222-0000-0000-0000-000000000001', 'سرعة الإنترنت',     'Internet speed',   'internet_speed', 'number',  FALSE, 2),
  ('22222222-0000-0000-0000-000000000001', 'يوجد مقابس كهربا', 'Power outlets',    'has_outlets',    'boolean', TRUE,  3),
  ('22222222-0000-0000-0000-000000000001', 'يوجد قهوة',         'Coffee included',  'has_coffee',     'boolean', FALSE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Private Office ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, unit, is_required, display_order) VALUES
  ('22222222-0000-0000-0000-000000000002', 'عدد المكاتب',  'Desk count',         'desk_count', 'number',  NULL, TRUE, 1),
  ('22222222-0000-0000-0000-000000000002', 'المساحة',      'Area',               'area_sqm',   'number',  'م²', TRUE, 2),
  ('22222222-0000-0000-0000-000000000002', 'يوجد تكييف',   'Air conditioning',   'has_ac',     'boolean', NULL, TRUE, 3)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Meeting Room ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('22222222-0000-0000-0000-000000000003', 'السعة',           'Capacity',         'capacity',       'number',  TRUE,  1),
  ('22222222-0000-0000-0000-000000000003', 'يوجد شاشة عرض', 'Has projector',    'has_projector',  'boolean', TRUE,  2),
  ('22222222-0000-0000-0000-000000000003', 'يوجد سبورة',     'Has whiteboard',   'has_whiteboard', 'boolean', FALSE, 3),
  ('22222222-0000-0000-0000-000000000003', 'صوت معزول',     'Soundproof',       'soundproof',     'boolean', FALSE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Apartment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, unit, is_required, display_order) VALUES
  ('33333333-0000-0000-0000-000000000001', 'عدد غرف النوم', 'Bedrooms',  'bedrooms',  'number', '[]'::jsonb, NULL, TRUE,  1),
  ('33333333-0000-0000-0000-000000000001', 'عدد الحمامات',  'Bathrooms', 'bathrooms', 'number', '[]'::jsonb, NULL, TRUE,  2),
  ('33333333-0000-0000-0000-000000000001', 'المساحة',        'Area',      'area_sqm', 'number', '[]'::jsonb, 'م²', TRUE,  3),
  ('33333333-0000-0000-0000-000000000001', 'الدور',           'Floor',     'floor',    'number', '[]'::jsonb, NULL, FALSE, 4),
  ('33333333-0000-0000-0000-000000000001', 'مفروش',           'Furnished', 'furnished','select',
    '[{"key":"fully","label_ar":"مفروش بالكامل"},{"key":"semi","label_ar":"نصف مفروش"},{"key":"empty","label_ar":"فاضي"}]'::jsonb,
    NULL, TRUE, 5)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Chalet ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('33333333-0000-0000-0000-000000000003', 'يطل على البحر',  'Sea view',     'sea_view',  'boolean', TRUE,  1),
  ('33333333-0000-0000-0000-000000000003', 'يوجد حمام سباحة','Has pool',     'has_pool',  'boolean', FALSE, 2),
  ('33333333-0000-0000-0000-000000000003', 'عدد غرف النوم',   'Bedrooms',     'bedrooms',  'number',  TRUE,  3),
  ('33333333-0000-0000-0000-000000000003', 'السعة القصوى',    'Max capacity', 'capacity',  'number',  TRUE,  4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Car ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, is_required, display_order) VALUES
  ('44444444-0000-0000-0000-000000000001', 'الماركة',     'Make',         'make',         'text',    '[]'::jsonb, TRUE,  1),
  ('44444444-0000-0000-0000-000000000001', 'الموديل',      'Model',        'model',        'text',    '[]'::jsonb, TRUE,  2),
  ('44444444-0000-0000-0000-000000000001', 'سنة الصنع',   'Year',         'year',         'number',  '[]'::jsonb, TRUE,  3),
  ('44444444-0000-0000-0000-000000000001', 'نوع الفتيس',   'Transmission', 'transmission', 'select',
    '[{"key":"automatic","label_ar":"اوتوماتيك"},{"key":"manual","label_ar":"عادي"}]'::jsonb, TRUE, 4),
  ('44444444-0000-0000-0000-000000000001', 'نوع الوقود',    'Fuel type',    'fuel_type',    'select',
    '[{"key":"petrol","label_ar":"بنزين"},{"key":"diesel","label_ar":"سولار"},{"key":"electric","label_ar":"كهرباء"},{"key":"hybrid","label_ar":"هايبرد"}]'::jsonb, TRUE, 5),
  ('44444444-0000-0000-0000-000000000001', 'عدد الركاب',    'Seats',        'seats',        'number',  '[]'::jsonb, TRUE,  6),
  ('44444444-0000-0000-0000-000000000001', 'مع سائق',       'With driver',  'with_driver',  'boolean', '[]'::jsonb, FALSE, 7)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Bus ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, is_required, display_order) VALUES
  ('44444444-0000-0000-0000-000000000003', 'السعة',         'Capacity',         'capacity',    'number',  TRUE, 1),
  ('44444444-0000-0000-0000-000000000003', 'يوجد تكييف',    'Air conditioning', 'has_ac',      'boolean', TRUE, 2),
  ('44444444-0000-0000-0000-000000000003', 'مع سائق',       'With driver',      'with_driver', 'boolean', TRUE, 3),
  ('44444444-0000-0000-0000-000000000003', 'سنة الصنع',    'Year',             'year',        'number',  TRUE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ── Heavy Equipment ──
INSERT INTO attributes (category_id, name_ar, name_en, field_key, field_type, options, unit, is_required, display_order) VALUES
  ('55555555-0000-0000-0000-000000000001', 'نوع المعدة',  'Equipment type', 'equipment_type', 'select',
    '[{"key":"loader","label_ar":"لودر"},{"key":"crane","label_ar":"ونش"},{"key":"excavator","label_ar":"حفار"},{"key":"forklift","label_ar":"رافعة شوكية"},{"key":"bulldozer","label_ar":"بلدوزر"}]'::jsonb,
    NULL, TRUE, 1),
  ('55555555-0000-0000-0000-000000000001', 'القدرة',       'Power',          'horsepower',    'number',  '[]'::jsonb, 'HP', TRUE, 2),
  ('55555555-0000-0000-0000-000000000001', 'سنة الصنع',   'Year',           'year',          'number',  '[]'::jsonb, NULL, TRUE, 3),
  ('55555555-0000-0000-0000-000000000001', 'مع مشغل',     'With operator',  'with_operator', 'boolean', '[]'::jsonb, NULL, TRUE, 4)
ON CONFLICT (category_id, field_key) DO NOTHING;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

SELECT
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NULL) AS root_categories,
  (SELECT COUNT(*) FROM categories WHERE parent_id IS NOT NULL) AS sub_categories,
  (SELECT COUNT(*) FROM attributes) AS total_attributes;
