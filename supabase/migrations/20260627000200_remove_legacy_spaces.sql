-- ==========================================================================
-- Madmona — إزالة نظام المساحات القديم (coworking)
-- المساحات بقت متضافة في السوق (marketplace)، فبنشيل الجداول القديمة.
-- لا يوجد بيانات حجوزات حقيقية (جدول room_bookings غير موجود أصلاً).
-- spaces / pricing_plans كانت بيانات إعداد فقط — منسوخة احتياطيًا بالأسفل.
-- ==========================================================================

-- إسقاط الجداول القديمة (تكوين فقط)
DROP TABLE IF EXISTS public.pricing_plans CASCADE;
DROP TABLE IF EXISTS public.spaces CASCADE;

-- لو وُجدت جداول حجز قديمة بأي بيئة (مش موجودة في الإنتاج حاليًا)
DROP TABLE IF EXISTS public.room_bookings CASCADE;
DROP TABLE IF EXISTS public.space_blocks CASCADE;
DROP TABLE IF EXISTS public.booking_leads CASCADE;

-- ==========================================================================
-- نسخة احتياطية لمحتوى الجداول قبل الحذف (للرجوع لها لو احتجت):
-- spaces (4 صفوف):
--   المساحة الداخلية / غرفة الاجتماعات / الأوفيس الخاص / الجاردن
-- pricing_plans (8 صفوف): hourly/daily/package/monthly لكل مساحة
--   (50/120/900/2000 داخلي · 65 جاردن · 12000 أوفيس · 300/500 اجتماعات)
-- البيانات الكاملة (JSON) محفوظة في:
--   supabase/migrations/_backups/legacy_spaces_backup_2026-06-27.json
-- ==========================================================================
