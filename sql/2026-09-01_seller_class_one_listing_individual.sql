-- 👤 (١ سبتمبر ٢٠٢٦) قاعدة محمد نصًا:
--    «أي رقم عارض إعلان واحد هنتعامل معاه إنه فرد، بس هنسيبه يستخدم
--     الـB2B ويتصنف بيزنس».
--
-- التطبيق في compute_seller_class:
--   ١) الصناعة (B2B) بقت **أول فحص** — business دايمًا مهما كان عدد
--      الإعلانات، فالمورد الجديد بأول إعلان يفضل بيزنس زي ما محمد قال.
--   ٢) «رقم بإعلان واحد = فرد» بتتطبق على أقسام **المخزون** (كل إعلان =
--      وحدة أو سلعة): sale-property · properties · sale-vehicles ·
--      vehicles · sale-marine · marine · shop · shop-home · tourism ·
--      equipment · events. العدّ بالرقم المعياري phone_core() أو نفس
--      المورد — الصيغتين 01xx و+201xx كانوا بيتعدّوا مالكين مختلفين.
--   ٣) 'developer' مستثنى — الإشارة project_id مش عدد الإعلانات.
--
-- ⛔ مستثنى عن قصد: الأقسام اللي موديلها «بيزنس واحد = إعلان واحد +
--    أصنافه جوّاه» (قاعدة ٢٥/٨): مطاعم · طبي وتجميل · منزلية · مهنية ·
--    تعليم · عناية. هناك الإعلان الواحد **هو** البيزنس، فتطبيق القاعدة
--    كان هيحوّل ١٦ مطعم و٨ شيفات و٣ عيادات/مراكز لـ'individual' — وهو
--    تصنيف مالوش وجود في قسم المطاعم أصلًا (مطاعم · شيفات منزليين)،
--    يعني كانوا هيختفوا من الفلتر خالص. لو محمد عايزها تتطبق هناك كمان
--    لازم الأول تتضاف تسميات individual للمجموعات دي.
--
-- الترحيل: ١٥ إعلان منشور اتغيّروا كلهم لـ'individual' —
--   sale-vehicles ٦ (كانوا showroom) · sale-property ٥ · properties ٢ ·
--   tourism ١ · sale-marine ١. صفر تغيير في المطاعم والخدمات.
--   نسخة احتياطية: _backup_seller_class_20260901 (RLS مفعّل، صفر anon).
--
-- select id, seller_class from _backup_seller_class_20260901;  -- للرجوع

create or replace function public.compute_seller_class(p_listing uuid)
returns text
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare l record; v_group text; v_track text; v_cat_name text; v_phone text; v_car_count int; v_own_count int;
begin
  select li.seller_kind, li.seller_type, li.project_id, li.contact_phone, li.supplier_id,
         c.group_slug, c.track, c.name_ar, c.slug
  into l from listings li join categories c on c.id=li.category_id where li.id = p_listing;
  if l is null then return null; end if;
  v_group := l.group_slug; v_track := l.track; v_cat_name := l.name_ar;

  -- 🏭 صناعة (B2B): شركات دايمًا — أمر محمد ١/٩. فوق قاعدة «إعلان واحد = فرد».
  if v_track = 'industry' then return 'business'; end if;

  -- 🏠 بيع عقارات: من المطوّر أول حاجة (الإشارة project_id مش العدد)
  if v_group = 'sale-property' and l.project_id is not null then return 'developer'; end if;

  -- 👤 قاعدة «الرقم بإعلان واحد = فرد» — أقسام المخزون بس
  if v_group in ('sale-property','properties','sale-vehicles','vehicles',
                 'sale-marine','marine','shop','shop-home','tourism','equipment','events') then
    v_phone := coalesce(nullif(l.contact_phone,''),
                        (select p.phone from marketplace_suppliers m join profiles p on p.id=m.profile_id
                          where m.id = l.supplier_id));
    if v_phone is not null and v_phone <> 'grandfathered' then
      select count(*) into v_own_count from listings x
       where x.status = 'published'
         and (phone_core(x.contact_phone) = phone_core(v_phone)
              or (l.supplier_id is not null and x.supplier_id = l.supplier_id));
      if v_own_count <= 1 then return 'individual'; end if;
    end if;
  end if;

  if v_group = 'sale-property' then
    return case when l.seller_kind = 'business' then 'business' else 'individual' end;
  end if;

  -- 🚗 مركبات (بيع أو إيجار): معرض = ٢+ عربية بنفس الرقم
  if v_group in ('sale-vehicles','vehicles') then
    v_phone := coalesce(l.contact_phone, (select p.phone from marketplace_suppliers m join profiles p on p.id=m.profile_id where m.id=l.supplier_id));
    if v_phone is not null and v_phone <> 'grandfathered' then
      select count(*) into v_car_count from listings x join categories cx on cx.id=x.category_id
      where x.status='published' and cx.group_slug in ('sale-vehicles','vehicles')
        and (x.contact_phone = v_phone or x.supplier_id = l.supplier_id);
      if v_car_count >= 2 then return case when v_group='vehicles' then 'business' else 'showroom' end; end if;
    end if;
    if l.seller_kind = 'business' then return case when v_group='vehicles' then 'business' else 'showroom' end; end if;
    return 'individual';
  end if;

  -- 🍽️ مطاعم — بيزنس واحد = إعلان واحد، فقاعدة العدّ مابتنطبقش هنا
  if v_track = 'restaurants' or v_group = 'food' then
    return case when l.seller_kind='individual' or l.slug ~ 'home-chef|home-cook' or v_cat_name ~ 'شيف بيت|طبخ منزلي' then 'home_chef' else 'restaurant' end;
  end if;

  if v_group = 'services-medical-beauty' then
    if l.seller_kind = 'individual' then return 'individual'; end if;
    return case when v_cat_name ~ 'عيادة|طبيب|أسنان|جلدية|تحاليل|أشعة|علاج' then 'clinic' else 'center' end;
  end if;

  if v_group = 'home-services' then
    if l.seller_kind = 'individual' then return 'individual'; end if;
    return case when v_cat_name ~ 'ورشة|صيانة|تصليح|إصلاح|نجارة|حدادة|سباكة|كهرباء' then 'workshop' else 'business' end;
  end if;

  if v_group = 'services-professional' then
    return case when l.seller_kind='individual' then 'individual' else 'office' end;
  end if;

  if v_group in ('education','services-personal') then
    return case when l.seller_kind='individual' then 'individual' else 'center' end;
  end if;

  return case when l.seller_kind = 'business' then 'business' else 'individual' end;
end $function$;

-- ترحيل البيانات القايمة
-- create table _backup_seller_class_20260901 as select id, seller_class, now() saved_at
--   from listings where status='published' and seller_class is distinct from compute_seller_class(id);
-- update listings l set seller_class = compute_seller_class(l.id)
--  where l.status='published' and l.seller_class is distinct from compute_seller_class(l.id);
