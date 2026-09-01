-- 🏷️ (١ سبتمبر ٢٠٢٦) فلتر نوع البائع — تابات المطاعم والشركات مش شغالة
--
-- محمد: «التابات بتاعت الفلتر الكبيرة في المطاعم والشركات مش شغالة».
--
-- الجذر: seller_class_filters كانت بتفلتر بـgroup_slug بس، والفرونت
-- مابيعرضش كروت المجموعات غير لما التراك يكون فيه أكتر من رووت
-- (showGroupHeadings = rootGroups.length > 1). المطاعم والصناعة عندهم
-- رووت واحد → المستخدم عمره ما بيقدر يختار مجموعة → الفلتر عمره ما بيظهر.
-- p_track كان معرّف في التوقيع من يوم ما اتعملت ومستخدمش في الجسم.
--
-- (١) الدالة بقت تقبل النطاق بالتراك لما مفيش مجموعة مختارة.
-- (٢) صفوف 'track:<اسم>' في seller_class_labels للتسمية على مستوى التراك —
--     من غيرها دمج المجموعات بينتج «معارض» (قوارب) و«معارض» (عربيات)
--     جنب بعض في تاب البيع.
--
-- ⚠️ التوقيع ما اتغيرش (text, text default null) — مفيش أوفرلود جديد.
-- النتيجة بعد التطبيق (إعلانات منشورة):
--   بيع     : أفراد ١٣ · شركات ومعارض ١٥٤ · معارض عربيات ٢٧ · من المطوّر ١٢٧
--   إيجار   : أفراد ٢٢ · شركات ٥٨
--   خدمات   : أفراد ٤ · شركات ٩ · مراكز ٢ · عيادات ١ · مكاتب ١
--   مطاعم   : مطاعم ٢٠ · شيفات منزليين ٨
--   شركات   : شركات ومصانع ٨٦ · أفراد ٠ ← خيار واحد بس فيه إعلانات،
--             فالفرونت بيخفي الفلتر (فلتر بخيار واحد = UI ميت).

insert into seller_class_labels (group_slug, class_key, label_ar, label_i18n, display_order) values
  ('track:products','individual','أفراد',      '{"en":"Individuals","uk":"Приватні особи","ru":"Частные лица","ja":"個人","zh":"个人"}'::jsonb, 1),
  ('track:products','business',  'شركات ومعارض','{"en":"Companies & Dealers","uk":"Компанії та дилери","ru":"Компании и дилеры","ja":"企業・ディーラー","zh":"公司与经销商"}'::jsonb, 2),
  ('track:products','showroom',  'معارض عربيات','{"en":"Car Showrooms","uk":"Автосалони","ru":"Автосалоны","ja":"自動車ディーラー","zh":"车行"}'::jsonb, 3),
  ('track:products','developer', 'من المطوّر',  '{"en":"From Developer","uk":"Від забудовника","ru":"От застройщика","ja":"デベロッパー直販","zh":"开发商直售"}'::jsonb, 4),
  ('track:rentals','individual','أفراد',        '{"en":"Individuals","uk":"Приватні особи","ru":"Частные лица","ja":"個人","zh":"个人"}'::jsonb, 1),
  ('track:rentals','business',  'شركات',        '{"en":"Companies","uk":"Компанії","ru":"Компании","ja":"企業","zh":"公司"}'::jsonb, 2),
  ('track:industry','individual','أفراد',       '{"en":"Individuals","uk":"Приватні особи","ru":"Частные лица","ja":"個人","zh":"个人"}'::jsonb, 1),
  ('track:industry','business',  'شركات ومصانع','{"en":"Companies & Factories","uk":"Компанії та заводи","ru":"Компании и заводы","ja":"企業・工場","zh":"公司与工厂"}'::jsonb, 2)
on conflict (group_slug, class_key) do update
  set label_ar = excluded.label_ar, label_i18n = excluded.label_i18n, display_order = excluded.display_order;

create or replace function public.seller_class_filters(p_group text, p_track text default null)
returns jsonb
language sql
stable
security definer
set search_path to 'public'
as $function$
  with scope as (
    -- نطاق العدّ: المجموعة لو المستخدم اختارها، وإلا التراك كله.
    -- خريطة التراكات لازم تطابق الفرونت (products↔sales · rentals↔hybrid).
    select c.id, c.group_slug
    from categories c
    where case
      when p_group is not null then c.group_slug = p_group
      when p_track is not null and p_track <> 'all' then c.track = any (
        case p_track
          when 'products' then array['products','sales']
          when 'rentals'  then array['rentals','hybrid']
          else array[p_track]
        end
      )
      else false
    end
  ),
  src as (
    -- الأولوية لصف 'track:<اسم>' لو موجود — الدمج بيكرّر التسميات.
    select s.* from seller_class_labels s
    where p_group is null and p_track is not null
      and s.group_slug = 'track:' || p_track
    union all
    select s.* from seller_class_labels s
    where s.group_slug in (select distinct group_slug from scope)
      and not exists (
        select 1 from seller_class_labels x
        where p_group is null and p_track is not null
          and x.group_slug = 'track:' || p_track
      )
  ),
  labs as (
    select distinct on (s.class_key) s.class_key, s.label_ar, s.label_i18n, s.display_order
    from src s order by s.class_key, s.display_order, s.group_slug
  )
  select coalesce(jsonb_agg(jsonb_build_object(
    'key', l.class_key, 'label', l.label_ar, 'label_i18n', l.label_i18n,
    'count', (select count(*) from listings li
              where li.status = 'published'
                and li.category_id in (select id from scope)
                and li.seller_class = l.class_key)
  ) order by l.display_order, l.class_key), '[]')
  from labs l;
$function$;
