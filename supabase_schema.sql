-- ================================================
-- مضمونة (Madmona) - Database Schema
-- ================================================
-- Run this in Supabase SQL Editor (one shot)
-- ================================================

-- ============ ENUMS ============
DO $$ BEGIN
  CREATE TYPE space_type AS ENUM ('indoor', 'outdoor', 'meeting_room', 'private_office');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM ('confirmed', 'cancelled', 'completed', 'no_show');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE TYPE plan_type AS ENUM ('hourly', 'daily', 'package', 'monthly');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ============ USERS ============
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  phone_number TEXT UNIQUE NOT NULL,
  full_name TEXT,
  email TEXT,
  is_first_time BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ SPACES ============
CREATE TABLE IF NOT EXISTS public.spaces (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  name_en TEXT NOT NULL,
  description TEXT,
  space_type space_type NOT NULL,
  capacity_min INT NOT NULL DEFAULT 1,
  capacity_max INT NOT NULL DEFAULT 1,
  amenities JSONB,
  is_available BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ PRICING PLANS ============
CREATE TABLE IF NOT EXISTS public.pricing_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  plan_type plan_type NOT NULL,
  name TEXT NOT NULL,
  price_egp NUMERIC(10,2) NOT NULL,
  duration_hours INT,
  package_sessions INT,
  package_validity_days INT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ BOOKINGS ============
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code TEXT UNIQUE DEFAULT ('MAD-' || UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 6))),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  space_id UUID NOT NULL REFERENCES public.spaces(id) ON DELETE CASCADE,
  pricing_plan_id UUID NOT NULL REFERENCES public.pricing_plans(id) ON DELETE RESTRICT,
  booking_date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  attendee_count INT NOT NULL DEFAULT 1,
  total_price_egp NUMERIC(10,2) NOT NULL,
  status booking_status DEFAULT 'confirmed',
  payment_status payment_status DEFAULT 'pending',
  payment_method TEXT,
  qr_code_data TEXT,
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============ INDEXES ============
CREATE INDEX IF NOT EXISTS idx_bookings_user ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_space ON public.bookings(space_id);
CREATE INDEX IF NOT EXISTS idx_bookings_date ON public.bookings(booking_date);
CREATE INDEX IF NOT EXISTS idx_pricing_space ON public.pricing_plans(space_id);

-- ============ ROW LEVEL SECURITY ============
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pricing_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- USERS policies
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
  FOR UPDATE USING (auth.uid() = id);

-- SPACES policies (public read)
DROP POLICY IF EXISTS "Spaces are viewable by everyone" ON public.spaces;
CREATE POLICY "Spaces are viewable by everyone" ON public.spaces
  FOR SELECT USING (true);

-- PRICING_PLANS policies (public read)
DROP POLICY IF EXISTS "Pricing plans viewable by everyone" ON public.pricing_plans;
CREATE POLICY "Pricing plans viewable by everyone" ON public.pricing_plans
  FOR SELECT USING (true);

-- BOOKINGS policies
DROP POLICY IF EXISTS "Users can view own bookings" ON public.bookings;
CREATE POLICY "Users can view own bookings" ON public.bookings
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own bookings" ON public.bookings;
CREATE POLICY "Users can create own bookings" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own bookings" ON public.bookings;
CREATE POLICY "Users can update own bookings" ON public.bookings
  FOR UPDATE USING (auth.uid() = user_id);

-- ============ SEED DATA: Madmona spaces ============
INSERT INTO public.spaces (name, name_en, description, space_type, capacity_min, capacity_max, amenities)
VALUES
  ('المساحة الداخلية', 'Indoor Coworking', 'مساحة عمل مشتركة مكيفة بإضاءة طبيعية', 'indoor', 1, 20, '["wifi", "ac", "natural_light", "coffee", "outlets"]'::jsonb),
  ('الجاردن', 'Outdoor Garden', 'مساحة عمل في الحديقة هواء طلق', 'outdoor', 1, 12, '["wifi", "fresh_air", "outlets", "shade"]'::jsonb),
  ('الأوفيس الخاص', 'Private Office', 'مكتب خاص لشغل يحتاج تركيز', 'private_office', 1, 4, '["wifi", "ac", "privacy", "outlets"]'::jsonb),
  ('غرفة الاجتماعات', 'Meeting Room', 'غرفة اجتماعات بترابيزة طويلة وعزل صوتي', 'meeting_room', 2, 8, '["wifi", "ac", "soundproofing", "natural_light", "long_table"]'::jsonb)
ON CONFLICT DO NOTHING;

-- ============ SEED DATA: Pricing plans ============
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

  -- Indoor pricing
  IF indoor_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES
      (indoor_id, 'hourly', 'بالساعة', 50, 1),
      (indoor_id, 'daily', 'باليوم', 250, 8),
      (indoor_id, 'monthly', 'بالشهر', 2500, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Outdoor pricing
  IF outdoor_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES
      (outdoor_id, 'hourly', 'بالساعة', 40, 1),
      (outdoor_id, 'daily', 'باليوم', 200, 8)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Office pricing
  IF office_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES
      (office_id, 'hourly', 'بالساعة', 100, 1),
      (office_id, 'daily', 'باليوم', 500, 8),
      (office_id, 'monthly', 'بالشهر', 5000, NULL)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Meeting room pricing
  IF meeting_id IS NOT NULL THEN
    INSERT INTO public.pricing_plans (space_id, plan_type, name, price_egp, duration_hours)
    VALUES
      (meeting_id, 'hourly', 'بالساعة', 150, 1),
      (meeting_id, 'daily', 'باليوم', 800, 8)
    ON CONFLICT DO NOTHING;
  END IF;
END $$;

-- ============ DONE ============
SELECT 'مضمونة Database Setup Complete' AS message,
       (SELECT COUNT(*) FROM public.spaces) AS spaces_count,
       (SELECT COUNT(*) FROM public.pricing_plans) AS pricing_plans_count;
