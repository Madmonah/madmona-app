-- ============================================================
-- حملة العقارات 🏠 — يوليو 2026
-- شغّل الملف ده في Supabase SQL Editor (مرة واحدة)
-- بيسجل مفتاح تمبلت العقارات للمارد v5.
-- المارد مش هيبعت أي حاجة بالتمبلت ده غير لما ميتا تعتمده
-- (refresh-template-status بيحدث الحالة تلقائياً).
-- ملحوظة: لحد ما التمبلت يتعمد، ليدز العقارات هتتبعت
-- بالتمبلت العام supplier_intro_template لو معتمد (فولباك مقصود).
-- ============================================================

-- 1) مفتاح التمبلت (upsert آمن سواء key عليه unique أو لأ)
update whatsapp_config
   set value = 'madmona_realestate_intro_v1'
 where key = 'realestate_intro_template';

insert into whatsapp_config (key, value)
select 'realestate_intro_template', 'madmona_realestate_intro_v1'
 where not exists (
   select 1 from whatsapp_config where key = 'realestate_intro_template'
 );

-- 2) تحقق سريع
select key, value from whatsapp_config
 where key in ('realestate_intro_template', 'supplier_intro_template');

-- 3) (اختياري) نظرة على مخزون ليدز العقارات الجاهز للترحيل
select category, count(*)
  from cold_leads
 where category in ('apartments','villas','chalets','offices','commercial')
   and status = 'new'
   and phone is not null
 group by category;
