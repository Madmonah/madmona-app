-- 🔑 (٣ سبتمبر ٢٠٢٦) محمد: «محتاج الإدارة تفتح على الصفحة دي»
--    /admin/business-finance/730811b0-… (محمود سالم – تأسيس شركات)
--
-- ═══ الجذر: تلات عيوب في admin_check_finance_access ═══
-- ١) **رقم محمد متكتب في الكود حرفيًا**:
--       IF v_phone = normalize_phone('01002229982')
--    ورقمه التاني (٠١٠٢٦٢٢٢٣٣٧ — حسابه الشخصي على جوجل، وموثّق في
--    CLAUDE.md كرقم بيزنس) مش فيها. فالتوكن من الرقم ده كان بيرجّع
--    `not_authorized`. نفس مرض «الشخص واحد وليه رقمين».
--    ✔️ اتقاس قبل الإصلاح: توكن ٩٩٨٢ → allowed · توكن ٣٣٧ → not_authorized
-- ٢) **مقارنة أرقام من غير phone_core على الجنبين** — كسر لقاعدة ٢/٩.
-- ٣) `supplier_admins` لحساب مضمونة (7310f6ef…) **فاضي تمامًا** — الفرع
--    ده ميت، وكل الصلاحية كانت معلّقة على السطر المكتوب بالإيد. لو الرقم
--    ده اتحظر (وهو فعلًا وقع النهاردة!) محمد يفقد لوحة الفلوس كلها.
--
-- ✅ المصدر بقى `platform_admins` بدور **owner أو admin** بس،
--    + `employee_phone_aliases` للرقم التاني لنفس الشخص (نفس الآلية
--      الصريحة المستخدمة في حارس الحضور — مش تخمين)،
--    + `supplier_admins` لحساب مضمونة زي ما كان.
-- ⛔ الـ٤ موظفين بدور `staff` (عبير · شهد · مديحة · ايمان) **مستثنيين
--    عن قصد** — قاعدة ٢٥/٨: صلاحيات الأدمن ما عدا الفلوس والتسعير.
--
-- 🧪 اتجرّب بجلسات حقيقية (مش بالقراءة):
--    محمد الأساسي ✅ platform_admin · محمد الشخصي ✅ platform_admin
--    أحمد سامي (admin) ✅ · عبير (staff) ⛔ · شهد (staff) ⛔
--
-- ═══ توثيق رقم محمود سالم ═══
-- محمد: «محتاجين نوثق رقم الأستاذ محمود سالم من هنا رقمه 01222203004».
-- الرقم كان `oauth:5df429ae-…` — بلاسهولدر دخول جوجل، **مش رقم أصلاً**.
-- ⚠️ ده توثيق **يدوي بأمر المالك**، مش وارد واتساب. اتسجّل كده صراحةً
--    عشان الأثر يفضل صادق (قاعدة ٢٣ يوليو: التوثيق بالوارد — والاستثناء
--    ده قرار محمد المباشر).
-- ⚠️ لسه **٤٣ حساب** تاني بنفس البلاسهولدر. وphone_core بيحوّله لرقم
--    وهمي من ١٧ خانة، فأي منطق بيطابق بالرقم شايفهم «معاهم رقم».

create or replace function public.admin_check_finance_access(p_token uuid, p_supplier_id uuid)
 returns jsonb language plpgsql security definer
 set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
declare
  v_phone text; v_name text;
  v_is_supplier_admin int; v_can_edit_cnt int; v_is_platform int;
begin
  select a.phone_normalized, a.full_name into v_phone, v_name
  from madmona_sessions s join madmona_accounts a on a.id = s.account_id
  where s.token = p_token and s.expires_at > now();
  if v_phone is null then return jsonb_build_object('allowed', false, 'reason', 'no_session'); end if;

  select
    (select count(*) from platform_admins pa
      where pa.status = 'active' and pa.role in ('owner','admin')
        and pa.phone is not null
        and phone_core(pa.phone) = phone_core(v_phone))
  + (select count(*) from employee_phone_aliases al
       join business_employees be on be.id = al.employee_id
       join platform_admins pa2 on pa2.status = 'active'
            and pa2.role in ('owner','admin') and pa2.phone is not null
            and phone_core(pa2.phone) = phone_core(be.phone)
      where phone_core(al.phone) = phone_core(v_phone))
  + (select count(*) from supplier_admins sa
      where sa.active = true
        and sa.supplier_id = '7310f6ef-e474-4ef8-8b8a-388b5e1f5694'
        and phone_core(sa.phone) = phone_core(v_phone))
  into v_is_platform;

  if v_is_platform > 0 then
    return jsonb_build_object('allowed', true, 'role', 'platform_admin',
                              'readonly', false, 'full_name', coalesce(v_name,'Admin'));
  end if;

  select count(*), count(*) filter (where can_edit)
    into v_is_supplier_admin, v_can_edit_cnt
  from supplier_admins
  where phone_core(phone) = phone_core(v_phone) and active = true
    and supplier_id = p_supplier_id and role in ('owner','manager');

  if v_is_supplier_admin > 0 then
    if public.is_supplier_suspended(p_supplier_id) then
      return jsonb_build_object('allowed', false, 'reason', 'suspended');
    end if;
    return jsonb_build_object('allowed', true, 'role', 'business_admin',
                              'readonly', (v_can_edit_cnt = 0),
                              'full_name', coalesce(v_name,'Admin'));
  end if;

  return jsonb_build_object('allowed', false, 'reason', 'not_authorized');
end;
$function$;

-- توثيق رقم محمود سالم (يدوي بأمر المالك)
update profiles set phone = '+201222203004'
where id = '5df429ae-c1f7-4902-bafe-84c9ba490ef6' and phone like 'oauth:%';

-- تفعيل الـERP للمورد (التريجر بيعمل القيود بس، مش الفروع/الموديولات)
-- select public.erp_provision_supplier('730811b0-d169-4c4a-b897-ce9d5f05daa5');
