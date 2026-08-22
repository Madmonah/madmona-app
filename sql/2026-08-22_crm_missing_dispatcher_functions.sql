-- ============================================================================
-- ٢٢ أغسطس ٢٠٢٦ — إصلاح: دالتين الشاشة بتناديهم وماكانوش موجودين خالص
-- ============================================================================
-- العرض: «الـCRM بقى يرجّع حصل خطأ مش متوقع»
--
-- التتبّع (UI → API → DB):
--   1) src/app/admin/crm/page.tsx سطر ٥٣٥ و٥٤٢ → run('crm_set_staff_role', …)
--      وسطر ٦٣٤ → run('crm_assign_contacts', …)
--   2) src/app/api/admin/rpc/route.ts → الاتنين في الـallowlist عادي
--   3) Supabase → **الاتنين مش موجودين**:
--        select proname from pg_proc where proname like 'crm%';  ← مفيش
--
-- يعني كوميت 9a2785e («دور الموزّع») شحن الواجهة وسابها بتنادي على دوال
-- ماتكتبتش لا في الداتابيز ولا في sql/2026-08-21_crm_madmona.sql.
-- النداء بيفشل، والخطأ مش متمسك في try/catch، فبيوصل لـ`app/global-error.tsx`
-- اللي بيعرض بالنص: «حصل خطأ مش متوقع».
--
-- (crm_staff_settings و crm_receivers() من نفس الكوميت **موجودين** فعلاً —
--  الناقص كان الاتنين دول بس.)
--
-- الحالة: ✅ اتنفّذ على البروduction يوم ٢٢ أغسطس ٢٠٢٦
--         migration name: crm_missing_dispatcher_functions
--
-- ⚠️ لسه ناقص (مش بيكسر حاجة بس الشاشة مش بتعكس الحالة):
--    crm_staff() بترجّع (profile_id, full_name, role) بس — من غير
--    is_dispatcher / receives_leads. فحالة الزرارين مش هتبان صح لحد ما
--    الشاشة تقرا crm_staff_settings كمان. ماغيّرتش crm_staff() عن قصد
--    لأن crm_receivers() معتمدة عليها وتغيير الـreturn type محتاج DROP.
-- ============================================================================

-- 🎚️ تبديل دور الموظف. كل زرار في الشاشة بيبعت فلاج واحد بس، فالتاني
--    لازم يفضل زي ما هو — عشان كده NULL معناها «ماتلمسش ده».
CREATE OR REPLACE FUNCTION public.crm_set_staff_role(
  p_profile        uuid,
  p_is_dispatcher  boolean DEFAULT NULL,
  p_receives_leads boolean DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_disp boolean; v_recv boolean;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF p_profile IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'لازم تحدد الموظف'); END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_staff() s WHERE s.profile_id = p_profile) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الموظف ده مش من فريق مضمونة'); END IF;

  UPDATE crm_staff_settings SET
    is_dispatcher  = coalesce(p_is_dispatcher,  is_dispatcher),
    receives_leads = coalesce(p_receives_leads, receives_leads),
    updated_at     = now()
  WHERE profile_id = p_profile
  RETURNING is_dispatcher, receives_leads INTO v_disp, v_recv;

  IF NOT FOUND THEN
    -- أول مرة للموظف ده: الافتراضيات المتفق عليها (بياخد ليدات، مش موزّع)
    INSERT INTO crm_staff_settings (profile_id, is_dispatcher, receives_leads)
    VALUES (p_profile, coalesce(p_is_dispatcher, false), coalesce(p_receives_leads, true))
    RETURNING is_dispatcher, receives_leads INTO v_disp, v_recv;
  END IF;

  RETURN jsonb_build_object('ok', true, 'is_dispatcher', v_disp, 'receives_leads', v_recv);
END $function$;

-- 📤 توزيع يدوي: تختار أرقام بالـcheckbox وتبعتها لموظف بعينه.
--    بيتجاوز `receives_leads` عن قصد — ده قرار مباشر من محمد، مش توزيع بالدور.
CREATE OR REPLACE FUNCTION public.crm_assign_contacts(
  p_ids   uuid[],
  p_owner uuid
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_n integer;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF p_owner IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'اختار الموظف الأول'); END IF;
  IF p_ids IS NULL OR array_length(p_ids, 1) IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'مفيش أرقام متحددة'); END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_staff() s WHERE s.profile_id = p_owner) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الموظف ده مش من فريق مضمونة'); END IF;

  UPDATE crm_contacts SET
    owner_id    = p_owner,
    assigned_at = now(),
    updated_at  = now()
  WHERE id = ANY(p_ids);
  GET DIAGNOSTICS v_n = ROW_COUNT;

  RETURN jsonb_build_object('ok', true, 'assigned', v_n);
END $function$;

GRANT EXECUTE ON FUNCTION public.crm_set_staff_role(uuid, boolean, boolean) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_assign_contacts(uuid[], uuid)          TO authenticated, service_role;

-- ============================================================================
-- التحقق (شغّلها أي وقت):
--   select p.proname, pg_get_function_identity_arguments(p.oid),
--          has_function_privilege('authenticated', p.oid, 'execute')
--     from pg_proc p join pg_namespace n on n.oid = p.pronamespace
--    where n.nspname = 'public'
--      and p.proname in ('crm_set_staff_role','crm_assign_contacts');
--   ← لازم ترجّع صفّين، الاتنين true
--
-- الدرس (RULE 6): أي كوميت بيضيف زرار بينادي RPC — اتأكد إن الدالة **متنفّذة**
-- في الداتابيز ومتحفوظة في ملف SQL في الريبو، مش مكتوبة في رسالة الكوميت بس.
-- ============================================================================
