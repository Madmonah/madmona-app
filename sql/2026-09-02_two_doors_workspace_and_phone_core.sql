-- 🚪🚪 (٢ سبتمبر ٢٠٢٦) بلاغين من محمد، وطلعوا نفس المرض:
--   «لما بدوس على تاب الحضور بترجع بمالكش صلاحية **لسه**»
--   «موضوع الـ٣ شرط ده أنا مش لاقي فيه نموذج الإدارة الخاص بمضمونة»
--
-- ═══ (١) الرقم بصيغتين — السبب التاني للحضور ═══
-- بعد ما إصلاح الأدوار (owner/permissions) اتعمل واتأكد، الشاشة فضلت
-- مقفولة. القياس كشف إن madmona_accounts.phone_normalized مخزّن
-- **بصيغتين** لنفس الرقم: '201002229982' و'+201002229982'.
-- والحارس كان بيعمل normalize_phone على **جنب واحد بس**:
--     normalize_phone(e.phone) = a.phone_normalized   ← الخام من الجلسة
-- فجلسات محمد الجديدة (٣١/٨، بصيغة البلَس) ماكانتش بتطابق، والقديمة
-- (٢٥/٨، من غير بلَس) كانت بتطابق — عشان كده كان شغال وبعدين وقف من
-- غير ما أي كود يتغيّر.
-- ✅ المقارنة بقت phone_core() على **الجنبين**.
-- ⚠️ نفس مرض CLAUDE.md ٤.٧ (٢٧ حساب مكرر). قاعدة: أي مقارنة أرقام
--    لازم تكون phone_core على الجنبين — الخام هينكسر عاجلًا أو آجلًا.
--
-- ═══ (٢) النطاق: المالك كان هيلاقي قايمة فاضية ═══
-- madmona_mgr_attendance كانت آخر دالة فيها v_mgr.role='admin' كشرط
-- نطاق — المالك (owner, branch_id فاضي) كان يعدّي الحارس ويلاقي صفر صف.
--
-- ═══ (٣) قايمة الـ٣ شرط كانت بترجع فاضية لباب الواتساب ═══
-- WorkspaceMenu كان بيبدأ بـauth.getSession() و `if (!session?.user) return`.
-- ومحمد وأصحاب البيزنس داخلين بـmadmona_token من غير أي جلسة Supabase
-- → القايمة فاضية بالكامل. ده حرفيًا «الدرس الأكبر» في CLAUDE.md (٢٥/٨).
-- ✅ workspace_menu_context(p_token) بترد من البابين.
--
-- ✔️ اتجرب بجلسات حقيقية بالصيغتين: employees ok=true (٩) ·
--    attendance ok=true (٩) · workspace_menu_context is_staff=true
--    لمحمد ونورا من باب التوكن.

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
    WHERE phone_core(e.phone) = phone_core(v_phone)   -- الجنبين بنفس المسطرة
      AND phone_core(v_phone) IS NOT NULL
      AND e.status='active' AND e.employee_type='human'
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

create or replace function public.workspace_menu_context(p_token uuid default null)
returns jsonb
language plpgsql
stable security definer
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
DECLARE v_uid uuid; v_phone text; v_staff boolean := false;
        v_sup_id uuid; v_name text; v_industry text;
BEGIN
  v_uid := auth.uid();
  IF v_uid IS NOT NULL THEN
    v_staff := is_madmona_staff();
    IF v_staff THEN RETURN jsonb_build_object('ok',true,'is_staff',true,'door','supabase'); END IF;
    SELECT s.id, s.business_name, s.industry INTO v_sup_id, v_name, v_industry
      FROM suppliers s WHERE s.auth_user_id = v_uid LIMIT 1;
  END IF;

  IF v_sup_id IS NULL AND NOT v_staff AND p_token IS NOT NULL THEN
    SELECT a.phone_normalized INTO v_phone FROM madmona_sessions ms
      JOIN madmona_accounts a ON a.id = ms.account_id
      WHERE ms.token = p_token AND ms.expires_at > now();
    IF v_phone IS NOT NULL THEN
      SELECT true INTO v_staff FROM business_employees e
        JOIN suppliers s ON s.id = e.supplier_id
       WHERE phone_core(e.phone) = phone_core(v_phone)
         AND e.employee_type='human' AND e.status='active'
         AND coalesce(s.is_platform_owner,false) LIMIT 1;
      IF coalesce(v_staff,false) THEN
        RETURN jsonb_build_object('ok',true,'is_staff',true,'door','token');
      END IF;
      SELECT s.id, s.business_name, s.industry INTO v_sup_id, v_name, v_industry
        FROM business_employees e JOIN suppliers s ON s.id = e.supplier_id
       WHERE phone_core(e.phone) = phone_core(v_phone)
         AND e.employee_type='human' AND e.status='active'
       ORDER BY (e.role IN ('owner','admin')) DESC LIMIT 1;
    END IF;
  END IF;

  IF v_sup_id IS NULL THEN RETURN jsonb_build_object('ok',false,'is_staff',false); END IF;
  RETURN jsonb_build_object('ok',true,'is_staff',false,
    'supplier_id', v_sup_id::text, 'business_name', v_name, 'industry', v_industry,
    'door', CASE WHEN v_uid IS NOT NULL THEN 'supabase' ELSE 'token' END);
END $function$;

grant execute on function public.workspace_menu_context(uuid) to anon, authenticated;
-- madmona_mgr_attendance: v_all = owner/admin/permissions.all بدل role='admin'
-- (الجسم الكامل في الميجريشن المطبّق mgr_attendance_owner_full_scope)
