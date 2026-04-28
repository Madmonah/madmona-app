-- ================================================
-- مضمونة (Madmona) - Update Pricing to Real Values
-- ================================================
-- Run this in Supabase SQL Editor to align database
-- prices with what the app shows users
-- ================================================

-- Clean existing pricing data
DELETE FROM public.pricing_plans;

-- Re-insert with real prices matching the app code
DO $$
DECLARE
  indoor_id UUID;
  outdoor_id UUID;
  office_id UUID;
  meeting_id UUID;
BEGIN
  SELECT id INTO indoor_id FROM public.spaces WHERE space_type = 'indoor' LIMIT 1;
  SELECT id INTO outdoor_id FROM public.spaces WHERE space_type = 'outdoor' LIMIT 1;
  SELECT id INTO office_id FROM public.spaces WHERE space_type = 'private_office' LIMIT 1;
  SELECT id INTO meeting_id FROM public.spaces WHERE space_type = 'meeting_room' LIMIT 1;

  -- Indoor: 50/hour, 120/day, 900/10-day package, 2000/month
  IF indoor_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours, package_sessions, package_validity_days)
    VALUES
      (indoor_id, 'hourly', 'بالساعة', 50, 1, NULL, NULL),
      (indoor_id, 'daily', 'باليوم', 120, 8, NULL, NULL),
      (indoor_id, 'package', 'باكدج ١٠ أيام', 900, NULL, 10, 30),
      (indoor_id, 'monthly', 'بالشهر', 2000, NULL, NULL, NULL);
  END IF;

  -- Outdoor Garden: 65/day only
  IF outdoor_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES (outdoor_id, 'daily', 'باليوم', 65, 8);
  END IF;

  -- Private Office: 12,000/month only
  IF office_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES (office_id, 'monthly', 'بالشهر', 12000, NULL);
  END IF;

  -- Meeting Room: 300/hour for 4 people, 500/hour for 8 people
  IF meeting_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES
      (meeting_id, 'hourly', 'بالساعة (٤ أشخاص)', 300, 1),
      (meeting_id, 'hourly', 'بالساعة (٨ أشخاص)', 500, 1);
  END IF;
END $$;

-- Update office capacity to match app code (up to 8 people, not 4)
UPDATE public.spaces
SET capacity_max = 8
WHERE space_type = 'private_office';

-- Update outdoor garden capacity (app says outdoor for various uses)
UPDATE public.spaces
SET description = 'مساحة عمل في الحديقة، هواء طلق وسط الخضرة'
WHERE space_type = 'outdoor';

-- Verify
SELECT
  s.name AS space_name,
  s.capacity_max AS max_capacity,
  pp.plan_type,
  pp.name AS plan_name,
  pp.price_egp AS price
FROM public.spaces s
JOIN public.pricing_plans pp ON pp.space_id = s.id
ORDER BY s.name, pp.price_egp;
