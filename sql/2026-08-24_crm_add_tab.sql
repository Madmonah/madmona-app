-- ============================================================================
-- ٢٤ أغسطس ٢٠٢٦ — تاب «إضافة» في شاشة الموظف
-- ============================================================================
-- محمد: «دلوقتي عايزين الاضافة تتحط ك تابة جمب مكالماتي تفتح حسب التصنيف
--        الي موجود»
--
-- ده مكمّل قرار الصبح: المارد بطّل يسجّل إعلانات (شوف
-- `2026-08-24_marid_tool_switches_and_skip.sql`). التسجيل بقى من بني آدم —
-- إما صاحب الإعلان نفسه، أو **موظف مضمونة وهو معاه على التليفون**.
--
-- الشاشة: `/crm` → تاب «إضافة» جمب «مكالمات» و«تاسكات».
--
-- ============================== إزاي بيشتغل ================================
--   الموظف بيدوس على قسم → بيفتح **نفس ويزارد `/add-listing`** اللي العملاء
--   بيستخدموه، مش فورم تاني:
--     /add-listing?cat=<slug>&phone=<رقم العميل>&utm_source=crm&utm_medium=staff
--   `cat` بيفتح الويزارد على القسم، و`phone` بيتحط في بيانات التواصل فمابيسألش
--   عليه تاني. الاتنين متقروين أصلًا في `AddListingClient` عند أول تحميل —
--   مااتضافش أي باراميتر جديد للويزارد.
--
--   ⚠️ ويزارد واحد عن قصد: أي قاعدة جديدة في الإضافة (خانات إجبارية، أسعار،
--      صور) بتسري على الفريق والعملاء مع بعض. فورم تاني للفريق كان هيبقى
--      نسخة تانية تقع ورا كل تعديل.
--
-- ============================== الربط =====================================
--   `crm_add_menu(p_as uuid default null)` بترجّع:
--     mine[]     أقسام تخصص الموظف   (من `crm_staff_specialties`)
--     rest[]     باقي الأقسام         (لو اتكلّم مع حد بره تخصصه)
--     unmapped[] أقسام مالهاش تخصص    (مفروض تفضل فاضية — دي جرس إنذار)
--
--   الربط تخصص ↔ قسم بيتعمل بـ`crm_specialty_for_cat()`، يعني مصدره
--   `crm_specialties.match_cats` اللي بتتعدّل من `/admin/crm`.
--   **مفيش ولا slug متكتّب في الشاشة ولا في الدالة** — أي قسم جديد في
--   `categories` بيبان لوحده، وأي تعديل في التوزيع بيتنفّذ من غير نشر.
--
--   `p_as` للموزّع بس — نفس قاعدة `crm_my_queue` بالظبط.
--
-- ========================= إصلاح بيانات لزم للتاب ==========================
--   ٣ أقسام رئيسية ماكانش ليها تخصص خالص، يعني كانت **هتختفي من التاب**:
--     contractors (مقاولات) · education-courses (تعليم) → services
--     fashion-rental (ملابس للتأجير)                    → tourism
--   اتضافوا لـ`match_cats`. دلوقتي ٦٥ قسم رئيسي كلهم متغطّيين، و`unmapped`
--   بترجّع فاضية.
--
--   ⚠️ ده بيأثّر على `crm_classify_contacts()` كمان (نفس الجدول) — أي رقم
--      جاي من مقاولات/تعليم هيتصنّف «خدمات» من دلوقتي. الأرقام المتصنّفة
--      قبل كده مابتتلمسش.
--
-- ============================== اللي اتأكد ================================
--   شهد (عقارات) → mine = ٩ أقسام (سكني/تجاري/صناعي/سياحي × إيجار وبيع
--                  + مساحات عمل) · rest = ٨ تخصصات
--   سامية        → mine فاضية (**لسه مفيش قسم متحدّدلها**) فالشاشة بتوريها
--                  الأقسام كلها وبتقولها السبب، مش بتسيبها في صفحة فاضية
--   unmapped     → []
--
-- 🔍 ملحوظة على الشاشة: «عقارات سكنية» بتظهر مرتين بنفس الاسم — واحدة إيجار
--    وواحدة بيع. عشان كده الأقسام متجمّعة تحت `group_name_ar` في الكارت،
--    من غيره الموظف مش هيعرف يفرّق.
-- ============================================================================

create or replace function public.crm_add_menu(p_as uuid default null)
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $fn$
declare
  v_me uuid := auth.uid(); v_disp boolean; v_view uuid; v jsonb;
begin
  if not (public.is_madmona_staff() or public.is_admin_or_service()) then
    return jsonb_build_object('ok', false, 'error', 'الشاشة دي لفريق مضمونة');
  end if;

  select coalesce(is_dispatcher,false) into v_disp from crm_staff_settings where profile_id = v_me;
  v_disp := coalesce(v_disp, false);
  v_view := case when v_disp and p_as is not null
                  and exists (select 1 from crm_staff() where profile_id = p_as)
                 then p_as else v_me end;

  with cats as (
    select c.slug, c.name_ar, c.group_name_ar, c.display_order,
           public.crm_specialty_for_cat(c.slug) as sp,
           exists (select 1 from categories k
                    where k.parent_id = c.id and coalesce(k.is_active,true)) as has_kids
      from categories c
     where c.parent_id is null and coalesce(c.is_active,true)
  ),
  mine_keys as (
    select ss.specialty from crm_staff_specialties ss
     where ss.profile_id = v_view and ss.active
  ),
  grouped as (
    select s.key, s.name_ar, s.sort_order,
           (s.key in (select specialty from mine_keys)) as is_mine,
           coalesce((select jsonb_agg(jsonb_build_object(
                       'slug', x.slug, 'name_ar', x.name_ar,
                       'group_name_ar', x.group_name_ar, 'has_kids', x.has_kids)
                     order by x.display_order, x.name_ar)
                       from cats x where x.sp = s.key), '[]'::jsonb) as cats
      from crm_specialties s
     where s.active
  )
  select jsonb_build_object('ok', true,
    'viewing', v_view,
    'viewing_name', (select full_name from crm_staff() x where x.profile_id = v_view),
    'mine', coalesce((select jsonb_agg(jsonb_build_object('key',g.key,'name_ar',g.name_ar,'cats',g.cats)
                        order by g.sort_order)
                        from grouped g where g.is_mine and jsonb_array_length(g.cats) > 0), '[]'::jsonb),
    'rest', coalesce((select jsonb_agg(jsonb_build_object('key',g.key,'name_ar',g.name_ar,'cats',g.cats)
                        order by g.sort_order)
                        from grouped g where not g.is_mine and jsonb_array_length(g.cats) > 0), '[]'::jsonb),
    'unmapped', coalesce((select jsonb_agg(jsonb_build_object(
                            'slug',x.slug,'name_ar',x.name_ar,'group_name_ar',x.group_name_ar)
                          order by x.name_ar) from cats x where x.sp is null), '[]'::jsonb)
  ) into v;
  return v;
end $fn$;

-- ─────────────── إصلاح الأقسام اللي ماكانش ليها تخصص ───────────────
update crm_specialties
   set match_cats = array(select distinct unnest(match_cats || array['contractors','education']))
 where key = 'services';
update crm_specialties
   set match_cats = array(select distinct unnest(match_cats || array['fashion-rental']))
 where key = 'tourism';

-- ─────────────── العقد: crm_health() يحرسها ───────────────
insert into crm_contract (kind, name, detail, note) values
 ('function','crm_add_menu','','بتغذّي تاب «إضافة» في /crm — الأقسام حسب تخصص الموظف')
on conflict do nothing;

-- ─────────────────────────── فحوصات ───────────────────────────
-- كل قسم رئيسي واقع على تخصص؟ (المفروض مفيش سطر بـ«—»)
--   select coalesce(crm_specialty_for_cat(c.slug),'—') sp, count(*)
--     from categories c where c.parent_id is null and coalesce(c.is_active,true)
--    group by 1 order by 2 desc;
--
-- قايمة موظف بعينه:
--   select set_config('request.jwt.claims','{"sub":"<profile uuid>","role":"authenticated"}',true);
--   select jsonb_pretty(crm_add_menu());
