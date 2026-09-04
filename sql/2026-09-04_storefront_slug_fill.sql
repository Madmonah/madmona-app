-- 🏪 (٤ سبتمبر ٢٠٢٦) تيست نسخة الموبايل كيوزر — محمد: «اتأكد إن اليوزر
--    مش هيقابل أي حاجة غريبة أو أي حاجة ممكن تعطله».
--
-- 🐞 لقيت: المورد بياخد إعلان منشور **من غير صفحة شركة**.
--    `suppliers.join_slug` فاضي لكل مورد بيتعمله حساب من رقمه
--    (`ensure_supplier_for_phone` · مزامنة البورصة · claim الويزارد) —
--    ومفيش دالة بتولّد السلاج في أي مسار من دول.
--    النتيجة: `/s/<slug>` مالهاش وجود عنده، والعميل اللي بيفتح إعلانه
--    مايقدرش يشوف باقي عروضه، وصاحب البيزنس مالوش لينك يبعته.
--
-- 📊 ٢٤ مورد عندهم إعلانات منشورة ومفيش استور — من ضمنهم كل اللي
--    اتعملوا في اليومين اللي فاتوا (MT Mall · حماده · مي · مصطفى ·
--    ليبيا · عزازي …).
--
-- ✅ اتولّدلهم سلاج بنفس النمط الموجود (`p-<md5 أول ٨>`)، مع فحص تصادم.
-- ✔️ اتأكد لايف: /s/p-e279bf61 → HTTP 200 وبيعرض MT Mall وإعلانه بـ٨٠٬٠٠٠.
--
-- ⚠️ ناقص لسه (مش متعمل هنا): التوليد ده **مرة واحدة**. أي مورد جديد
--    هيتعمل بنفس المسارات هيفضل من غير استور. المكان الصح لتوليد السلاج
--    هو `ensure_supplier_for_phone` نفسها — محتاج قرار محمد لأنه بيمس
--    مسار إنشاء الموردين كله.

create table if not exists _backup_slug_fill_20260904 as
select id, business_name, join_slug as old_slug, now() as saved_at
from suppliers
where join_slug is null and not coalesce(is_platform_owner,false)
  and exists (select 1 from listings l where l.supplier_id=suppliers.id and l.status='published');
alter table public._backup_slug_fill_20260904 enable row level security;
revoke all on public._backup_slug_fill_20260904 from anon, authenticated;

update suppliers s set join_slug = 'p-' || left(md5(s.id::text), 8)
from _backup_slug_fill_20260904 b
where s.id = b.id
  and not exists (select 1 from suppliers x where x.join_slug = 'p-' || left(md5(b.id::text), 8));

-- الفحص الدوري: لازم يفضل صفر
-- select count(*) from suppliers s where s.join_slug is null
--   and not coalesce(s.is_platform_owner,false)
--   and exists (select 1 from listings l where l.supplier_id=s.id and l.status='published');
