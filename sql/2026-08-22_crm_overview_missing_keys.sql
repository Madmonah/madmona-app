-- =====================================================================
-- 🐞 (٢٢ أغسطس ٢٠٢٦) الباج: /admin/crm كانت بترجّع «حصل خطأ مش متوقع»
-- =====================================================================
-- الأعراض: الصفحة بتفتح (200) وبعدين تقع فورًا على شاشة الخطأ العامة
--          (src/app/global-error.tsx).
--
-- التشخيص: فتحنا الصفحة بـPlaywright بجلسة أدمن صالحة وسجّلنا الكونسول:
--     TypeError: Cannot read properties of undefined (reading 'toLocaleString')
--         at Array.map (<anonymous>)
--
-- السبب الجذري: في src/app/admin/crm/page.tsx فيه كروت أرقام سريعة
--   بتعمل map وبتنادي x.v.toLocaleString('ar-EG'). اتنين من القيم دي:
--       ov.totals.landline
--       ov.totals.recordings
--   مكانوش موجودين أصلًا في اللي crm_overview() بترجّعه → undefined
--   → .toLocaleString() بترمي استثناء → React بيقع على global-error.
--
--   ودي **نفس** الحكاية اللي حصلت مع crm_set_staff_role و crm_my_queue:
--   الواجهة اتشحنت وهي بتتوقع حاجة من الداتابيز، والداتابيز ما اتحدّثتش.
--
-- الإصلاح (جزءين — الاتنين لازم):
--   (١) الداتابيز — الدالة تحت: زوّدنا في crm_overview():
--         totals.landline    = عدد الأرقام الأرضي (phone_kind='landline')
--         totals.recordings  = عدد المكالمات اللي معاها تسجيل صوتي
--         receivers          = عدد الموظفين اللي بياخدوا ليدات فعلًا
--         staff[].is_dispatcher / staff[].receives_leads
--           (دول كانوا ناقصين كمان فأزرار «الموزّع» ما كانتش بتعكس الحالة)
--   (٢) الواجهة — في page.tsx غيّرنا كل .toLocaleString() لـ
--       (x ?? 0).toLocaleString(). ده مش تجميل: ده بيمنع إن رقم واحد
--       ناقص يوقّع الشاشة كلها تاني.
--
-- 🔎 وصفة اصطياد الباج ده لو رجع في أي شاشة تانية:
--   node -e "..." بـPlaywright، حطّ كوكي madmona_admin_v2 من
--   platform_admin_sessions، افتح الصفحة، واسمع p.on('console')
--   و p.on('pageerror'). الرسالة المصغّرة من React (#425/#418) مش
--   مفيدة — المفيد هو الـTypeError اللي جنبها في الكونسول.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.crm_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📊 كل حاجة اللي الشاشة محتاجاها في نداء واحد — محمد: «وكله يكون ظاهر». */
DECLARE v jsonb;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  SELECT jsonb_build_object(
    'ok', true,
    'totals', (SELECT jsonb_build_object(
        'contacts', count(*),
        'assigned', count(*) FILTER (WHERE owner_id IS NOT NULL),
        'unclassified', count(*) FILTER (WHERE specialty IS NULL),
        'manual', count(*) FILTER (WHERE specialty_src='manual'),
        'landline', count(*) FILTER (WHERE phone_kind='landline'),
        'calls', (SELECT count(*) FROM crm_calls),
        'recordings', (SELECT count(*) FROM crm_calls WHERE audio_path IS NOT NULL),
        'open_tasks', (SELECT count(*) FROM flow_tasks WHERE source='crm-call' AND status<>'done'),
        'routed_tasks', (SELECT count(*) FROM flow_tasks WHERE source='crm-call' AND routed_from IS NOT NULL)
      ) FROM crm_contacts),
    'receivers', (SELECT count(*) FROM crm_receivers()),
    'specialties', (SELECT coalesce(jsonb_agg(x ORDER BY x->>'sort'),'[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'key', s.key, 'name_ar', s.name_ar, 'sort', lpad(s.sort_order::text,4,'0'),
          'active', s.active, 'match_cats', s.match_cats, 'match_words', s.match_words,
          'contacts', (SELECT count(*) FROM crm_contacts c WHERE c.specialty = s.key),
          'owners', (SELECT coalesce(jsonb_agg(jsonb_build_object(
                        'profile_id', st.profile_id, 'name', st.full_name, 'primary', ss.is_primary)),'[]'::jsonb)
                       FROM crm_staff_specialties ss JOIN crm_staff() st ON st.profile_id=ss.profile_id
                      WHERE ss.specialty=s.key AND ss.active)
        ) x FROM crm_specialties s) y),
    'staff', (SELECT coalesce(jsonb_agg(jsonb_build_object(
        'profile_id', st.profile_id, 'name', st.full_name, 'role', st.role,
        'is_dispatcher',  coalesce(cs.is_dispatcher,  false),
        'receives_leads', coalesce(cs.receives_leads, true),
        'contacts', (SELECT count(*) FROM crm_contacts c WHERE c.owner_id=st.profile_id),
        'open_tasks', (SELECT count(*) FROM flow_tasks t WHERE t.owner_id=st.profile_id AND t.status<>'done'),
        'calls', (SELECT count(*) FROM crm_calls k WHERE k.staff_id=st.profile_id),
        'specialties', (SELECT coalesce(jsonb_agg(ss.specialty),'[]'::jsonb) FROM crm_staff_specialties ss
                         WHERE ss.profile_id=st.profile_id AND ss.active)
      ) ORDER BY st.full_name),'[]'::jsonb)
      FROM crm_staff() st
      LEFT JOIN crm_staff_settings cs ON cs.profile_id = st.profile_id),
    'staff_no_account', (SELECT coalesce(jsonb_agg(e.full_name),'[]'::jsonb)
        FROM business_employees e JOIN suppliers s ON s.id=e.supplier_id
       WHERE coalesce(s.is_platform_owner,false) AND e.employee_type='human'
         AND e.status='active' AND e.auth_user_id IS NULL),
    'by_source', (SELECT coalesce(jsonb_object_agg(coalesce(specialty_src,'none'), n),'{}'::jsonb)
        FROM (SELECT specialty_src, count(*) n FROM crm_contacts GROUP BY 1) z),
    'by_status', (SELECT coalesce(jsonb_object_agg(status, n),'{}'::jsonb)
        FROM (SELECT status, count(*) n FROM crm_contacts GROUP BY 1) z)
  ) INTO v;
  RETURN v;
END $function$;
