-- =====================================================================
-- إخفاء أرقام الموردين عن الزوار
--
-- المشكلة (اتقاست يوم ٢٠ يوليو بالمفتاح العام):
--   listings.contact_phone              → ١٠٧ إعلان بيكشف رقم مورد
--   property_market_items.contact_phone → ٦٤ مشروع
--   property_market_items.source_lead_phone → ٤٤ مشروع
--
--   أي حد معاه المفتاح العام (وهو في كود الموقع) يقدر يسحبهم كلهم
--   في طلب واحد. ده بيخلّي الموردين يتصل بيهم منافسين ووسطاء،
--   وبيخلّي العميل يتجاوز مضمونة فمفيش حماية ولا عمولة.
--
-- الحل: منع الدور `anon` من الأعمدة دي بس.
--   الدور `authenticated` بيفضل شايفهم — عشان الحجز والتواصل
--   بيتم بعد تسجيل الدخول عادي.
--
-- ⚠️ درس من إصلاح suppliers الصبح:
--   GRANT على مستوى الجدول بيتغلّب على REVOKE على مستوى العمود.
--   لازم نسحب الجدول كله الأول وبعدين نمنح الأعمدة الآمنة.
--   لو عملت REVOKE (col) على طول هيقول Success وهو مش شغال.
-- =====================================================================

begin;

-- ── listings ────────────────────────────────────────────────────────
revoke select on public.listings from anon;

grant select (
  id, supplier_id, category_id, title, slug, description,
  status, country, city, address, price, price_unit,
  cover_url, images, rating, reviews_count, bookings_count, views_count,
  published_at, created_at, updated_at,
  advance_booking_days, cancellation_hours, auto_accept_bookings,
  requires_security_deposit, requires_id_verification, accepts_insurance,
  is_directory, price_on_request
) on public.listings to anon;

-- ── property_market_items ───────────────────────────────────────────
revoke select on public.property_market_items from anon;

grant select (
  id, slug, title, developer, area, area_label, city, district,
  segment, property_type, unit_label,
  price_from, price_to, price_unit, note,
  cover_url, brochure_url, video_url, media,
  payment_plan, delivery_label, commission_pct,
  status, is_active, sort_order, embargoed, embargo_note,
  lat, lng, booking_enabled, booking_fee, booking_fee_note,
  source_name, created_at, updated_at
) on public.property_market_items to anon;

commit;

-- =====================================================================
-- التحقق — لازم يتنفّذ بعد الإصلاح مش قبله
--
--   الأعمدة دي المفروض ترجع خطأ 42501 للمفتاح العام:
--     select contact_phone from listings limit 1;
--     select contact_phone, source_lead_phone from property_market_items limit 1;
--
--   والباقي المفروض يشتغل عادي:
--     select title, price from listings limit 1;
--
-- ⚠️ ماتقولش «اتصلح» غير بعد ما تختبر فعلاً.
--    الصبح REVOKE قال Success والبيانات فضلت مكشوفة.
-- =====================================================================
