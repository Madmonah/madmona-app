-- 🔑 (٢ سبتمبر ٢٠٢٦) محمد: «لما باجي أدخل على حضور الموظفين من الـ٣ شرط
--    اللي في نسخة الموبايل بيقولي مالكش صلاحية، مع إني بقدر أدخل من لوحة
--    التحكم عادي».
--
-- 🐞 الجذر: madmona_mgr_resolve كان بيقبل role IN ('admin','branch_manager')
--    وبس — ودور محمد في business_employees هو **'owner'**. وكل فريق مضمونة
--    دورهم 'staff' عن قصد (role='admin' بيشغّل is_admin() في RLS على المنصة
--    كلها — قاعدة ٢٥/٨)، فصلاحياتهم التفصيلية في permissions مش في role.
--    يعني الحارس كان بيقيس بعمود مالوش لازمة في السياق ده.
--
-- 🚪 ده نفس فخ «البابين» المكتوب في CLAUDE.md: اللوحة بتفتح بكوكي
--    platform_admins، والموبايل بيفتح بـmadmona_token — والاتنين ماكانوش
--    متفقين على مين «المدير». النتيجة: نفس الشخص داخل من باب ومتقفل من باب.
--
-- ✅ الحارس بقى يقبل: owner · admin · branch_manager · أو permissions.all
--    · أو permissions.can_manage_team.
--
-- 🎯 نقطة واحدة بيعدّي منها **١١ دالة**: madmona_mgr_attendance ·
--    _employees · _bom · _get_shifts · _set_shifts · _set_attendance ·
--    _save_employee · _add_inventory_product · _link_product ·
--    _unlink_product — فالإصلاح فتح الشاشة كلها مش تاب الحضور بس.
--
-- ✔️ اتجرب بجلسة محمد الحقيقية (madmona_sessions سارية) مش بالقراءة:
--    resolve → «محمد ناصف / owner» · employees.ok = true · ٩ موظفين ·
--    scope = all.

create or replace function public.madmona_mgr_resolve(p_token uuid)
returns business_employees
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
DECLARE v_phone text; v_emp business_employees;
BEGIN
  SELECT a.phone_normalized INTO v_phone FROM madmona_sessions s
    JOIN madmona_accounts a ON a.id=s.account_id
    WHERE s.token=p_token AND s.expires_at > now();
  IF v_phone IS NULL THEN RETURN NULL; END IF;

  SELECT e.* INTO v_emp FROM business_employees e
    WHERE normalize_phone(e.phone)=v_phone AND e.status='active'
      AND e.employee_type='human'
      AND (
        e.role IN ('owner','admin','branch_manager')
        OR coalesce(e.permissions->>'all','') = 'true'
        OR coalesce(e.permissions->>'can_manage_team','') = 'true'
      )
    ORDER BY (e.role IN ('owner','admin')) DESC,
             (coalesce(e.permissions->>'all','') = 'true') DESC
    LIMIT 1;
  RETURN v_emp;
END $function$;

-- والمالك/صاحب permissions.all لازم يشوف كل الفروع زي الأدمن — الفحص كان
-- على role='admin' بس، فالمالك كان هيتحصر في فرعه (أو في لا شيء لو branch_id فاضي).
create or replace function public.madmona_mgr_employees(p_token uuid)
returns jsonb
language plpgsql
security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
DECLARE v_mgr business_employees; v_emps jsonb; v_branches jsonb; v_sal text; v_pins text; v_all boolean;
BEGIN
  v_mgr := madmona_mgr_resolve(p_token);
  IF v_mgr.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','مالكش صلاحية إدارة'); END IF;
  v_sal  := COALESCE(v_mgr.permissions->>'salaries','none');
  v_pins := COALESCE(v_mgr.permissions->>'pins','none');
  v_all  := v_mgr.role IN ('owner','admin') OR coalesce(v_mgr.permissions->>'all','') = 'true';

  SELECT coalesce(jsonb_agg(jsonb_build_object(
           'id', e.id::text, 'full_name', e.full_name, 'phone', e.phone,
           'role_ar', e.role_ar, 'role', e.role,
           'branch_id', e.branch_id::text, 'branch', b.name, 'branch_code', b.code,
           'status', e.status, 'avatar', e.avatar_initial,
           'salary', CASE WHEN v_sal IN ('view','edit') THEN e.salary_egp ELSE NULL END,
           'pin', CASE WHEN v_pins IN ('view','edit') THEN e.pin_code ELSE NULL END
         ) ORDER BY (b.code IS NULL), b.code, e.full_name), '[]'::jsonb)
    INTO v_emps
    FROM business_employees e LEFT JOIN supplier_branches b ON b.id=e.branch_id
    WHERE e.supplier_id=v_mgr.supplier_id AND e.employee_type='human'
      AND (v_all OR e.branch_id=v_mgr.branch_id);

  SELECT coalesce(jsonb_agg(jsonb_build_object('id',id::text,'name',name,'code',code) ORDER BY name),'[]'::jsonb)
    INTO v_branches FROM supplier_branches
    WHERE supplier_id=v_mgr.supplier_id AND status='active'
      AND (v_all OR id=v_mgr.branch_id);

  RETURN jsonb_build_object('ok',true,
    'manager', jsonb_build_object('name',v_mgr.full_name,'role',v_mgr.role,
       'scope',CASE WHEN v_all THEN 'all' ELSE 'branch' END,
       'can_view_salary', (v_sal IN ('view','edit')),
       'can_edit_salary', (v_sal='edit'),
       'can_view_pin', (v_pins IN ('view','edit'))),
    'employees', v_emps, 'branches', v_branches);
END $function$;
