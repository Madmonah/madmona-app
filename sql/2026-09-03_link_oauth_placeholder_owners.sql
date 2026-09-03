-- 🔗 (٣ سبتمبر ٢٠٢٦) محمد: «وثّق الـ١٢ اللي فاضلين واتأكد إن أستاذ محمود
--    سالم يقدر يدخل».
--
-- ═══ المشكلة ═══
-- `supplier_admins.phone` عند أصحاب البيزنس الداخلين بجوجل كان
-- 'oauth:<uuid>' — بلاسهولدر مش رقم. والحارس بيقارن رقمهم الحقيقي بيه
-- ومايطابقش، فكل واحد فيهم مقفول في وشه **بيزنسه هو**.
--
-- ═══ اللي اتعمل ═══
-- الرقم اترجّع من `suppliers.contact_phone` (الرقم المسجّل على البيزنس
-- نفسه — مش تخمين ولا اختراع). ٩ من ١٢ اتربطوا.
--
-- 🛡️ تلات حمايات في شرط التحديث:
--   • `phone_core(...) ~ '^1[0-9]{9}$'` — موبايل مصري صالح بس
--   • `not is_platform_public_phone(...)` — رقم مضمونة العام ممنوع
--     يدخل في أي منطق ملكية (قاعدة ٢٥/٨)
--   • `not exists (... رقم متاخد لحساب تاني)` — مايتديش رقم حد لحد
--
-- ═══ التلاتة الفاضلين وسببهم ═══
--   ⛔ **NCB Developments** — رقمه المسجّل هو **رقم مضمونة العام**
--      (01002229982). ربطه كان هيدّي NCB صلاحية بالرقم على أصول
--      المنصة. محتاج رقمه الحقيقي من محمد.
--   ⚠️ **Rino's Kitchen** (16295508590600) و**حاتي المجنون**
--      (174814362882283) — دول **معرّفات صفحات فيسبوك** مش أرقام
--      موبايل (١٤ و١٥ خانة). محتاجين أرقامهم الحقيقية.
--
-- 📌 واتنين منهم كانوا **موردين مكررين** (مرض ٤.٧) واتربطوا بعد فحص:
--   • Sun Gate: صفّين مورد بنفس الاسم بالظبط — صاحبهم واحد
--   • ألترا سكان: الرقم كان واقع على حساب مؤقت فاضي متسمّى بالرقم
--     («حساب 1038971208» — صفر إعلانات وصفر أوردرات) والبيزنس
--     الحقيقي عليه الإعلان
--
-- 🧪 محمود سالم — السلسلة كاملة اتفحصت بجلسته الحقيقية:
--   حساب الدخول  create.companies@gmail.com · google · مؤكّد
--   البروفايل    +201222203004
--   أونر البيزنس owner · active · can_edit
--   حساب مضمونة  201222203004
--   لوحة الإدارة business_admin · allowed=true · readonly=false

update supplier_admins sa
set phone = s.contact_phone
from suppliers s
where sa.active and sa.phone like 'oauth:%'
  and s.id = sa.supplier_id
  and s.contact_phone is not null
  and phone_core(s.contact_phone) ~ '^1[0-9]{9}$'
  and not public.is_platform_public_phone(s.contact_phone)
  and not exists (
    select 1 from supplier_admins x
     where x.id <> sa.id and x.active
       and phone_core(x.phone) = phone_core(s.contact_phone));

-- الفحص: المفروض يفضل التلاتة الموثّقين فوق بس
-- select s.business_name, s.contact_phone from supplier_admins sa
--   left join suppliers s on s.id=sa.supplier_id
--  where sa.active and sa.phone like 'oauth:%';
