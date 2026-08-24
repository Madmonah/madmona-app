-- ============================================================================
-- ٢٤ أغسطس ٢٠٢٦ — حاجتين في المارد:
--   (أ) مفاتيح أدوات المارد   → إلغاء إضافة الإعلانات من المارد
--   (ب) قاعدة السكوت          → المارد مايردّش على الفريق ولا على مارد تاني
-- ============================================================================
--
-- ══════════════════ (أ) مفاتيح الأدوات ═════════════════════════════════════
-- محمد: «من الاخر انا شايف ان المارد مش نافع انه يضيف اعلانات ويستدعي ادوات
--        فالغية انا هخلي الاضافة تكون عن طريق صاحب الاعلان»
--
-- ليه مفتاح مش حذف من الكود؟
--   ١) الرجوع بيبقى ضغطة زرار بدل نشر جديد.
--   ٢) تعليمات تسجيل الإعلان مكتوبة في **١٥ مكان** في
--      `src/lib/agent-prompts/customer-concierge.ts` و`marid-brain.ts`.
--      حذف الأداة لوحده كان هيسيب البرومبت بيأمر المارد ينادي أداة مش
--      موجودة — والنتيجة وعود كاذبة للعميل، نفس عيب «الكلام مش تسجيل»
--      بتاع ١٨ و١٩ أغسطس بالظبط.
--
-- القفل بيتعمل بـ**تلات حراس مع بعض** (`src/lib/marid-tool-settings.ts`):
--   ١) الأداة ماتتبعتش لكلود أصلًا      → `filterEnabledTools`
--   ٢) تعليمة بديلة تتحقن آخر البرومبت  → `maridDisabledToolsPrompt`
--   ٣) حارس في `runMaridTool`           → `blockedToolResult`
--   وكمان حارس الوعد الكاذب في `marid-brain.ts` بقى يعرف إن الأداة مقفولة،
--   فبيصحّح للمارد بـ«قوله يضيف بنفسه» بدل «نادِ الأداة».
--
-- المطفي دلوقتي: create_listing_draft · add_menu_items
-- الشاشة: /admin/marid → كارت «🔌 أدوات المارد»
--
-- ══════════════════ (ب) قاعدة السكوت ═══════════════════════════════════════
-- محمد: «أي رسالة تيجي للمارد من الفريق بتاعنا مش عايزه يتعامل معاها ابد
--        يعديها عادي واي رسالة تيجي من مارد لمارد نفس الكلام واي رقم اتربط
--        مارد قبل كده برضو مش عايز المارد يرد عليه»
--
-- اللي كان موجود: `isMaridNumber()` — بتشوف `wa_number_configs` بس. تلات ثقوب:
--   • أرقام الفريق — المارد كان بيردّ عليهم كأنهم عملاء.
--   • أرقام اتربطت مارد واتشالت — لقينا **٢٠١٢٨١٨١٤٦٧٥** (١٥ رسالة، ١ أغسطس)
--     لسه كان بيترد عليه.
--   • مفيش طريقة نسكّت رقم يدويًا.
--
-- ⚠️ **الاستثناء للأدمن اتشال** — كان `isMaridNumber(phone) && !isAdmin(phone)`
--    عشان محمد يبعت أوامر الأدمن من ٠١٠٠٢٢٢٩٩٨٢. التعليمة مافيهاش استثناء،
--    فالرقم بقى مسكّت زي أي رقم مارد → **أوامر الأدمن من واتساب وقفت**.
--    الرجوع من غير نشر: صف في `marid_skip_exceptions`.
--
-- متأكد منه بتجربة اترجعت (٢٤ أغسطس):
--   ٢٠١٠٠٢٢٢٩٩٨٢ · ٠١٠٠٢٢٢٩٩٨٢ · +20 102 622 2337  → marid_number
--   ٢٠١٢٨١٨١٤٦٧٥                                    → ex_marid_number
--   سامية · شهد · عبير · أحمد سامي                   → team
--   ٠١٢٠٨١٨١٤١٦ (عميل)  ·  '' (فاضي)                → NULL (رد عادي)
--   وبعد إضافة صف في marid_skip_exceptions           → NULL، وبعد حذفه رجع يتسكّت
--
-- 🔍 لقطة جانبية: رقم **إيمان** (+٢٠١٠٣١٧٢١١٩٦) طالع `marid_number` —
--    يعني رقمها الشخصي مسجّل في `wa_number_configs` كجلسة مارد. النتيجة
--    اللي محمد طلبها واحدة (بتتسكّت)، بس السبب غلط ومحتاج مراجعة.
-- ============================================================================

-- ─────────────────────────── (أ) الجداول ───────────────────────────────────
create table if not exists public.marid_tool_settings (
  tool_name  text primary key,
  label_ar   text,
  enabled    boolean not null default true,
  note_ar    text,        -- التعليمة البديلة اللي بتتحقن في برومبت المارد
  sort_order int not null default 100,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

create table if not exists public.marid_tool_blocked_log (
  id         uuid primary key default gen_random_uuid(),
  tool_name  text not null,
  phone      text,
  args       jsonb,
  created_at timestamptz not null default now()
);
create index if not exists marid_tool_blocked_log_at
  on public.marid_tool_blocked_log (created_at desc);

alter table public.marid_tool_settings   enable row level security;
alter table public.marid_tool_blocked_log enable row level security;

drop policy if exists marid_tool_settings_read on public.marid_tool_settings;
create policy marid_tool_settings_read on public.marid_tool_settings
  for select using (public.is_madmona_staff() or public.is_admin_or_service());

drop policy if exists marid_tool_blocked_read on public.marid_tool_blocked_log;
create policy marid_tool_blocked_read on public.marid_tool_blocked_log
  for select using (public.is_madmona_staff() or public.is_admin_or_service());

-- ⚠️ الكتابة سايبينها للـservice role بس عن قصد — كل تعديل بيعدّي من
--    `marid_tool_set()` أو من `/api/admin/marid` (محمي في middleware).

-- ─────────────────── (أ) البذرة: ٢٤ أداة، اتنين مطفيين ─────────────────────
insert into public.marid_tool_settings (tool_name, label_ar, enabled, sort_order) values
 ('search_catalog','البحث في الإعلانات والأسعار',true,10),
 ('list_categories','عرض التصنيفات',true,20),
 ('who_is_this','التعرّف على المتكلّم',true,30),
 ('get_my_orders','طلبات العميل وحجوزاته',true,40),
 ('create_listing_draft','تسجيل إعلان جديد',true,50),
 ('add_menu_items','إضافة أصناف منيو مطعم',true,60),
 ('create_supplier_group','عمل جروب متابعة لمورد',true,70),
 ('forward_to_supplier','تحويل طلب العميل للمورد',true,80),
 ('read_link','فتح لينك وقراءته',true,90),
 ('search_projects','البحث في المشاريع',true,100),
 ('get_referral_code','كود الإحالة',true,110),
 ('record_job_application','تسجيل طلب توظيف',true,120),
 ('manage_order','إدارة الطلبات',true,130),
 ('manage_meeting','إدارة المواعيد',true,140),
 ('record_unmet_demand','تسجيل طلب مش متوفّر',true,150),
 ('create_project','تسجيل مشروع',true,160),
 ('create_task','عمل تاسك',true,170),
 ('list_tasks','عرض التاسكات',true,180),
 ('complete_task','إقفال تاسك',true,190),
 ('business_snapshot','ملخّص البيزنس',true,200),
 ('recent_orders','آخر الطلبات',true,210),
 ('recent_demand','آخر الطلبات المش متوفّرة',true,220),
 ('get_financial_prices','أسعار الدولار والذهب',true,230),
 ('get_property_prices','أسعار العقارات',true,240)
on conflict (tool_name) do update
  set label_ar = excluded.label_ar, sort_order = excluded.sort_order;

update public.marid_tool_settings
   set enabled = false, updated_at = now(),
       note_ar = 'إضافة الإعلانات بقت من صاحب الإعلان نفسه — مش من المارد.
لو حد عايز يضيف إعلان أو منتج أو خدمة أو عربية أو شقة أو منيو مطعم:
  • قوله: «الإضافة بقت من عندك مباشرة عشان تتحكّم في التفاصيل والصور بنفسك»
  • ابعتله اللينك: https://www.madmonacairo.com/add-listing
  • لو لسه مامعاهوش حساب مورد: https://www.madmonacairo.com/supplier/register
  • قوله ياخد باله يحط صورة واضحة والسعر اللي هياخده في إيده
  • واعرض عليه إن حد من فريق مضمونة يتصل بيه يساعده لو اتلخبط
⛔ ماتقولش إنك سجّلت الإعلان أو إنه هينزل خلال دقايق — إنت مش بتسجّل حاجة.
⛔ ماتطلبش منه يبعتلك البيانات ولا الصور عشان تسجّلها إنت.'
 where tool_name in ('create_listing_draft','add_menu_items');

-- ─────────────────────────── (أ) الدوال ────────────────────────────────────
create or replace function public.marid_tools_list()
returns jsonb
language plpgsql stable security definer set search_path to 'public' as $fn$
declare v jsonb;
begin
  if not (public.is_madmona_staff() or public.is_admin_or_service()) then
    raise exception 'forbidden';
  end if;
  select jsonb_build_object(
    'tools', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'tool_name', t.tool_name,
                'label_ar',  t.label_ar,
                'enabled',   t.enabled,
                'note_ar',   t.note_ar,
                'updated_at', t.updated_at,
                'blocked_7d', (select count(*) from marid_tool_blocked_log b
                                where b.tool_name = t.tool_name
                                  and b.created_at > now() - interval '7 days')
              ) order by t.sort_order)
         from marid_tool_settings t),
      '[]'::jsonb),
    'blocked_recent', coalesce(
      (select jsonb_agg(jsonb_build_object(
                'tool_name', b.tool_name, 'phone', b.phone,
                'created_at', b.created_at, 'args', b.args)
              order by b.created_at desc)
         from (select * from marid_tool_blocked_log order by created_at desc limit 20) b),
      '[]'::jsonb)
  ) into v;
  return v;
end $fn$;

create or replace function public.marid_tool_set(
  p_tool text, p_enabled boolean default null, p_note text default null)
returns jsonb
language plpgsql volatile security definer set search_path to 'public' as $fn$
declare v marid_tool_settings;
begin
  if not (public.is_madmona_staff() or public.is_admin_or_service()) then
    raise exception 'forbidden';
  end if;
  update marid_tool_settings
     set enabled    = coalesce(p_enabled, enabled),
         note_ar    = coalesce(nullif(p_note, ''), note_ar),
         updated_at = now(),
         updated_by = auth.uid()
   where tool_name = p_tool
  returning * into v;
  if v.tool_name is null then
    raise exception 'أداة مش موجودة: %', p_tool;
  end if;
  return jsonb_build_object('ok', true, 'tool_name', v.tool_name,
                            'enabled', v.enabled, 'note_ar', v.note_ar);
end $fn$;

-- ─────────────────────────── (ب) قاعدة السكوت ──────────────────────────────
-- `marid_mute_list` و`marid_known_numbers` اتعملوا يوم ٢٣ أغسطس.
-- الجديد هنا: جدول الاستثناءات + الدالة بقت تشوفه الأول.

create table if not exists public.marid_skip_exceptions (
  phone    text primary key,
  note     text,
  added_by uuid,
  added_at timestamptz not null default now()
);
alter table public.marid_skip_exceptions enable row level security;
drop policy if exists marid_skip_exceptions_read on public.marid_skip_exceptions;
create policy marid_skip_exceptions_read on public.marid_skip_exceptions
  for select using (public.is_madmona_staff() or public.is_admin_or_service());

comment on table public.marid_skip_exceptions is
'أرقام المارد بيرد عليها مهما كان — بتكسر قاعدة السكوت في marid_should_skip. فاضي عن قصد (٢٤ أغسطس ٢٠٢٦): محمد طلب إن كل الفريق يعدّي من غير رد، من غير استثناء لرقمه. أي صف هنا بيرجّع أوامر الأدمن من واتساب للرقم ده.';

-- المطابقة على **آخر ١٠ أرقام** عشان 201… و01… و+201… كلهم يتلمّوا.
create or replace function public.marid_should_skip(p_phone text)
returns text language sql stable security definer set search_path to 'public' as $function$
  with p as (select right(regexp_replace(coalesce(p_phone,''),'\D','','g'), 10) as d)
  select case
    when (select d from p) = '' then null
    -- استثناء صريح: المارد يرد على الرقم ده مهما كان (جدول فاضي افتراضيًا)
    when exists (select 1 from marid_skip_exceptions x, p
                  where right(regexp_replace(x.phone,'\D','','g'),10) = p.d) then null
    when exists (select 1 from marid_mute_list m, p
                  where m.active and right(regexp_replace(m.phone,'\D','','g'),10) = p.d) then 'muted'
    when exists (select 1 from wa_number_configs w, p
                  where right(regexp_replace(w.session_id,'\D','','g'),10) = p.d) then 'marid_number'
    when exists (select 1 from marid_known_numbers k, p
                  where right(regexp_replace(k.phone,'\D','','g'),10) = p.d) then 'ex_marid_number'
    when exists (select 1 from business_employees e join suppliers s on s.id = e.supplier_id, p
                  where coalesce(s.is_platform_owner,false) and e.status='active' and coalesce(e.phone,'') <> ''
                    and right(regexp_replace(e.phone,'\D','','g'),10) = p.d) then 'team'
    when exists (select 1 from platform_admins a, p
                  where a.status='active' and coalesce(a.phone,'') <> ''
                    and right(regexp_replace(a.phone,'\D','','g'),10) = p.d) then 'team'
    when exists (select 1 from crm_staff() st join profiles pr on pr.id = st.profile_id, p
                  where coalesce(pr.phone,'') <> '' and right(regexp_replace(pr.phone,'\D','','g'),10) = p.d) then 'team'
    else null end;
$function$;

-- ─────────────────── العقد: crm_health() بقى يحرس الحاجات دي ───────────────
insert into crm_contract (kind, name, detail, note) values
 ('table','marid_tool_settings','','مفاتيح أدوات المارد — /admin/marid وlib/marid-tool-settings.ts'),
 ('table','marid_tool_blocked_log','','محاولات نداء أداة مقفولة — الكارت في /admin/marid بيعدّها'),
 ('table','marid_mute_list','','أرقام مسكّتة يدويًا — marid_should_skip'),
 ('table','marid_known_numbers','','أرقام كانت مربوطة مارد قبل كده — marid_should_skip'),
 ('table','marid_skip_exceptions','','أرقام المارد بيرد عليها مهما كان — بترجّع أوامر الأدمن من واتساب'),
 ('function','marid_tools_list','','بتغذّي كارت الأدوات في /admin/marid'),
 ('function','marid_tool_set','','زرار التشغيل/الإطفاء في /admin/marid'),
 ('function','marid_should_skip','','حارس الرد في /api/whatsapp/baileys — من غيرها المارد بيرد على الفريق'),
 ('column','enabled','marid_tool_settings','لو العمود اتشال كل الأدوات هتفضل شغّالة'),
 ('column','note_ar','marid_tool_settings','التعليمة البديلة اللي بتتحقن في البرومبت'),
 ('policy','marid_tool_settings_read','marid_tool_settings',''),
 ('policy','marid_tool_blocked_read','marid_tool_blocked_log',''),
 ('policy','marid_skip_exceptions_read','marid_skip_exceptions','')
on conflict do nothing;

-- ─────────────────────────── فحوصات سريعة ─────────────────────────────────
-- select tool_name, enabled from marid_tool_settings order by sort_order;
-- select marid_should_skip('01002229982');            -- marid_number
-- select marid_should_skip('01208181416');            -- null (عميل عادي)
-- select tool_name, count(*) from marid_tool_blocked_log group by 1;  -- مين حاول
-- select jsonb_pretty(crm_health());
--
-- رجّع أوامر الأدمن من واتساب:
--   insert into marid_skip_exceptions (phone, note)
--   values ('201002229982','أوامر الأدمن من واتساب');
