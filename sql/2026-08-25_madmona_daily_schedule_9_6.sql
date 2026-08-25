-- =====================================================================
-- جدول التاسكات اليومي لفريق مضمونة — من ٩ صباحًا لـ٦ مساءً
-- ٢٥ أغسطس ٢٠٢٦
-- =====================================================================
-- محمد: «انا محتاج اعمل جدول تاسكات يومي للموظفين اللي عندنا علمًا بان
--        مواعيدهم من ٩ - ٦» — والعرض «على الأبليكيشن نفسه في صفحة شغلي».
--
-- الجذر اللي بيتقفل هنا:
--   فريق مضمونة كان بياخد تاسكات **قالب محلات تجزئة**:
--     • `employee_role_templates` (role='staff'/'owner', industry='any')
--       → «تجهيز مكان الشغل بداية اليوم» · «تنضيف وترتيب آخر اليوم» ·
--         «مراجعة المخزون وطلب النواقص» — من غير أي ميعاد (due_time=NULL).
--     • وكيل الـAI `/api/agents/generate-tasks` بيزوّد فوقيهم تاسكات
--       مكتب عامة كل يوم بمواعيد عشوائية ومتكررة مع اللي فوق.
--   يعني الموظف بيفتح «شغلي» فيلاقي كلام مالوش علاقة بشغله ومن غير ساعات.
--
-- الحل: جدول **مكتوب بإيدنا، سطر لكل تاسك بميعاده**، في
--       `recurring_task_templates` (هي الجدول الوحيد اللي فيه due_time +
--       weekdays)، بيتولّد كل يوم من جوب `generate-recurring-tasks`.
--       الأسبوع: الأحد–الخميس (dow 0..4) · الراحة: ١–٢ ظهرًا.
--
-- ملاحظات مهمة:
--   • مندوبات المبيعات بياخدوا كمان ٤ تاسكات من `generate_sales_daily_tasks()`
--     (☎️ ١١:٠٠ · 🔄 ١٤:٠٠ · 💬 ١٦:٠٠ · 📝 ١٧:٠٠) — الجدول ده **مكمّل** ليهم
--     مش مكرّر، عشان كده ساعاتهم هنا ٩:٠٠ · ٩:٣٠ · ١٠:٠٠ · ١٢:٠٠ · ١٥:٠٠ · ١٧:٣٠.
--   • قسم المحتوى والسوشيال متكتوب في آخر الملف ومتقفول — يتفعّل بسطر
--     واحد أول ما يتحدد مين شايله.
--   • تريجر `trg_daily_tasks_dedupe` بيمنع تكرار نفس العنوان لنفس اليوم.
-- =====================================================================

begin;

-- ---------------------------------------------------------------------
-- (١) وقف مصدر التاسكات العامة لموظفي مضمونة — من غير ما نلمس عملاء B2B
--     المسار التاني (وكيل الـAI) متقفول في route.ts بنفس الشرط.
-- ---------------------------------------------------------------------
create or replace function public.generate_daily_tasks_pulse()
 returns jsonb
 language plpgsql
 security definer
 set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  v_emp record; v_sup record; v_task jsonb; v_tpl jsonb;
  v_created int := 0; v_emps int := 0; v_fixed int := 0;
begin
  -- (أ) قوالب الأدوار → task_kind = fixed
  --     🚫 (٢٥/٨/٢٠٢٦) مورّد المنصة نفسه مستثنى: فريق مضمونة ليه جدول
  --        ساعة بساعة في `recurring_task_templates`، وقوالب الأدوار دي
  --        مكتوبة لمحلات وصالونات (مخزون · تنضيف محطة) مش لفريق منصة.
  for v_emp in (
    select be.id, be.branch_id, be.role, s.industry
    from business_employees be
    join suppliers s on s.id = be.supplier_id
    where s.status = 'approved' and be.status = 'active' and be.role is not null
      and coalesce(s.is_platform_owner, false) = false
  ) loop
    select t.default_tasks into v_tpl from employee_role_templates t
    where t.industry = v_emp.industry and t.role = v_emp.role;
    if v_tpl is null then
      select t.default_tasks into v_tpl from employee_role_templates t
      where t.industry = 'any' and t.role = v_emp.role;
    end if;
    if v_tpl is null then continue; end if;
    v_emps := v_emps + 1;
    for v_task in select * from jsonb_array_elements(v_tpl) loop
      if not exists (
        select 1 from daily_tasks d
        where d.employee_id = v_emp.id and d.task_date = current_date and d.title_ar = v_task->>'title_ar'
      ) then
        insert into daily_tasks (employee_id, branch_id, task_date, title_ar, priority, is_auto_generated, task_kind)
        values (v_emp.id, v_emp.branch_id, current_date, v_task->>'title_ar', coalesce(v_task->>'priority','medium'), true, 'fixed');
        v_created := v_created + 1;
      end if;
    end loop;
  end loop;

  -- (ب) المهام الثابتة المخصوصة لكل موظف (employee_fixed_tasks) — بتتجسد fixed برضه
  for v_sup in (
    select distinct eft.supplier_id
    from employee_fixed_tasks eft
    join suppliers s on s.id = eft.supplier_id
    where eft.active and s.status = 'approved'
      and coalesce(s.is_platform_owner, false) = false
      and coalesce(eft.last_materialized_date, '1900-01-01'::date) < current_date
  ) loop
    v_fixed := v_fixed + materialize_fixed_tasks(v_sup.supplier_id, current_date);
  end loop;

  return jsonb_build_object('employees_covered', v_emps, 'template_tasks_created', v_created, 'fixed_tasks_materialized', v_fixed);
end $function$;

commit;

-- ---------------------------------------------------------------------
-- (٢) الجدول: سطر لكل تاسك بميعاده — الأحد–الخميس (dow 0..4)
--     الأقسام: sales · tech · ops · lead (إشراف وتوزيع) · owner
-- ---------------------------------------------------------------------
begin;

with sup as (
  select id from suppliers where coalesce(is_platform_owner,false) limit 1
),
emp as (
  select e.id, e.branch_id, e.full_name,
    case
      when e.full_name in ('نورا محمد','مديحة عبدالفتاح','عبير ايهاب','شهد محمد عبدالحكيم') then 'sales'
      when e.full_name = 'ايمان محمد احمد محمد'                                             then 'tech'
      when e.full_name = 'محمد غبدالجابر عبدالحمد'                                          then 'ops'
      when e.full_name in ('احمد سامي','سامية ايهاب السيد')                                 then 'lead'
      when e.full_name = 'محمد ناصف'                                                        then 'owner'
    end as bucket
  from business_employees e, sup
  where e.supplier_id = sup.id and e.status = 'active' and e.employee_type = 'human'
),
plan(bucket, due_time, priority, title_ar, description) as (values
  -- ── مبيعات وتواصل مع العملاء ─────────────────────────────────────
  -- (مكمّل لتاسكات generate_sales_daily_tasks: ☎️١١ · 🔄١٤ · 💬١٦ · 📝١٧)
  ('sales','09:00','high'  ,'ابدأي يومك: سجّلي حضورك وافتحي تاب «مكالماتي»','التاب في /crm — شوفي كام رقم مستنيكي النهارده وكام معاد متأخر.'),
  ('sales','09:30','high'  ,'ردّي على رسايل واتساب اللي جات من امبارح','أي رسالة عدّى عليها أكتر من ١٢ ساعة من غير رد = عميل بيروح لغيرنا.'),
  ('sales','10:00','medium','جهّزي أرقام النهارده: راجعي ملاحظة آخر مكالمة لكل رقم','قبل ما تمسكي التليفون — تعرفي كل واحد وقف فين المرة اللي فاتت.'),
  ('sales','12:00','high'  ,'موجة تانية: كلّمي اللي مردّش الصبح','مكالمة تانية + رسالة واتساب قصيرة لكل رقم مردّش.'),
  ('sales','13:00','low'   ,'☕ راحة ساعة (١ لـ٢)',null),
  ('sales','15:00','high'  ,'حوّلي أي عميل جاهز لإعلان أو طلب فعلي على مضمونة','العميل المهتم يتسجّل النهارده — مش «هكلّمه بكرة».'),
  ('sales','17:30','medium','قفل اليوم: حدّثي حالة كل رقم وحدّدي أرقام بكرة','مفيش رقم يقفل اليوم من غير حالة واضحة.'),

  -- ── دعم فني وتكنولوجيا ───────────────────────────────────────────
  ('tech','09:00','high'  ,'افتحي النظام وتأكدي إن الواتساب والموقع شغالين','جلسة الواتساب · الموقع · الشات · الإشعارات — لو حاجة واقعة بلّغي فورًا.'),
  ('tech','09:30','high'  ,'راجعي التذاكر المفتوحة ورتبيها بالأولوية','العاجل الأول: أي حاجة بتوقف عميل أو بتوقف مندوب عن شغله.'),
  ('tech','11:00','high'  ,'حلّي التذاكر العاجلة وردّي على أصحابها','الرد جزء من الحل — صاحب المشكلة يعرف إنها اتاخدت.'),
  ('tech','13:00','low'   ,'☕ راحة ساعة (١ لـ٢)',null),
  ('tech','14:00','medium','نفّذي الطلبات التقنية اللي طلبها الفريق','حسابات · صلاحيات · تعديلات صغيرة على الشاشات.'),
  ('tech','16:00','medium','اختبار سريع: تسجيل دخول + إضافة إعلان + الشات','جرّبي بنفسك زي ما العميل بيجرّب — مش بالقراءة.'),
  ('tech','17:30','medium','تقرير اليوم: المشاكل والحلول واللي لسه مفتوح',null),

  -- ── إدخال بيانات وتشغيل ──────────────────────────────────────────
  ('ops','09:00','high'  ,'افتح لوحة الإدارة وشوف الإعلانات المستنية مراجعة','الإعلان المستني مراجعة = بايع مستني فلوسه.'),
  ('ops','09:30','high'  ,'راجع إعلانات امبارح: صور · سعر · تصنيف · مكان','أي إعلان ناقص حاجة يترجع لصاحبه برسالة واضحة بالناقص.'),
  ('ops','11:00','medium','ادخل بيانات العملاء والموردين الجداد على النظام',null),
  ('ops','12:00','medium','نضّف الإعلانات المكررة أو الناقصة وكلّم صاحبها',null),
  ('ops','13:00','low'   ,'☕ راحة ساعة (١ لـ٢)',null),
  ('ops','14:00','high'  ,'راجع طلبات انضمام الموردين ووثّق الناقص',null),
  ('ops','16:00','medium','حدّث الأسعار وحالة الإعلانات (متاح · متباع · موقوف)','الإعلان المتباع لو فضل ظاهر بيضيّع ثقة العميل.'),
  ('ops','17:30','medium','تقرير اليوم: كام إعلان اتراجع واتنشر واترفض',null),

  -- ── إشراف وتوزيع ─────────────────────────────────────────────────
  ('lead','09:15','high'  ,'راجع حضور الفريق ومين متأخر','من تاب الحضور — أي غياب من غير إذن يتسجّل النهارده مش آخر الشهر.'),
  ('lead','09:45','high'  ,'وزّع أرقام وليدز النهارده على المندوبين','التوزيع الصح: مطاعم وتجميل → نورا · طبي ومصانع → مديحة وعبير · عقارات → عبير.'),
  ('lead','12:00','medium','جولة متابعة: كل مندوب خلّص كام مكالمة',null),
  ('lead','13:00','low'   ,'☕ راحة ساعة (١ لـ٢)',null),
  ('lead','15:00','high'  ,'راجع الطلبات المستنية: إجازة · إذن · سلفة · عهدة','الطلب اللي بيقعد أكتر من يومين من غير رد بيتحوّل لمشكلة.'),
  ('lead','17:00','high'  ,'راجع تاسكات الفريق: اللي اتقفل واللي فضل',null),
  ('lead','17:45','medium','ابعت تقرير قفل اليوم لمحمد','أرقام مش كلام: مكالمات · ليدز جديدة · إعلانات · مشاكل.'),

  -- ── المنصة (محمد) ────────────────────────────────────────────────
  ('owner','09:30','high'  ,'راجع أرقام امبارح: ليدز · إعلانات جديدة · محادثات',null),
  ('owner','12:00','medium','راجع الطلبات المستنية موافقتك',null),
  ('owner','17:30','medium','راجع تقرير قفل اليوم من الفريق',null)
)
insert into recurring_task_templates
  (supplier_id, branch_id, employee_id, title_ar, description, priority, due_time,
   task_kind, frequency, weekdays, is_active)
select sup.id, emp.branch_id, emp.id, p.title_ar, p.description, p.priority, p.due_time::time,
       'fixed', 'weekly', '{0,1,2,3,4}'::int[], true
from emp
join plan p on p.bucket = emp.bucket
cross join sup
where emp.bucket is not null;

commit;

-- ---------------------------------------------------------------------
-- (٣) تفعيل جوب التوليد اليومي + تنضيف تاسكات النهارده العامة
-- ---------------------------------------------------------------------
begin;

update orchestrator_jobs
   set enabled = true,
       title   = 'جدول التاسكات اليومي — الأحد–الخميس من ٩ لـ٦ (recurring_task_templates)'
 where job_key = 'generate-recurring-tasks';

-- تاسكات النهارده اللي جات من القوالب العامة ولسه مفتوحة → تتشال.
-- بنسيب: تاسكات المبيعات (☎️ 🔄 💬 📝) · تاسكات الحجوزات · تاسكات الشات ·
--        وأي حاجة الموظف قفلها فعلًا (التاريخ مايتزوّرش).
delete from daily_tasks d
using business_employees e, suppliers s
where d.employee_id = e.id
  and e.supplier_id = s.id
  and coalesce(s.is_platform_owner,false)
  and d.task_date = (now() at time zone 'Africa/Cairo')::date
  and d.status = 'pending'
  and d.is_auto_generated = true
  and d.source_booking_id is null
  and d.task_kind in ('fixed','variable')
  and d.title_ar !~ '^[☎🔄💬📝]';

-- توليد جدول النهارده فورًا (الجوب هيتولاه من بكرة الساعة ٤ص)
select public.generate_recurring_tasks((now() at time zone 'Africa/Cairo')::date);

commit;

-- =====================================================================
-- (٤) قسم المحتوى والسوشيال ميديا — جاهز ومتقفول
-- =====================================================================
-- لسه محدش متحدد شايله. أول ما يتحدد، شيل التعليق وحط اسمه في السطر
-- الأول، والجدول هيشتغل من تاني يوم زي باقي الأقسام.
--
-- with sup as (select id from suppliers where coalesce(is_platform_owner,false) limit 1),
-- emp as (select e.id, e.branch_id from business_employees e, sup
--         where e.supplier_id = sup.id and e.full_name = 'اسم الموظف هنا'),
-- plan(due_time, priority, title_ar, description) as (values
--   ('09:00','high'  ,'راجع تفاعل بوستات امبارح ورد على الكومنتات والرسايل',null),
--   ('09:30','high'  ,'جهّز محتوى النهارده: صورة/فيديو + النص + الهاشتاجات',null),
--   ('11:00','high'  ,'انشر بوست الصبح على فيسبوك وانستجرام','الميعاد الثابت أهم من الكمية.'),
--   ('12:00','medium','صوّر أو جمّع مادة خام لبوستات بكرة',null),
--   ('13:00','low'   ,'☕ راحة ساعة (١ لـ٢)',null),
--   ('14:00','medium','حوّل أحسن إعلان على مضمونة لبوست سوشيال',null),
--   ('16:00','high'  ,'انشر بوست بعد الضهر وتابع أول ساعة تفاعل',null),
--   ('17:30','medium','تقرير اليوم: وصول · تفاعل · رسايل جات من السوشيال',null)
-- )
-- insert into recurring_task_templates
--   (supplier_id, branch_id, employee_id, title_ar, description, priority, due_time,
--    task_kind, frequency, weekdays, is_active)
-- select sup.id, emp.branch_id, emp.id, p.title_ar, p.description, p.priority, p.due_time::time,
--        'fixed', 'weekly', '{0,1,2,3,4}'::int[], true
-- from emp cross join plan p cross join sup;

-- =====================================================================
-- (٥) 🐞 عدّاد «خلصت النهارده» كان دايمًا صفر — اتصلح مع نفس الشغل
-- =====================================================================
-- الجذر: `get_my_work_home` بيعدّ daily_tasks بـ status='done'، بينما كل
--        مسارات القفل (complete_my_task · admin_update_task_status ·
--        شاشة flow-tasks) بتكتب 'completed'. 'done' دي حالة flow_tasks
--        مش daily_tasks. يعني الموظف يقفل ١١ تاسك والشاشة تقول صفر —
--        وده كان هيخلي الجدول الجديد يبان كأنه محدش بيعمله.
-- الإصلاح: العدّاد يقبل الاتنين.
do $$
declare v_def text;
begin
  select pg_get_functiondef(p.oid) into v_def
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.proname = 'get_my_work_home';
  if v_def is null then raise exception 'get_my_work_home مش موجودة'; end if;
  if position('d3.status = ''done''' in v_def) = 0 then
    raise notice 'الإصلاح متعمول قبل كده — مفيش تغيير';
    return;
  end if;
  v_def := replace(v_def, 'd3.status = ''done''', 'd3.status in (''completed'',''done'')');
  execute v_def;
end $$;

-- =====================================================================
-- (٦) القفل اللي اتفك
-- =====================================================================
-- `generate-recurring-tasks` كانت مقفولة ضمن «إيقاف فئة work» (٣ أغسطس
-- ٢٠٢٦) — قفل جماعي مش قرار مخصوص عليها. اتفكت بأمر محمد النهارده
-- (٢٥ أغسطس) لأنها هي اللي بتنزّل الجدول ده كل يوم:
--   select public.unlock_orchestrator_job('generate-recurring-tasks', true);
-- =====================================================================
-- التحقق بعد التشغيل:
--   select e.full_name, t.due_time, t.title_ar
--     from daily_tasks t join business_employees e on e.id=t.employee_id
--    where e.supplier_id = (select id from suppliers where is_platform_owner)
--      and t.task_date = current_date
--    order by e.full_name, t.due_time;
-- =====================================================================

-- =====================================================================
-- (٧) تصحيح ٢٥/٨ بعد المراجعة — محمد عبدالجابر **أوفيس بوي**
-- =====================================================================
-- محمد: «محمد ده الأوفيس بوي». كان واخد جدول إدخال البيانات والتشغيل
-- بالغلط (مراجعة إعلانات · طلبات موردين · تحديث أسعار). اتبدّل بالكامل.
-- الجدول الصح متسجّل في recurring_task_templates:
--   ٠٩:٠٠ فتح المكتب وتجهيزه · ٠٩:٣٠ المشروبات · ١٠:٣٠ نضافة الحمامات
--   والمطبخ · ١١:٣٠ المشاوير · ١٢:٣٠ غرفة الاجتماعات · ١٣:٠٠ راحة
--   · ١٤:٣٠ جولة تانية · ١٦:٠٠ بلاغ النواقص · ١٧:٣٠ قفل اليوم.
-- قسم «إدخال البيانات والتشغيل» بقى **من غير حد** — الجدول بتاعه لسه
-- مكتوب في القسم (٢) فوق ومستنّي مين يشيله.

-- =====================================================================
-- (٨) الجدول بقى متعدّل من الأبليكيشن
-- =====================================================================
-- شاشة /admin/business-finance/[supplierId]/schedule («جدول التاسكات
-- اليومي») بتعرض القالب كله مجمّع بالموظف ومرتّب بالميعاد، وبتعدّله في
-- المكان. الملف ده بقى **التاريخ**، مش الطريقة الوحيدة للتعديل.
--   • recurring_task_update  — تعديل سطر (كان ناقص: add/delete/toggle بس)
--   • recurring_tasks_generate_today(supplier) — زرار «ولّد تاسكات النهارده»
--   • 🔐 كل دوال recurring_task_* بقت تفحص can_manage_business_team()
--     — كانت SECURITY DEFINER ومتاحة لأي حساب مسجّل من غير أي فحص، يعني
--       أي عميل يقدر يقرا أو يغيّر جدول موظفين أي بيزنس تاني بـsupplier_id.

-- =====================================================================
-- (٩) ٢٥/٨ مساءً — تاسك البوستات بقت بتقرا النظام المتفق عليه
-- =====================================================================
-- محمد: «في التفاصيل مش جايب الجروبات اللي المفروض تنشر فيها ولا
-- الاسكريبت زي ما اتفقنا». النظام موجود من زمان والتاسك كانت متجاهلاه:
--   • `social_packs` — ٥٨٥ اسكريبت جاهز (٣ نسخ: عائلي/شباب/عاجل +
--     هاشتاجات) بيتولد تلقائي مع نشر الإعلان.
--   • `social_groups_catalog` — ٣٦ جروب فيسبوك نشط بالتصنيف.
-- `task_dynamic_detail()` بقت بتجيب الباك الجاهز (نسخة العائلة للبوست
-- ونسخة الشباب للستوري) + جروبات تصنيف الإعلان بالترتيب.
-- ⚠️ ٣٥/٣٦ لينك جروب في الكتالوج «PLACEHOLDER» — الأسماء حقيقية
-- واللينكات متسجلتش. التاسك بتقول «دوّري بالاسم 🔎» وبتطلب من الموظفة
-- تبعت اللينك الحقيقي أول ما تلاقيه عشان يتسجل. **املأ اللينكات في
-- social_groups_catalog.group_url وهتظهر تلقائي في التاسكات.**
