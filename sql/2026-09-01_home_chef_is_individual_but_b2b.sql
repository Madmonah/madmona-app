-- 🍳 (١ سبتمبر ٢٠٢٦) محمد نصًا:
--    «في قسم شيفات منزليين في المطاعم — ده للأفراد بس، برضو هيبقى ليه
--     حساب بي تو بي».
--
-- المبدأ اللي القاعدة دي بترسّخه:
--   **التصنيف للعرض ≠ الحساب للقدرات.** الشيف المنزلي بيتعرض «فرد»
--   (seller_class='home_chef' تحت تاب شيفات منزليين) وفي نفس الوقت
--   بياخد حساب B2B كامل (استورفرنت + منيو + لوحة). الاتنين منفصلين.
--
-- 🐞 اللي كان بيمنعه: is_b2b كان محسوب = (عدد الإعلانات المنشورة >= 2)
--    في مسارين (trg_refresh_b2b_on_listing + refresh_b2b_flags). والأقسام
--    اللي موديلها «بيزنس واحد = إعلان واحد + أصنافه جوّاه» (قاعدة ٢٥/٨)
--    البيزنس كله فيها إعلان واحد — يعني **كل** مطعم وكل شيف منزلي وكل
--    عيادة كانوا is_b2b=false.
--    القياس قبل: ١٠٩ مورد بإعلان واحد كلهم متقفلين · ٦١ بس مفتوحين ·
--    ٠ من ٨ شيفات و٠ من ١٩ مطعم.
--
-- ✅ بعد: ٨/٨ شيفات و١٩/١٩ مطاعم بقى ليهم B2B. الإجمالي ٦١ → ٩١.
--    و٧٩ مورد بإعلان واحد في أقسام المخزون فضلوا **من غير** B2B — وده
--    الصح: اللي بيبيع عربيته الوحيدة فرد مش تاجر (قاعدة «رقم بإعلان
--    واحد = فرد»، ملف 2026-09-01_seller_class_one_listing_individual.sql).
--
-- نسخة احتياطية: _backup_is_b2b_20260901 (RLS مفعّل · صفر anon).
--
-- ⚠️ ملحوظة للجلسات الجاية: مفيش تصنيف «شيفات منزليين» في جدول
--    categories — الأقسام في food كلها أنواع أكل (شرقي · مشويات · بدوي
--    · بحري · كافيهات …). «شيفات منزليين» **تاب فلتر** مصدره
--    listings.seller_class مش كاتيجوري. الريجيكس القديم في
--    compute_seller_class ('home-chef|home-cook' · 'شيف بيت|طبخ منزلي')
--    مابيطابقش أي تصنيف موجود — الاشتقاق الفعلي من seller_kind='individual'.

create or replace function public.supplier_is_b2b(p_supplier uuid)
returns boolean
language sql
stable
security definer
set search_path to 'public'
as $function$
  select coalesce(
    -- إعلان منشور واحد في قسم «البيزنس هو الإعلان» يكفي
    exists (
      select 1 from listings l join categories c on c.id = l.category_id
      where l.supplier_id = p_supplier and l.status = 'published'
        and (c.track = 'industry' or c.group_slug in (
          'food','services-medical-beauty','home-services','services-professional',
          'education','services-personal','services-care','services-events'))
    )
    -- أو ٢+ إعلانات منشورة في أي قسم (أقسام المخزون)
    or (select count(*) from listings l
         where l.supplier_id = p_supplier and l.status = 'published') >= 2,
  false);
$function$;

-- المسارين اللي بيكتبوا is_b2b بقوا ينادوا نفس الدالة — مفيش قاعدتين.
create or replace function public.trg_refresh_b2b_on_listing()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_sup uuid;
begin
  v_sup := coalesce(new.supplier_id, old.supplier_id);
  if v_sup is null then return coalesce(new, old); end if;
  update marketplace_suppliers set is_b2b = supplier_is_b2b(v_sup) where id = v_sup;
  return coalesce(new, old);
exception when others then return coalesce(new, old);
end $function$;

create or replace function public.refresh_b2b_flags()
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare n int;
begin
  update marketplace_suppliers s
     set is_b2b = supplier_is_b2b(s.id)
   where coalesce(s.is_b2b, false) <> supplier_is_b2b(s.id);
  get diagnostics n = row_count;
  return n;
end $function$;

-- الترحيل: select refresh_b2b_flags();   → ٣٠ مورد اتغيّروا
