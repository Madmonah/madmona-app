-- ============================================================================
-- ٢٢ أغسطس ٢٠٢٦ — إصلاح تاني من نفس النوع: شاشة /crm بتنادي دوال مش موجودة
-- ============================================================================
-- العرض: «الـCRM واقع»
--
-- التتبّع: عملت مسح شامل — كل اسم `crm_*` بيتنادى من كل ملفات src،
-- ومقارنته بالموجود فعلًا في Supabase. الناقص كان اتنين:
--
--   crm_my_queue(p_limit)  ← src/app/crm/page.tsx:163   (شاشة الموظف)
--   crm_my_badge()         ← src/lib/useMadmonaStaff.ts:48
--
-- ⚠️ crm_my_badge بيتنادى من كومبوننت في **كل صفحة على الموقع** لأي حد
--    مسجّل دخول — فغيابه كان بيولّد نداء فاشل في كل تنقّل (متمسك في
--    try/catch فمكانش بيكسر، بس كان هدر).
--
-- ده تالت مرة يحصل نفس الشيء (شوف 2026-08-22_crm_missing_dispatcher_functions.sql).
-- النمط واحد: الواجهة بتتشحن والدالة بتتنسى.
--
-- ✅ اتنفّذ على البروduction — migration: crm_my_queue_and_badge
-- التحقق:
--   select proname, has_function_privilege('authenticated', oid, 'execute')
--     from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--    where n.nspname='public' and proname in ('crm_my_queue','crm_my_badge');
--   ← صفّين، الاتنين true. و select crm_my_badge() لازم يرجّع {"staff":false}
--     من غير جلسة، مش يرمي خطأ.
--
-- الشكل اللي الواجهة مستنياه (من type Queue في page.tsx):
--   { ok, error?, me:{id,name,specialties:[{key,name_ar}]}, 
--     counts:{mine,todo,due,never}, open_tasks, queue:Lead[], tasks:Task[] }
-- ملحوظة ماب: crm_contacts.source_label → الواجهة بتقراه باسم `source`.
-- ============================================================================

-- 🔔 عدّاد تاب «شغلي». رخيص ومحايد لأي حد مش من الفريق.
CREATE OR REPLACE FUNCTION public.crm_my_badge()
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_me uuid := auth.uid(); v_tasks int; v_due int;
BEGIN
  IF v_me IS NULL OR NOT public.is_madmona_staff() THEN
    RETURN jsonb_build_object('staff', false); END IF;

  SELECT count(*) INTO v_tasks
    FROM flow_tasks t
   WHERE t.source = 'crm-call' AND t.owner_id = v_me AND t.status <> 'done';

  SELECT count(*) INTO v_due
    FROM crm_contacts c
   WHERE c.owner_id = v_me
     AND c.status NOT IN ('won','lost','spam')
     AND c.next_action_at IS NOT NULL
     AND c.next_action_at <= now();

  RETURN jsonb_build_object('staff', true, 'tasks', v_tasks, 'due', v_due);
END $function$;

-- 📞 طابور الموظف. الترتيب اللي محمد طلبه بالنص:
--    «اللي ليه معاد فات الأول، وبعده اللي عمره ما اتكلّم معاه».
CREATE OR REPLACE FUNCTION public.crm_my_queue(p_limit integer DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  v_me uuid := auth.uid();
  v_lim int := least(greatest(coalesce(p_limit, 60), 1), 500);
  v_me_obj jsonb; v_queue jsonb; v_tasks jsonb;
  v_mine int; v_todo int; v_due int; v_never int; v_open int;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF v_me IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'مفيش جلسة'); END IF;

  SELECT jsonb_build_object(
           'id', st.profile_id, 'name', st.full_name,
           'specialties', coalesce((
             SELECT jsonb_agg(jsonb_build_object('key', ss.specialty, 'name_ar', sp.name_ar)
                              ORDER BY ss.is_primary DESC, sp.sort NULLS LAST)
               FROM crm_staff_specialties ss
               LEFT JOIN crm_specialties sp ON sp.key = ss.specialty
              WHERE ss.profile_id = v_me AND coalesce(ss.active, true)
           ), '[]'::jsonb))
    INTO v_me_obj
    FROM crm_staff() st WHERE st.profile_id = v_me;

  SELECT count(*),
         count(*) FILTER (WHERE c.status NOT IN ('won','lost','spam')),
         count(*) FILTER (WHERE c.status NOT IN ('won','lost','spam')
                            AND c.next_action_at IS NOT NULL AND c.next_action_at <= now()),
         count(*) FILTER (WHERE c.status NOT IN ('won','lost','spam')
                            AND c.last_contact_at IS NULL)
    INTO v_mine, v_todo, v_due, v_never
    FROM crm_contacts c WHERE c.owner_id = v_me;

  SELECT count(*) INTO v_open
    FROM flow_tasks t
   WHERE t.source = 'crm-call' AND t.owner_id = v_me AND t.status <> 'done';

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_queue FROM (
    SELECT jsonb_build_object(
        'id', c.id, 'phone', c.phone,
        'phone_kind', coalesce(c.phone_kind, 'mobile'),
        'name', c.display_name, 'city', c.city,
        'specialty', c.specialty, 'specialty_ar', sp.name_ar,
        'status', c.status, 'notes', c.notes, 'source', c.source_label,
        'last_contact_at', c.last_contact_at, 'next_action_at', c.next_action_at,
        'calls', (SELECT count(*) FROM crm_calls k WHERE k.contact_id = c.id)) x
      FROM crm_contacts c
      LEFT JOIN crm_specialties sp ON sp.key = c.specialty
     WHERE c.owner_id = v_me
       AND c.status NOT IN ('won','lost','spam')
     ORDER BY
       (CASE WHEN c.next_action_at IS NOT NULL AND c.next_action_at <= now() THEN 0
             WHEN c.last_contact_at IS NULL THEN 1
             ELSE 2 END),
       c.next_action_at ASC NULLS LAST,
       c.last_contact_at ASC NULLS FIRST,
       c.created_at ASC
     LIMIT v_lim) z;

  SELECT coalesce(jsonb_agg(x), '[]'::jsonb) INTO v_tasks FROM (
    SELECT jsonb_build_object(
        'id', t.id, 'title', t.title, 'detail', t.detail,
        'priority', t.priority, 'status', t.status, 'due_at', t.due_at,
        'specialty_ar', sp.name_ar,
        'route_reason', t.route_reason, 'routed_from', rf.full_name,
        'owner', st.full_name,
        'contact_id', t.contact_id, 'contact_phone', c.phone,
        'contact_name', c.display_name) x
      FROM flow_tasks t
      LEFT JOIN crm_specialties sp ON sp.key = t.specialty
      LEFT JOIN crm_staff() st ON st.profile_id = t.owner_id
      LEFT JOIN crm_staff() rf ON rf.profile_id = t.routed_from
      LEFT JOIN crm_contacts c ON c.id = t.contact_id
     WHERE t.source = 'crm-call' AND t.owner_id = v_me AND t.status <> 'done'
     ORDER BY (t.priority = 'high') DESC, t.due_at ASC NULLS LAST, t.created_at DESC
     LIMIT 200) z2;

  RETURN jsonb_build_object(
    'ok', true,
    'me', v_me_obj,
    'counts', jsonb_build_object('mine', v_mine, 'todo', v_todo, 'due', v_due, 'never', v_never),
    'open_tasks', v_open,
    'queue', v_queue,
    'tasks', v_tasks);
END $function$;

GRANT EXECUTE ON FUNCTION public.crm_my_badge()        TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.crm_my_queue(integer) TO authenticated, service_role;

-- ============================================================================
-- 🛑 عشان مايحصلش رابع مرة — شغّل ده بعد أي كوميت بيلمس الـCRM:
--
--   الخطوة ١) طلّع كل اسم بيتنادى من الكود:
--     Get-ChildItem -Recurse -Include *.tsx,*.ts -Path src |
--       Select-String -Pattern "'(crm_[a-z_]+)'" -AllMatches |
--       ForEach-Object { $_.Matches } | ForEach-Object { $_.Groups[1].Value } |
--       Sort-Object -Unique
--
--   الخطوة ٢) طلّع الموجود في الداتابيز:
--     select proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--      where n.nspname='public' and proname like 'crm%' order by 1;
--
--   الخطوة ٣) أي اسم في الأولى ومش في التانية = صفحة واقعة.
--     (استثناء: crm_contacts و crm_specialties و crm_staff_specialties
--      دول **جداول** بتتنادى بـ.from() مش دوال — عادي إنهم مش في القايمة.)
-- ============================================================================
