-- ============================================================================
-- Madmona — Launch Categories
-- 6 main categories optimized for Egyptian market launch
-- Run ONCE in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
-- ============================================================================

-- 1. مساحات عمل ومناسبات (Workspaces & Event Halls)
INSERT INTO categories (slug, name_ar, name_en, description, icon, display_order, is_active, parent_id)
VALUES (
  'spaces',
  'مساحات عمل ومناسبات',
  'Spaces & Event Halls',
  'كوويركينج، قاعات اجتماعات، قاعات أفراح، جاردن، مساحات تصوير',
  'building-2',
  1,
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  is_active = true;

-- 2. عقارات للإيجار (Properties for Rent)
INSERT INTO categories (slug, name_ar, name_en, description, icon, display_order, is_active, parent_id)
VALUES (
  'properties',
  'عقارات للإيجار',
  'Properties',
  'شقق مفروشة، فيلات ساحل، فنادق بوتيك، استوديوهات، شاليهات',
  'home',
  2,
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  is_active = true;

-- 3. مركبات ونقل (Vehicles & Transport)
INSERT INTO categories (slug, name_ar, name_en, description, icon, display_order, is_active, parent_id)
VALUES (
  'vehicles',
  'مركبات ونقل',
  'Vehicles',
  'عربيات بسواق، ميكروباصات، نقل عفش، موتوسيكلات، أتوبيسات سياحية',
  'car',
  3,
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  is_active = true;

-- 4. معدات تصوير وصوت (Photography & Audio Equipment)
INSERT INTO categories (slug, name_ar, name_en, description, icon, display_order, is_active, parent_id)
VALUES (
  'equipment',
  'معدات تصوير وصوت',
  'Equipment',
  'كاميرات، عدسات، إضاءة استديو، sound systems، DJ equipment، Tripods',
  'camera',
  4,
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  is_active = true;

-- 5. تجهيزات مناسبات (Event Services)
INSERT INTO categories (slug, name_ar, name_en, description, icon, display_order, is_active, parent_id)
VALUES (
  'events',
  'تجهيزات أفراح ومناسبات',
  'Event Services',
  'DJs، مصورين، ديكور، Catering، Wedding planners، فنانين، فلاش فوتوغرافر',
  'sparkles',
  5,
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  is_active = true;

-- 6. خدمات منزلية ومكتبية (Home & Office Services)
INSERT INTO categories (slug, name_ar, name_en, description, icon, display_order, is_active, parent_id)
VALUES (
  'services',
  'خدمات منزلية ومكتبية',
  'Home Services',
  'تنظيف، نقل عفش، صيانة، مكافحة حشرات، سباكة، كهرباء، سايبر سيكيوريتي',
  'wrench',
  6,
  true,
  NULL
)
ON CONFLICT (slug) DO UPDATE SET
  name_ar = EXCLUDED.name_ar,
  description = EXCLUDED.description,
  is_active = true;

-- ============================================================================
-- Verify — should show 6 rows
SELECT slug, name_ar, display_order, is_active FROM categories ORDER BY display_order;
