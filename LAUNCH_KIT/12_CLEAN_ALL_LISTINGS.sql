-- ============================================================================
-- Madmona — CLEAN ALL LISTINGS (start fresh)
--
-- Deletes ALL listings under Madmona supplier so Mohamed can add real ones
-- from the supplier dashboard.
--
-- Run in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mjhflxpxunwycbiquoig/sql/new
-- ============================================================================

-- Madmona supplier_id: 7310f6ef-e474-4ef8-8b8a-388b5e1f5694

-- 1. Delete pricing_rules
DELETE FROM pricing_rules WHERE listing_id IN (
  SELECT id FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
);

-- 2. Delete listing_photos
DELETE FROM listing_photos WHERE listing_id IN (
  SELECT id FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
);

-- 3. Delete listing_values (attribute values)
DELETE FROM listing_values WHERE listing_id IN (
  SELECT id FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
);

-- 4. Delete bookings (if any)
DELETE FROM marketplace_bookings WHERE listing_id IN (
  SELECT id FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
);

-- 5. Delete favorites
DELETE FROM favorites WHERE listing_id IN (
  SELECT id FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
);

-- 6. Delete reviews
DELETE FROM reviews WHERE listing_id IN (
  SELECT id FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
);

-- 7. Delete the listings themselves
DELETE FROM listings WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694';

-- ============================================================================
-- ✅ Verification — should return 0 rows
-- ============================================================================
SELECT COUNT(*) AS remaining_listings
FROM listings
WHERE supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694';
