-- ============================================================
-- ITERATION 3 — MIGRATION
-- Run this AFTER supabase_iteration3_marketplace.sql succeeded.
-- Populates space_units with Madmona's existing 4 spaces, all
-- linked to the auto-seeded "مضمونة" supplier.
-- ============================================================

-- Helper: grab Madmona's supplier_id once into a temp variable
DO $do$
DECLARE
  madmona_id UUID;
BEGIN
  SELECT id INTO madmona_id FROM suppliers
  WHERE contact_email = 'Madmona.admin@gmail.com'
  LIMIT 1;

  IF madmona_id IS NULL THEN
    RAISE EXCEPTION 'Madmona supplier not found — run supabase_iteration3_marketplace.sql first';
  END IF;

  -- ===== Indoor Coworking — single shared area unit =====
  -- Hourly + daily + package + monthly all on the same unit.
  INSERT INTO space_units (
    supplier_id, category_slug, name_ar, description_ar,
    capacity, price_hourly, price_daily, price_package_10, price_monthly,
    operating_start_hour, operating_end_hour
  )
  SELECT
    madmona_id, 'workstation', 'المساحة المشتركة الداخلية',
    'مساحة مفتوحة مكيفة، واي فاي عالي السرعة، كافيه',
    20, 50, 120, 900, 2000, 9, 23
  WHERE NOT EXISTS (
    SELECT 1 FROM space_units
    WHERE supplier_id = madmona_id AND name_ar = 'المساحة المشتركة الداخلية'
  );

  -- ===== Outdoor Garden — daily only =====
  INSERT INTO space_units (
    supplier_id, category_slug, name_ar, description_ar,
    capacity, price_daily
  )
  SELECT
    madmona_id, 'workstation', 'الجاردن',
    'مساحة عمل في الهواء الطلق، واي فاي، كافيه أوتدور',
    12, 65
  WHERE NOT EXISTS (
    SELECT 1 FROM space_units
    WHERE supplier_id = madmona_id AND name_ar = 'الجاردن'
  );

  -- ===== Private Office — monthly only =====
  INSERT INTO space_units (
    supplier_id, category_slug, name_ar, description_ar,
    capacity, price_monthly
  )
  SELECT
    madmona_id, 'office', 'المكتب الخاص',
    'مكتب مغلق بخصوصية كاملة لحد ٨ أشخاص، تكييف منفصل',
    8, 12000
  WHERE NOT EXISTS (
    SELECT 1 FROM space_units
    WHERE supplier_id = madmona_id AND name_ar = 'المكتب الخاص'
  );

  -- ===== Meeting Room — hourly with two capacity tiers =====
  -- We model this as TWO units (small for 4-people, large for 8-people)
  -- so the unit-based booking system can handle them as separate inventory.
  INSERT INTO space_units (
    supplier_id, category_slug, name_ar, description_ar,
    capacity, price_hourly, operating_start_hour, operating_end_hour
  )
  SELECT
    madmona_id, 'meeting_room', 'غرفة الاجتماعات (٤ أشخاص)',
    'غرفة اجتماعات صغيرة بعزل صوتي، تيلفزيون 55 بوصة، واي فاي',
    4, 300, 9, 23
  WHERE NOT EXISTS (
    SELECT 1 FROM space_units
    WHERE supplier_id = madmona_id AND name_ar = 'غرفة الاجتماعات (٤ أشخاص)'
  );

  INSERT INTO space_units (
    supplier_id, category_slug, name_ar, description_ar,
    capacity, price_hourly, operating_start_hour, operating_end_hour
  )
  SELECT
    madmona_id, 'meeting_room', 'غرفة الاجتماعات (٨ أشخاص)',
    'غرفة اجتماعات كبيرة بعزل صوتي، تيلفزيون 65 بوصة، واي فاي',
    8, 500, 9, 23
  WHERE NOT EXISTS (
    SELECT 1 FROM space_units
    WHERE supplier_id = madmona_id AND name_ar = 'غرفة الاجتماعات (٨ أشخاص)'
  );

  RAISE NOTICE 'Migration complete. Madmona supplier_id: %', madmona_id;
END $do$;

-- Quick sanity check — list what we created
SELECT
  s.business_name AS supplier,
  u.name_ar AS unit,
  u.category_slug AS category,
  u.capacity,
  u.price_hourly,
  u.price_daily,
  u.price_monthly
FROM space_units u
JOIN suppliers s ON s.id = u.supplier_id
ORDER BY u.created_at;
