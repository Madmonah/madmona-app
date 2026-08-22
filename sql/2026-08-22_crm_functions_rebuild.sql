-- ============================================================================
-- 🧱 نظام الـCRM كامل — ملف إعادة بناء (مش توثيق)
-- ============================================================================
-- محمد (٢٢ أغسطس ٢٠٢٦): «اتأكد من الديبلوي والكوميت والبوش، علشان بلاقي
--                        حاجات بتقع بعد ما بنقفل الجلسة»
--
-- ============================== ليه الملف ده موجود =========================
-- ده **السبب الحقيقي** للحاجات اللي بتقع بين الجلسات:
--
--   الكود بتاع الواجهة بيتحفظ في جيت ✅
--   بس **دوال الداتابيز كانت بتتعمل لايف بس** — موجودة في السيرفر ومش
--   موجودة في الريبو. يعني:
--     • أي جلسة تانية تعمل نسخة تانية من نفس الدالة بتوقيع مختلف → النداء
--       بيقع على النسخة الغلط. (حصل مرتين فعلًا: `crm_log_call` و
--       `crm_my_queue` — كل مرة النسخة القديمة كانت لسه موجودة جنب الجديدة)
--     • ولو الداتابيز اترجّعت من باك أب، الشاشات كلها بتقع ومحدش عارف ليه.
--
-- الملف ده بيتولّد **من الداتابيز نفسها** (`pg_get_functiondef`)، فهو نسخة
-- طبق الأصل من اللي شغّال دلوقتي. لو أي حاجة وقعت، شغّله من أوله لآخره
-- والنظام بيرجع زي ما هو.
--
-- ⚠️ **قبل ما تشغّله**: امسح أي نسخ قديمة بتوقيعات مختلفة، وإلا هتفضل
--    موجودة جنب الجديدة وترجع نفس المشكلة. الاستعلام ده بيوريك أي دالة
--    ليها أكتر من نسخة:
--
--      select proname, count(*), string_agg(pronargs::text,' / ')
--        from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--       where n.nspname='public' and proname like 'crm\_%'
--       group by proname having count(*) > 1;
--
--    المفروض يرجّع **صفر صفوف**. لو رجّع حاجة، امسح القديم بـ
--    `drop function public.<name>(<الأنواع القديمة>);`
--
-- ============================== الجداول اللي لازم تكون موجودة ==============
--   crm_specialties · crm_staff_specialties · crm_staff_settings
--   crm_contacts · crm_calls
--   flow_tasks (+ الأعمدة: owner_id · contact_id · call_id · specialty ·
--               due_at · routed_from · route_reason)
--   storage bucket: `crm-calls` (خاص) + بوليسي رفع/قراءة لموظفين مضمونة
--
--   الشرح والقرارات كلها في `2026-08-21_crm_madmona.sql` — الملف ده كود بس.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.crm_assign_contacts(p_ids uuid[], p_owner uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_assign_round_robin(p_specialty text DEFAULT NULL::text, p_reassign boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🔁 توزيع الليدات بالدور **جوّه كل تخصص**.
   ⚠️ (٢٢ أغسطس ٢٠٢٦) بيوزّع على `crm_receivers()` مش على كل الفريق —
      الموزّع (أحمد سامي) بيوزّع ومابياخدش، إلا لو `receives_leads` اتشغّلت.
   • تخصص من غير مسؤولين → بيتوزّع على كل اللي بياخدوا ليدات، والنتيجة
     بتقولها في `no_owner_specialties`.
   • اللي لسه مش متصنّف بيتوزّع تحت `__unclassified__` عشان محدش يفضل بلا صاحب.
   • ترتيب الموظفين بالحِمل تصاعديًا · الليدات بآخر تواصل (الأحدث الأول).
   • p_reassign=false → مابنلمسش حد ليه صاحب بالفعل. */
DECLARE v_rows jsonb; v_n int := 0; v_noowner text[]; v_recv int;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT count(*) INTO v_recv FROM crm_receivers();
  IF v_recv = 0 THEN
    RETURN jsonb_build_object('ok', false,
      'error', 'مفيش حد بياخد ليدات — كل الفريق متسجّل «موزّع». شغّل «بياخد ليدات» لواحد على الأقل.');
  END IF;

  SELECT array_agg(s.key ORDER BY s.sort_order) INTO v_noowner
    FROM crm_specialties s
   WHERE s.active AND NOT EXISTS (
     SELECT 1 FROM crm_staff_specialties ss JOIN crm_receivers() st ON st.profile_id = ss.profile_id
      WHERE ss.specialty = s.key AND ss.active);

  WITH buckets AS (
    SELECT key AS specialty FROM crm_specialties WHERE active
    UNION ALL SELECT '__unclassified__'
  ), pool AS (
    SELECT b.specialty, st.profile_id, st.full_name
      FROM buckets b
      CROSS JOIN LATERAL (
        SELECT st2.profile_id, st2.full_name FROM crm_receivers() st2
         WHERE EXISTS (SELECT 1 FROM crm_staff_specialties ss
                        WHERE ss.profile_id=st2.profile_id AND ss.specialty=b.specialty AND ss.active)
            OR NOT EXISTS (SELECT 1 FROM crm_staff_specialties ss2
                             JOIN crm_receivers() st3 ON st3.profile_id=ss2.profile_id
                            WHERE ss2.specialty=b.specialty AND ss2.active)
      ) st
  ), load AS (
    SELECT p.specialty, p.profile_id, p.full_name,
           (SELECT count(*) FROM crm_contacts c
             WHERE c.owner_id=p.profile_id
               AND coalesce(c.specialty,'__unclassified__') = p.specialty) AS cur
      FROM pool p
  ), ranked_staff AS (
    SELECT specialty, profile_id, full_name,
           row_number() OVER (PARTITION BY specialty ORDER BY cur, full_name) AS sn,
           count(*)     OVER (PARTITION BY specialty) AS ntot
      FROM load
  ), targets AS (
    SELECT c.id, coalesce(c.specialty,'__unclassified__') AS bucket,
           row_number() OVER (PARTITION BY coalesce(c.specialty,'__unclassified__')
                              ORDER BY c.last_contact_at DESC NULLS LAST, c.id) AS rn
      FROM crm_contacts c
     WHERE (p_specialty IS NULL OR coalesce(c.specialty,'__unclassified__') = p_specialty)
       AND (p_reassign OR c.owner_id IS NULL)
  ), pairs AS (
    SELECT t.id, rs.profile_id, rs.full_name
      FROM targets t JOIN ranked_staff rs
        ON rs.specialty = t.bucket AND rs.sn = ((t.rn - 1) % rs.ntot) + 1
  ), upd AS (
    UPDATE crm_contacts c SET owner_id = pr.profile_id, assigned_at = now(), updated_at = now()
      FROM pairs pr WHERE pr.id = c.id
    RETURNING pr.full_name AS nm
  ), agg AS (SELECT nm, count(*)::int n FROM upd GROUP BY nm)
  SELECT coalesce(sum(n),0)::int, coalesce(jsonb_object_agg(nm, n),'{}'::jsonb)
    INTO v_n, v_rows FROM agg;

  RETURN jsonb_build_object('ok', true, 'assigned', v_n, 'per_staff', v_rows,
    'receivers', v_recv,
    'no_owner_specialties', coalesce(to_jsonb(v_noowner),'[]'::jsonb),
    'still_unassigned', (SELECT count(*) FROM crm_contacts WHERE owner_id IS NULL));
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_classify_contacts(p_force boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🎯 (٢١ أغسطس ٢٠٢٦) تصنيف الأرقام حسب التخصص — سلّم أولويات، الأعلى ثقة الأول:
     1) supplier    → تصنيف إعلانات البيزنس نفسه            (أقوى دليل)
     2) wa_category → `whatsapp_conversations.first_category`
     3) listing     → إعلان مسجّل بنفس الرقم
     4) words       → كلمات في رسايله الواردة (تصويت: الأكتر تكرار يكسب)
     5) none        → **بنسيبه فاضي عن قصد.** مابنخمّنش. بيبان في الشاشة
                      تحت «محتاج تصنيف» وبيتوزّع بالدور على الكل.
   ⚠️ p_force=false يعني مابنلمسش أي تصنيف اتحط بالإيد (specialty_src='manual').
   ⚠️ القواعد كلها في `crm_specialties` — ديناميك، مش متكتّبة في الكود. */
DECLARE v_n int := 0;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  WITH sup_cat AS (
    SELECT l.supplier_id, crm_specialty_for_cat(coalesce(p.slug,c.slug)) sk, count(*) n
      FROM listings l JOIN categories c ON c.id=l.category_id
      LEFT JOIN categories p ON p.id=c.parent_id
     WHERE l.supplier_id IS NOT NULL GROUP BY 1,2
  ), sup_best AS (
    SELECT DISTINCT ON (supplier_id) supplier_id, sk FROM sup_cat
     WHERE sk IS NOT NULL ORDER BY supplier_id, n DESC
  ), wa AS (
    SELECT crm_norm_phone(w.contact_phone) ph,
           crm_specialty_for_cat((array_agg(w.first_category)
             FILTER (WHERE w.first_category IS NOT NULL AND w.first_category <> 'null'))[1]) sk
      FROM whatsapp_conversations w
     WHERE crm_norm_phone(w.contact_phone) IS NOT NULL GROUP BY 1
  ), lst AS (
    SELECT crm_norm_phone(l.contact_phone) ph, crm_specialty_for_cat(coalesce(p.slug,c.slug)) sk, count(*) n
      FROM listings l JOIN categories c ON c.id=l.category_id
      LEFT JOIN categories p ON p.id=c.parent_id
     WHERE crm_norm_phone(l.contact_phone) IS NOT NULL GROUP BY 1,2
  ), lst_best AS (
    SELECT DISTINCT ON (ph) ph, sk FROM lst WHERE sk IS NOT NULL ORDER BY ph, n DESC
  ), txt AS (
    SELECT crm_norm_phone(w.contact_phone) ph, string_agg(m.body,' ') body
      FROM whatsapp_conversations w JOIN whatsapp_messages m ON m.conversation_id=w.id
     WHERE m.direction='inbound' AND coalesce(m.body,'') <> ''
       AND crm_norm_phone(w.contact_phone) IS NOT NULL GROUP BY 1
  ), res AS (
    SELECT cc.id,
      coalesce(sb.sk, wa.sk, lb.sk, crm_specialty_for_text(t.body)) sk,
      CASE WHEN sb.sk IS NOT NULL THEN 'supplier'
           WHEN wa.sk IS NOT NULL THEN 'wa_category'
           WHEN lb.sk IS NOT NULL THEN 'listing'
           WHEN crm_specialty_for_text(t.body) IS NOT NULL THEN 'words' END src
      FROM crm_contacts cc
      LEFT JOIN sup_best sb ON sb.supplier_id = cc.supplier_id
      LEFT JOIN wa      ON wa.ph = cc.phone
      LEFT JOIN lst_best lb ON lb.ph = cc.phone
      LEFT JOIN txt t   ON t.ph  = cc.phone
     WHERE p_force OR (cc.specialty IS NULL AND coalesce(cc.specialty_src,'') <> 'manual')
  ), upd AS (
    UPDATE crm_contacts cc SET specialty = r.sk, specialty_src = r.src, updated_at = now()
      FROM res r WHERE r.id = cc.id AND r.sk IS NOT NULL
        AND coalesce(cc.specialty_src,'') <> 'manual'
        AND (cc.specialty IS DISTINCT FROM r.sk)
    RETURNING 1
  ) SELECT count(*) INTO v_n FROM upd;

  RETURN jsonb_build_object('ok', true, 'classified', v_n,
    'by_specialty', (SELECT jsonb_object_agg(coalesce(specialty,'—'), n)
                       FROM (SELECT specialty, count(*) n FROM crm_contacts GROUP BY 1) x),
    'unclassified', (SELECT count(*) FROM crm_contacts WHERE specialty IS NULL));
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_contact_activity(p_phone text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📦 نشاط العميل على المنصة — حجوزات · طلبات · استفسارات.
   ⚠️ الأعمدة مش موحّدة: `marketplace_bookings.guest_phone` و
      `marketplace_orders.guest_phone|delivery_phone` — مفيش `customer_phone`.
      اتكشف بالتجربة (PL/pgSQL بيفحص الجسم وقت التنفيذ مش وقت الإنشاء). */
  select jsonb_build_object(
    'bookings', (select count(*) from marketplace_bookings b
                  where crm_norm_phone_any(b.guest_phone) = p_phone),
    'orders',   (select count(*) from marketplace_orders o
                  where crm_norm_phone_any(o.guest_phone) = p_phone
                     or crm_norm_phone_any(o.delivery_phone) = p_phone),
    'inquiries',(select count(*) from listing_inquiries i
                  where crm_norm_phone_any(i.owner_phone) = p_phone));
$function$
;

CREATE OR REPLACE FUNCTION public.crm_contact_detail(p_contact uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🔍 ملف العميل الكامل — ده اللي الموظف بيقراه وهو بيرن عليه.
   محمد: «هل تفاصيل الإعلان أو الشخص بيظهر للموظف لما بيدوس اتصال؟»
   🎙️ (٢٢ أغسطس) وكمان بيرجّع `audio_path` لكل مكالمة — التسجيل الصوتي
      الحقيقي، بيتفتح بلينك موقّع من `crm_call_audio_url`. */
DECLARE v jsonb; v_phone text; v_sup uuid;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  SELECT phone, supplier_id INTO v_phone, v_sup FROM crm_contacts WHERE id = p_contact;
  IF v_phone IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'العميل مش موجود'); END IF;

  SELECT jsonb_build_object('ok', true,
    'contact', (SELECT jsonb_build_object('id',c.id,'phone',c.phone,
        'phone_kind',coalesce(c.phone_kind,'mobile'),
        'name',coalesce(c.display_name, s.business_name),
        'specialty',c.specialty,'specialty_ar',sp.name_ar,'specialty_src',c.specialty_src,
        'raw_category',c.raw_category,'city',c.city,'source',c.source_label,
        'owner_id',c.owner_id,'owner',st.full_name,'status',c.status,'kind',c.kind,
        'supplier_id',c.supplier_id,'business',s.business_name,'business_city',s.city,
        'last_contact_at',c.last_contact_at,'next_action_at',c.next_action_at,'notes',c.notes)
      FROM crm_contacts c
      LEFT JOIN crm_specialties sp ON sp.key=c.specialty
      LEFT JOIN crm_staff() st ON st.profile_id=c.owner_id
      LEFT JOIN suppliers s ON s.id=c.supplier_id
     WHERE c.id=p_contact),

    'listings', (SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'id', l.id, 'title', l.title, 'slug', l.slug, 'status', l.status::text,
          'status_ar', CASE l.status::text WHEN 'published' THEN 'منشور'
                        WHEN 'draft' THEN 'مسودة' WHEN 'paused' THEN 'موقوف'
                        WHEN 'rejected' THEN 'مرفوض' ELSE l.status::text END,
          'price', l.price_egp, 'price_on_request', l.price_on_request,
          'city', l.city, 'district', l.district,
          'category', cat.name_ar, 'created_at', l.created_at,
          'reason', coalesce(l.pause_reason, l.rejection_reason)) x
          FROM listings l LEFT JOIN categories cat ON cat.id = l.category_id
         WHERE crm_norm_phone_any(l.contact_phone) = v_phone
            OR (v_sup IS NOT NULL AND l.supplier_id = v_sup)
         ORDER BY l.created_at DESC LIMIT 20) z),

    'calls', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',k.id,'started_at',k.started_at,
        'direction',k.direction,'channel',k.channel,'duration_sec',k.duration_sec,
        'summary',k.summary_ar,'transcript',k.transcript,'outcome',k.outcome,
        'staff',(SELECT full_name FROM crm_staff() x WHERE x.profile_id=k.staff_id),
        'filled_by',k.filled_by,
        'audio_path',k.audio_path,'audio_seconds',k.audio_seconds,
        'transcript_source',k.transcript_source) ORDER BY k.started_at DESC),'[]'::jsonb)
       FROM crm_calls k WHERE k.contact_id=p_contact),

    'tasks', (SELECT coalesce(jsonb_agg(jsonb_build_object('id',t.id,'title',t.title,'detail',t.detail,
        'status',t.status,'priority',t.priority,'specialty',t.specialty,'due_at',t.due_at,
        'owner',(SELECT full_name FROM crm_staff() x WHERE x.profile_id=t.owner_id),
        'routed_from',(SELECT full_name FROM crm_staff() x WHERE x.profile_id=t.routed_from),
        'route_reason',t.route_reason,'created_at',t.created_at)
        ORDER BY (t.status='done'), t.created_at DESC),'[]'::jsonb)
       FROM flow_tasks t WHERE t.contact_id=p_contact),

    'messages', (SELECT coalesce(jsonb_agg(m),'[]'::jsonb) FROM (
        SELECT jsonb_build_object('at',mm.created_at,'dir',mm.direction,'body',left(mm.body,600)) m
          FROM whatsapp_conversations w JOIN whatsapp_messages mm ON mm.conversation_id=w.id
         WHERE crm_norm_phone(w.contact_phone)=v_phone AND coalesce(mm.body,'')<>''
         ORDER BY mm.created_at DESC LIMIT 30) z),

    'activity', crm_contact_activity(v_phone)
  ) INTO v;
  RETURN v;
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_contacts_list(p_specialty text DEFAULT NULL::text, p_owner uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_q text DEFAULT NULL::text, p_limit integer DEFAULT 50, p_offset integer DEFAULT 0)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📋 قايمة الأرقام بفلاتر — بتخدم شاشة الأدمن، التصدير، **وتاب «كل الأرقام»
   بتاع المدير في الموبايل**.
   محمد (٢٢ أغسطس): «افتح لينا إحنا كمان الجدول — ممكن الأمور تكون محتاجة
   مدير يتواصل معاهم». فالمدير بيوصل لأي رقم حتى لو مش بتاعه.
   p_specialty = '__none__' يعني «اللي لسه مش متصنّف». السقف ٥٠٠٠ صف.
   ⚠️ الشرط متكرّر في العدّ وفي الصفوف عن قصد — الـpooler transaction-mode
      والجداول المؤقتة بتتلغبط فيه. */
DECLARE v jsonb; v_total int; v_lim int := least(greatest(coalesce(p_limit,50),1), 5000);
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  SELECT count(*) INTO v_total FROM crm_contacts c
   WHERE (p_specialty IS NULL OR (p_specialty='__none__' AND c.specialty IS NULL) OR c.specialty = p_specialty)
     AND (p_owner IS NULL OR c.owner_id = p_owner)
     AND (p_status IS NULL OR c.status = p_status)
     AND (coalesce(p_q,'') = '' OR c.phone ILIKE '%'||p_q||'%'
          OR crm_norm_ar(coalesce(c.display_name,'')) LIKE '%'||crm_norm_ar(p_q)||'%'
          OR crm_norm_ar(coalesce(c.city,''))         LIKE '%'||crm_norm_ar(p_q)||'%');

  SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO v FROM (
    SELECT jsonb_build_object(
      'id', c.id, 'phone', c.phone, 'phone_kind', coalesce(c.phone_kind,'mobile'),
      'name', coalesce(c.display_name, s.business_name),
      'specialty', c.specialty, 'specialty_ar', sp.name_ar, 'specialty_src', c.specialty_src,
      'raw_category', c.raw_category, 'city', c.city, 'source', c.source_label,
      'owner_id', c.owner_id, 'owner', st.full_name,
      'status', c.status, 'kind', c.kind, 'supplier_id', c.supplier_id,
      'business', s.business_name, 'notes', c.notes,
      'last_contact_at', c.last_contact_at, 'next_action_at', c.next_action_at,
      'calls', (SELECT count(*) FROM crm_calls k WHERE k.contact_id=c.id),
      'open_tasks', (SELECT count(*) FROM flow_tasks t WHERE t.contact_id=c.id AND t.status<>'done')
    ) x
    FROM crm_contacts c
    LEFT JOIN crm_specialties sp ON sp.key = c.specialty
    LEFT JOIN crm_staff() st ON st.profile_id = c.owner_id
    LEFT JOIN suppliers s ON s.id = c.supplier_id
   WHERE (p_specialty IS NULL OR (p_specialty='__none__' AND c.specialty IS NULL) OR c.specialty = p_specialty)
     AND (p_owner IS NULL OR c.owner_id = p_owner)
     AND (p_status IS NULL OR c.status = p_status)
     AND (coalesce(p_q,'') = '' OR c.phone ILIKE '%'||p_q||'%'
          OR crm_norm_ar(coalesce(c.display_name,'')) LIKE '%'||crm_norm_ar(p_q)||'%'
          OR crm_norm_ar(coalesce(c.city,''))         LIKE '%'||crm_norm_ar(p_q)||'%')
   ORDER BY c.last_contact_at DESC NULLS LAST, c.created_at DESC
   LIMIT v_lim OFFSET greatest(coalesce(p_offset,0),0)) z;

  RETURN jsonb_build_object('ok', true, 'total', v_total, 'rows', v);
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_delete_specialty(p_key text, p_move_to text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🗑️ مسح تخصص. عشان `crm_contacts.specialty` عليها FK، لازم نقول الأرقام
   تروح فين: `p_move_to` = تخصص تاني، أو NULL يعني ترجع «مش متصنّفة».
   بيمسح كمان ربط الموظفين بالتخصص ده وتاسكاته بتترحّل. */
DECLARE v_c int; v_s int; v_t int;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_specialties WHERE key = p_key) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'التخصص مش موجود'); END IF;
  IF p_move_to IS NOT NULL AND NOT EXISTS (SELECT 1 FROM crm_specialties WHERE key = p_move_to) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'التخصص اللي هننقل ليه مش موجود'); END IF;
  IF p_move_to = p_key THEN
    RETURN jsonb_build_object('ok', false, 'error', 'مينفعش ننقل التخصص لنفسه'); END IF;

  UPDATE crm_contacts SET specialty = p_move_to,
         specialty_src = CASE WHEN p_move_to IS NULL THEN NULL ELSE 'manual' END, updated_at = now()
   WHERE specialty = p_key;
  GET DIAGNOSTICS v_c = ROW_COUNT;

  UPDATE flow_tasks SET specialty = p_move_to, updated_at = now() WHERE specialty = p_key;
  GET DIAGNOSTICS v_t = ROW_COUNT;

  DELETE FROM crm_staff_specialties WHERE specialty = p_key;
  GET DIAGNOSTICS v_s = ROW_COUNT;

  DELETE FROM crm_specialties WHERE key = p_key;
  RETURN jsonb_build_object('ok', true, 'moved_contacts', v_c, 'moved_tasks', v_t, 'unlinked_staff', v_s,
    'moved_to', coalesce(p_move_to, 'مش متصنّف'));
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_import_contacts(p_rows jsonb, p_source text DEFAULT 'import'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📥 (٢١ أغسطس ٢٠٢٦) استيراد أرقام من ملف خارجي (درايف/إكسل/CSV).
   p_rows = [{phone,name,business,category_hint,city,notes,sources}, …]

   ⚠️ **بيقبل الأرضي كمان** (محمد: «رجّع أرقام المصانع») — بيتطبّع بـ
      `crm_norm_phone_any` وبيتوسم `phone_kind='landline'`. الفرق مهم:
      الأرضي **مايتبعتلوش واتساب** ولا رسايل، بيتكلّم بس.
   ⚠️ **مابيدهسش**: بيملا الناقص، والتصنيف اليدوي مالوش سلطان عليه.
   ⚠️ نفس المكان اللي هيتحمّل منه أي ملف جاي بعد كده — مفيش كود جديد. */
DECLARE v_new int:=0; v_upd int:=0; v_bad int:=0; v_tot int:=0; v_land int:=0;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  WITH src AS (
    SELECT crm_norm_phone_any(r->>'phone') AS ph,
           nullif(trim(coalesce(r->>'name', r->>'business')),'') AS nm,
           nullif(trim(r->>'business'),'') AS biz,
           nullif(trim(r->>'category_hint'),'') AS cat,
           nullif(trim(r->>'city'),'') AS city,
           nullif(trim(r->>'notes'),'') AS notes,
           nullif(trim(r->>'sources'),'') AS srcs
      FROM jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) r
  ), ok AS (
    SELECT DISTINCT ON (ph) ph, crm_phone_kind(ph) AS kind,
           coalesce(nm, biz) AS nm, cat, city, notes,
           coalesce(srcs, p_source) AS srcs,
           crm_specialty_for_any(cat) AS sk
      FROM src WHERE ph IS NOT NULL AND crm_phone_kind(ph) IS NOT NULL
     ORDER BY ph, (nm IS NULL), (cat IS NULL)
  ), ins AS (
    INSERT INTO crm_contacts (phone, phone_kind, display_name, kind, city, notes,
                              raw_category, source_label, specialty, specialty_src)
    SELECT ph, kind, nm, 'lead', city, notes, cat, srcs, sk,
           CASE WHEN sk IS NOT NULL THEN 'import' END
      FROM ok
    ON CONFLICT (phone) DO UPDATE SET
      phone_kind    = coalesce(crm_contacts.phone_kind, excluded.phone_kind),
      display_name  = coalesce(crm_contacts.display_name, excluded.display_name),
      city          = coalesce(crm_contacts.city, excluded.city),
      notes         = coalesce(crm_contacts.notes, excluded.notes),
      raw_category  = coalesce(crm_contacts.raw_category, excluded.raw_category),
      source_label  = coalesce(crm_contacts.source_label || ' | ', '') || excluded.source_label,
      specialty     = CASE WHEN coalesce(crm_contacts.specialty_src,'') = 'manual'
                           THEN crm_contacts.specialty
                           ELSE coalesce(crm_contacts.specialty, excluded.specialty) END,
      specialty_src = CASE WHEN coalesce(crm_contacts.specialty_src,'') = 'manual' THEN 'manual'
                           WHEN crm_contacts.specialty IS NULL AND excluded.specialty IS NOT NULL THEN 'import'
                           ELSE crm_contacts.specialty_src END,
      updated_at = now()
    RETURNING (xmax = 0) AS inserted
  )
  SELECT count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted) INTO v_new, v_upd FROM ins;

  SELECT count(*), count(*) FILTER (WHERE crm_norm_phone_any(r->>'phone') IS NULL),
         count(*) FILTER (WHERE crm_phone_kind(crm_norm_phone_any(r->>'phone')) = 'landline')
    INTO v_tot, v_bad, v_land FROM jsonb_array_elements(coalesce(p_rows,'[]'::jsonb)) r;

  RETURN jsonb_build_object('ok', true, 'received', v_tot, 'added', v_new,
    'updated', v_upd, 'rejected', v_bad, 'landlines', v_land,
    'total', (SELECT count(*) FROM crm_contacts));
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_ingest_contacts()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📥 (٢١ أغسطس ٢٠٢٦) بيجمع كل الأرقام من كل مكان في `crm_contacts`. idempotent.
   ⚠️ `max()` مابتشتغلش على uuid — بنستخدم `(array_agg(x))[1]`.
   ⚠️ `customers.supplier_id` و`listings.supplier_id` فيهم صفوف يتيمة —
      بنفلترها بـEXISTS، وإلا الـFK بيقع. */
DECLARE v_new int := 0; v_upd int := 0;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  WITH src AS (
    SELECT crm_norm_phone(contact_phone) AS ph, max(contact_name) AS nm,
           'lead'::text AS kind, NULL::uuid AS sup, max(last_message_at) AS last_at
      FROM whatsapp_conversations WHERE crm_norm_phone(contact_phone) IS NOT NULL GROUP BY 1
    UNION ALL
    SELECT crm_norm_phone(contact_phone), max(business_name), 'supplier', (array_agg(id))[1], NULL
      FROM suppliers WHERE crm_norm_phone(contact_phone) IS NOT NULL GROUP BY 1
    UNION ALL
    SELECT crm_norm_phone(c.phone), max(c.full_name), 'customer',
           (array_agg(c.supplier_id) FILTER (WHERE EXISTS (SELECT 1 FROM suppliers s WHERE s.id=c.supplier_id)))[1], NULL
      FROM customers c WHERE crm_norm_phone(c.phone) IS NOT NULL GROUP BY 1
    UNION ALL
    SELECT crm_norm_phone(l.contact_phone), max(l.title), 'lead',
           (array_agg(l.supplier_id) FILTER (WHERE EXISTS (SELECT 1 FROM suppliers s WHERE s.id=l.supplier_id)))[1], NULL
      FROM listings l WHERE crm_norm_phone(l.contact_phone) IS NOT NULL GROUP BY 1
  ), rolled AS (
    SELECT ph, max(nm) FILTER (WHERE nm IS NOT NULL) AS nm,
           CASE WHEN bool_or(kind='supplier') THEN 'supplier'
                WHEN bool_or(kind='customer') THEN 'customer' ELSE 'lead' END AS kind,
           (array_agg(sup) FILTER (WHERE sup IS NOT NULL))[1] AS sup,
           max(last_at) AS last_at
      FROM src GROUP BY ph
  ), ins AS (
    INSERT INTO crm_contacts (phone, display_name, kind, supplier_id, last_contact_at)
    SELECT ph, nm, kind, sup, last_at FROM rolled
    ON CONFLICT (phone) DO UPDATE
      SET display_name = coalesce(crm_contacts.display_name, excluded.display_name),
          kind = excluded.kind,
          supplier_id = coalesce(crm_contacts.supplier_id, excluded.supplier_id),
          last_contact_at = greatest(coalesce(crm_contacts.last_contact_at, '-infinity'::timestamptz),
                                     coalesce(excluded.last_contact_at, '-infinity'::timestamptz)),
          updated_at = now()
    RETURNING (xmax = 0) AS inserted
  )
  SELECT count(*) FILTER (WHERE inserted), count(*) FILTER (WHERE NOT inserted)
    INTO v_new, v_upd FROM ins;

  RETURN jsonb_build_object('ok', true, 'added', v_new, 'updated', v_upd,
    'total', (SELECT count(*) FROM crm_contacts));
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_log_call(p_contact uuid, p_transcript text, p_summary text DEFAULT NULL::text, p_outcome text DEFAULT NULL::text, p_tasks jsonb DEFAULT '[]'::jsonb, p_direction text DEFAULT 'outbound'::text, p_channel text DEFAULT 'phone'::text, p_duration_sec integer DEFAULT NULL::integer, p_staff uuid DEFAULT NULL::uuid, p_started_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_next_action_at timestamp with time zone DEFAULT NULL::timestamp with time zone, p_audio_path text DEFAULT NULL::text, p_audio_seconds integer DEFAULT NULL::integer, p_transcript_source text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* ☎️ المارد بيفرّغ المكالمة ويحطّ التاسكات. (٢١ أغسطس · اتوسّعت ٢٢)
   🔀 التاسك اللي تخصصه مختلف بينزل عند مسؤول التخصص (`crm_pick_owner`).
   🎙️ `p_audio_path` = التسجيل الصوتي الحقيقي في bucket `crm-calls`.
   🧑‍💼 (٢٢ أغسطس) لو اللي بيكلّم **مش صاحب الرقم** (يعني مدير اتدخّل)،
      الملخّص بيتوسم «مكالمة من المدير» — عشان صاحب الرقم يشوفها في ملفه
      ويعرف اللي حصل بدل ما يتفاجئ. محمد: «ممكن الأمور تكون محتاجة مدير
      يتواصل معاهم».
   ⚠️ الملكية **مابتتغيّرش**: المدير بيكلّم، والرقم يفضل مع صاحبه. */
DECLARE
  v_call uuid; v_staff uuid; v_spec text; v_owner uuid;
  t jsonb; v_task_owner uuid; v_routed int := 0; v_made int := 0; v_reason text;
  v_status text; v_sum text;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  SELECT specialty, owner_id INTO v_spec, v_owner FROM crm_contacts WHERE id = p_contact;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'العميل مش موجود'); END IF;

  v_staff := coalesce(p_staff, auth.uid(), v_owner);
  v_sum := CASE WHEN v_owner IS NOT NULL AND v_owner <> v_staff
                THEN '🧑‍💼 مكالمة من المدير — ' || coalesce(p_summary,'')
                ELSE p_summary END;

  INSERT INTO crm_calls (contact_id, staff_id, direction, started_at, duration_sec, channel,
                         transcript, summary_ar, outcome, filled_by,
                         audio_path, audio_seconds, transcript_source)
  VALUES (p_contact, v_staff, coalesce(p_direction,'outbound'), coalesce(p_started_at, now()),
          p_duration_sec, coalesce(p_channel,'phone'), p_transcript, v_sum, p_outcome, 'marid',
          p_audio_path, p_audio_seconds, p_transcript_source)
  RETURNING id INTO v_call;

  v_status := CASE p_outcome
    WHEN 'interested' THEN 'interested' WHEN 'offer_sent' THEN 'offer_sent'
    WHEN 'won' THEN 'won' WHEN 'lost' THEN 'lost'
    WHEN 'not_interested' THEN 'lost' WHEN 'spam' THEN 'spam'
    ELSE 'contacted' END;

  UPDATE crm_contacts SET status = v_status,
      last_contact_at = greatest(coalesce(last_contact_at,'-infinity'::timestamptz), coalesce(p_started_at, now())),
      next_action_at = coalesce(p_next_action_at, next_action_at), updated_at = now()
   WHERE id = p_contact;

  FOR t IN SELECT * FROM jsonb_array_elements(coalesce(p_tasks,'[]'::jsonb)) LOOP
    IF coalesce(t->>'title','') = '' THEN CONTINUE; END IF;
    -- ⚠️ التاسك الافتراضي بيروح لـ**صاحب الرقم** مش للمدير اللي كلّم —
    --    المدير بيتدخّل في المكالمة، بس المتابعة تفضل مع صاحبها.
    v_task_owner := coalesce(v_owner, v_staff); v_reason := NULL;

    IF (t->>'specialty') IS NOT NULL AND (t->>'specialty') IS DISTINCT FROM v_spec THEN
      v_task_owner := crm_pick_owner(t->>'specialty');
      IF v_task_owner IS NULL THEN
        v_task_owner := coalesce(v_owner, v_staff);
        v_reason := 'التخصص «' || (t->>'specialty') || '» لسه مالوش مسؤول — التاسك فضل مع صاحب الرقم';
      ELSIF v_task_owner <> coalesce(v_owner, v_staff) THEN
        v_reason := 'ظهر في المكالمة موضوع تخصص «' || (t->>'specialty') || '» فاتحوّل تلقائيًا';
        v_routed := v_routed + 1;
      END IF;
    ELSIF v_owner IS NOT NULL AND v_owner <> v_staff THEN
      v_reason := 'التاسك اتعمل من مكالمة عملها المدير';
    END IF;

    INSERT INTO flow_tasks (title, detail, status, priority, source, flow_name,
                            owner_id, contact_id, call_id, specialty, due_at,
                            routed_from, route_reason, supplier_id, assignee_name)
    SELECT t->>'title', t->>'detail', 'pending',
           coalesce(nullif(t->>'priority',''),'medium'), 'crm-call', 'مكالمة CRM',
           v_task_owner, p_contact, v_call,
           coalesce(nullif(t->>'specialty',''), v_spec),
           nullif(t->>'due_at','')::timestamptz,
           CASE WHEN v_task_owner <> v_staff THEN v_staff END, v_reason,
           c.supplier_id, st.full_name
      FROM crm_contacts c LEFT JOIN crm_staff() st ON st.profile_id = v_task_owner
     WHERE c.id = p_contact;
    v_made := v_made + 1;
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'call_id', v_call,
    'tasks_created', v_made, 'tasks_routed', v_routed, 'contact_status', v_status,
    'audio_saved', p_audio_path IS NOT NULL,
    'by_manager', v_owner IS NOT NULL AND v_owner <> v_staff);
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_my_badge()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
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
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_my_queue(p_limit integer DEFAULT 40, p_as uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📱 شاشة الموظف — «مكالماتي».
   محمد (٢٢ أغسطس): «تاب المكالمات مفيش فيه أرقام لسه — مش مربوط».
   🐞 وهو **كان مربوط**، والتوزيع اتعمل (٤٬٧٥٠ رقم متوزّعين). المشكلة إن
      محمد نفسه متسجّل **موزّع** (`receives_leads=false`) — فطبيعي مايشوفش
      أرقام باسمه، والشاشة كانت بتقوله «التوزيع لسه ماتعملش» وده غلط.

   الحل: الشاشة بقت بتعرف إنت مين:
     • موظف عادي  → أرقامه هو
     • **موزّع**   → بيشوف حالة الفريق كله، ويقدر يفتح قايمة أي حد منهم
                     (`p_as`) — عشان يتابع ويسمع المكالمات.

   ⚠️ `p_as` مسموحة **للموزّع بس**؛ أي حد تاني بتترمي ويرجع لقايمته هو. */
DECLARE v jsonb; v_me uuid := auth.uid(); v_disp boolean; v_view uuid;
BEGIN
  IF NOT public.is_madmona_staff() THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الشاشة دي لفريق مضمونة');
  END IF;

  SELECT coalesce(is_dispatcher,false) INTO v_disp FROM crm_staff_settings WHERE profile_id = v_me;
  v_disp := coalesce(v_disp, false);
  v_view := CASE WHEN v_disp AND p_as IS NOT NULL
                  AND EXISTS (SELECT 1 FROM crm_staff() WHERE profile_id = p_as)
                 THEN p_as ELSE v_me END;

  SELECT jsonb_build_object('ok', true,
    'me', (SELECT jsonb_build_object('id', st.profile_id, 'name', st.full_name,
             'is_dispatcher', v_disp,
             'viewing', v_view,
             'viewing_name', (SELECT full_name FROM crm_staff() x WHERE x.profile_id = v_view),
             'specialties', (SELECT coalesce(jsonb_agg(jsonb_build_object('key', s.key, 'name_ar', s.name_ar)),'[]'::jsonb)
                               FROM crm_staff_specialties ss JOIN crm_specialties s ON s.key = ss.specialty
                              WHERE ss.profile_id = v_view AND ss.active))
             FROM crm_staff() st WHERE st.profile_id = v_me),

    -- 👥 للموزّع: حالة الفريق كله في نظرة واحدة
    'team', CASE WHEN v_disp THEN (
      SELECT coalesce(jsonb_agg(jsonb_build_object(
        'profile_id', st.profile_id, 'name', st.full_name,
        'receives', coalesce(ss.receives_leads, true),
        'mine', (SELECT count(*) FROM crm_contacts c WHERE c.owner_id = st.profile_id),
        'due', (SELECT count(*) FROM crm_contacts c WHERE c.owner_id = st.profile_id
                 AND c.status NOT IN ('won','lost','spam')
                 AND (c.status='new' OR (c.next_action_at IS NOT NULL AND c.next_action_at <= now()))),
        'done', (SELECT count(*) FROM crm_contacts c WHERE c.owner_id = st.profile_id
                  AND c.status NOT IN ('new')),
        'calls', (SELECT count(*) FROM crm_calls k WHERE k.staff_id = st.profile_id),
        'calls_today', (SELECT count(*) FROM crm_calls k WHERE k.staff_id = st.profile_id
                         AND k.started_at >= date_trunc('day', now() AT TIME ZONE 'Africa/Cairo')),
        'open_tasks', (SELECT count(*) FROM flow_tasks t WHERE t.owner_id = st.profile_id AND t.status <> 'done')
      ) ORDER BY st.full_name),'[]'::jsonb)
      FROM crm_staff() st LEFT JOIN crm_staff_settings ss ON ss.profile_id = st.profile_id
    ) ELSE NULL END,

    'counts', (SELECT jsonb_build_object(
        'mine', count(*),
        'todo', count(*) FILTER (WHERE status IN ('new','contacted')),
        'due',  count(*) FILTER (WHERE next_action_at IS NOT NULL AND next_action_at <= now()),
        'never',count(*) FILTER (WHERE status = 'new'))
        FROM crm_contacts WHERE owner_id = v_view),
    'open_tasks', (SELECT count(*) FROM flow_tasks WHERE owner_id = v_view AND status <> 'done'),
    'unassigned', (SELECT count(*) FROM crm_contacts WHERE owner_id IS NULL),

    'queue', (SELECT coalesce(jsonb_agg(x),'[]'::jsonb) FROM (
        SELECT jsonb_build_object(
          'id', c.id, 'phone', c.phone, 'phone_kind', coalesce(c.phone_kind,'mobile'),
          'name', coalesce(c.display_name, s.business_name), 'city', c.city,
          'specialty', c.specialty, 'specialty_ar', sp.name_ar,
          'status', c.status, 'notes', c.notes, 'source', c.source_label,
          'last_contact_at', c.last_contact_at, 'next_action_at', c.next_action_at,
          'calls', (SELECT count(*) FROM crm_calls k WHERE k.contact_id = c.id)) x
          FROM crm_contacts c
          LEFT JOIN crm_specialties sp ON sp.key = c.specialty
          LEFT JOIN suppliers s ON s.id = c.supplier_id
         WHERE c.owner_id = v_view AND c.status NOT IN ('won','lost','spam')
         ORDER BY (c.next_action_at IS NOT NULL AND c.next_action_at <= now()) DESC,
                  c.next_action_at ASC NULLS LAST,
                  (c.status = 'new') DESC,
                  c.last_contact_at ASC NULLS FIRST
         LIMIT least(greatest(coalesce(p_limit,40),1),200)) z),

    'tasks', (SELECT coalesce(jsonb_agg(y),'[]'::jsonb) FROM (
        SELECT jsonb_build_object('id', t.id, 'title', t.title, 'detail', t.detail,
          'priority', t.priority, 'status', t.status, 'due_at', t.due_at,
          'specialty_ar', sp.name_ar, 'route_reason', t.route_reason,
          'routed_from', rf.full_name,
          'contact_id', t.contact_id, 'contact_phone', c.phone,
          'contact_name', c.display_name) y
          FROM flow_tasks t
          LEFT JOIN crm_specialties sp ON sp.key = t.specialty
          LEFT JOIN crm_staff() rf ON rf.profile_id = t.routed_from
          LEFT JOIN crm_contacts c ON c.id = t.contact_id
         WHERE t.owner_id = v_view AND t.status <> 'done'
         ORDER BY (t.priority='high') DESC, t.due_at ASC NULLS LAST, t.created_at DESC
         LIMIT 100) w)
  ) INTO v;
  RETURN v;
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_norm_ar(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
/* 🔤 (٢١ أغسطس ٢٠٢٦) تطبيع عربي للمطابقة:
   أإآٱ→ا · ة→ه · ى→ي · ۀ→ه · التشكيل والتطويل يتشالوا · المسافات تتوحّد.
   ⚠️ لازم يتطبّق على **الطرفين** (النص وكلمة المطابقة) وإلا «شقة» مش هتلاقي «شقه». */
  select lower(regexp_replace(
    translate(coalesce(p,''), 'أإآٱةىۀًٌٍَُِّْـ', 'ااااهيه'),
    '\s+', ' ', 'g'));
$function$
;

CREATE OR REPLACE FUNCTION public.crm_norm_phone(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
  /* 📞 توحيد الرقم المصري: بنسيب آخر ١٠ أرقام ونحط 0 قدامهم.
     ⚠️ الأرقام اللي طولها غريب (IDs الواتساب زي 274625208541390) بترجع NULL
        عشان ماتدخلش القاعدة كأنها تليفون. */
  select case
    when p is null then null
    when length(regexp_replace(p,'\D','','g')) between 10 and 13
      and right(regexp_replace(p,'\D','','g'),10) ~ '^1[0-9]{9}$'
      then '0'||right(regexp_replace(p,'\D','','g'),10)
    else null end;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_norm_phone_any(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
/* ☎️ (٢١ أغسطس ٢٠٢٦) توحيد أي رقم مصري — موبايل **أو أرضي**.
   محمد: «رجّع أرقام المصانع» — المصانع معظمها أرضي، و`crm_norm_phone`
   بترميه عن قصد (عشان الواتساب). دي بتقبله، والتمييز في `crm_phone_kind`.
     +20 2 21257580 → 0221257580   ·  +20 3 4592238 → 034592238
     +20 48 2659000 → 0482659000   ·  +20 40 2102958 → 0402102958
   ⚠️ ترتيب الشيل مهم: 0020 الأول، وبعدين لو بادئ بـ0 نسيبه، وبعدين بس
      نشيل كود الدولة 20. لو عكسنا، «+20 3 4592238» بيطلع 02034592238 غلط.
   ⚠️ الخطوط الساخنة (16267 · 19773) بترجع NULL — دي مش أرقام تواصل. */
  with d as (select regexp_replace(coalesce(p,''),'\D','','g') v),
  n as (select v, case
          when v ~ '^0020'                      then substr(v,5)
          when v ~ '^0'                         then v
          when v ~ '^20' and length(v) >= 9     then substr(v,3)
          else v end w from d)
  select case
    when v ~ '^0020' and length(v) < 11 then null      -- كود دولة + رقم قصير = خط ساخن
    when v ~ '^20'   and length(v) < 9  then null
    when left(w,1) = '0'  and length(w) between 9 and 11 then w
    when left(w,1) <> '0' and length(w) between 8 and 10 then '0'||w
    else null end
  from n;
$function$
;

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
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_phone_kind(p text)
 RETURNS text
 LANGUAGE sql
 IMMUTABLE
AS $function$
/* موبايل ولا أرضي؟ الموبايل المصري = 01 + ٩ أرقام، والبادئة 010/011/012/015. */
  select case when coalesce(p,'') ~ '^01[0125][0-9]{8}$' then 'mobile'
              when coalesce(p,'') ~ '^0[0-9]{8,10}$'      then 'landline'
              else null end;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_pick_owner(p_specialty text)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🎯 مين المسؤول عن التخصص ده دلوقتي؟ = أقل واحد حِمل من موظفينه المفعّلين
   **اللي بياخدوا ليدات**. لو التخصص ملوش مسؤول → NULL (والمنادي بيتصرّف). */
  select ss.profile_id
    from crm_staff_specialties ss
    join crm_receivers() st on st.profile_id = ss.profile_id
   where ss.specialty = p_specialty and ss.active
   order by ss.is_primary desc nulls last,
            (select count(*) from flow_tasks t
              where t.owner_id = ss.profile_id and t.status <> 'done'),
            (select count(*) from crm_contacts c where c.owner_id = ss.profile_id),
            st.full_name
   limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_receivers()
 RETURNS TABLE(profile_id uuid, full_name text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 📥 (٢٢ أغسطس ٢٠٢٦) الموظفين اللي **بياخدوا** ليدات فعلًا.
   محمد: «أحمد سامي هو اللي هيوزّع» — فالموزّع مايدخلش التوزيع بالدور
   ولا يتحوّلّه تاسك، إلا لو محمد شغّل `receives_leads` من الشاشة.
   ⚠️ الافتراضي `true`: أي موظف جديد بياخد ليدات لحد ما نقول غير كده. */
  select st.profile_id, st.full_name, st.role
    from crm_staff() st
    left join crm_staff_settings ss on ss.profile_id = st.profile_id
   where coalesce(ss.receives_leads, true)
   order by st.full_name;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_save_specialty(p_key text, p_name_ar text, p_match_cats text[] DEFAULT NULL::text[], p_match_words text[] DEFAULT NULL::text[], p_sort integer DEFAULT NULL::integer, p_active boolean DEFAULT true)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* ✏️ إضافة/تعديل تخصص وقواعد مطابقته. القواعد داتا مش كود. */
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF coalesce(p_key,'') !~ '^[a-z0-9_-]{2,32}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'المفتاح لازم يكون إنجليزي صغير بدون مسافات'); END IF;
  IF coalesce(p_name_ar,'') = '' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'الاسم العربي مطلوب'); END IF;

  INSERT INTO crm_specialties (key, name_ar, match_cats, match_words, sort_order, active)
  VALUES (p_key, p_name_ar, coalesce(p_match_cats,'{}'), coalesce(p_match_words,'{}'),
          coalesce(p_sort, 500), coalesce(p_active,true))
  ON CONFLICT (key) DO UPDATE SET
    name_ar = excluded.name_ar,
    match_cats = coalesce(p_match_cats, crm_specialties.match_cats),
    match_words = coalesce(p_match_words, crm_specialties.match_words),
    sort_order = coalesce(p_sort, crm_specialties.sort_order),
    active = coalesce(p_active, crm_specialties.active);
  RETURN jsonb_build_object('ok', true, 'key', p_key);
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_set_contact(p_contact uuid, p_specialty text DEFAULT NULL::text, p_owner uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_notes text DEFAULT NULL::text, p_next_action_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* ✋ تعديل يدوي لعميل. تغيير التخصص بالإيد بيتسجّل `specialty_src='manual'`
   عشان إعادة التصنيف الأوتوماتيك **ماتدهسوش**. */
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  UPDATE crm_contacts SET
    specialty = coalesce(p_specialty, specialty),
    specialty_src = CASE WHEN p_specialty IS NOT NULL THEN 'manual' ELSE specialty_src END,
    owner_id = coalesce(p_owner, owner_id),
    assigned_at = CASE WHEN p_owner IS NOT NULL THEN now() ELSE assigned_at END,
    status = coalesce(p_status, status),
    notes = coalesce(p_notes, notes),
    next_action_at = coalesce(p_next_action_at, next_action_at),
    updated_at = now()
  WHERE id = p_contact;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'العميل مش موجود'); END IF;
  RETURN jsonb_build_object('ok', true);
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_set_staff_role(p_profile uuid, p_is_dispatcher boolean DEFAULT NULL::boolean, p_receives_leads boolean DEFAULT NULL::boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
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
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_set_staff_specialties(p_profile uuid, p_specialties text[], p_primary text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 👤 تحديد تخصصات موظف — بيستبدل القائمة كلها. */
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF NOT EXISTS (SELECT 1 FROM crm_staff() WHERE profile_id = p_profile) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ده مش موظف نشط في مضمونة أو مالوش حساب'); END IF;

  DELETE FROM crm_staff_specialties WHERE profile_id = p_profile
    AND (p_specialties IS NULL OR NOT (specialty = ANY(p_specialties)));
  INSERT INTO crm_staff_specialties (profile_id, specialty, is_primary, active)
  SELECT p_profile, s, (s = p_primary), true FROM unnest(coalesce(p_specialties,'{}')) s
  ON CONFLICT (profile_id, specialty) DO UPDATE SET is_primary = excluded.is_primary, active = true;
  RETURN jsonb_build_object('ok', true, 'count', coalesce(array_length(p_specialties,1),0));
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_specialty_for_any(p text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
/* 🧭 نص واحد (تصنيف خام من ملف، أو اسم قسم، أو سلَج) → مفتاح تخصص.
   بيجرّب بالترتيب: المفتاح نفسه ← الاسم العربي ← تطابق سلَج ← كلمات. */
  select coalesce(
    (select key from crm_specialties where active and lower(key)=lower(trim(coalesce(p,'')))),
    (select key from crm_specialties where active and crm_norm_ar(name_ar)=crm_norm_ar(trim(coalesce(p,'')))),
    crm_specialty_for_cat(coalesce(p,'')),
    crm_specialty_for_text(coalesce(p,''))
  );
$function$
;

CREATE OR REPLACE FUNCTION public.crm_specialty_for_cat(p_slug text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
/* 🏷️ سلَج تصنيف → تخصص. المطابقة **احتواء** مش تساوي، عشان السلَجات مركّبة
   (`sale-properties-residential` فيها `propert`). الترتيب بـsort_order فالأخص بيكسب. */
  select s.key from crm_specialties s
   where s.active and s.key <> 'other'
     and exists (select 1 from unnest(s.match_cats) c where p_slug ilike '%'||c||'%')
   order by s.sort_order limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_specialty_for_text(p_text text)
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
/* 💬 نص → تخصص.
   الترجيح: (١) عدد الكلمات اللي طابقت، (٢) **مين ظهر الأول في النص**، (٣) الترتيب.
   ⚠️ بند «مين ظهر الأول» ده مش رفاهية: «مراكب للإيجار» كان بيروح لـ«عقارات»
      لأن «إيجار» و«مركب» كل واحدة طابقت مرة، والعقارات ترتيبها أعلى.
      الموضوع بييجي أول الجملة، والوصف بعده. */
  with t as (select crm_norm_ar(p_text) v),
  m as (
    select s.key, s.sort_order,
           count(*) as hits,
           min(position(crm_norm_ar(w) in t.v)) as first_at
      from crm_specialties s, t, unnest(s.match_words) w
     where s.active and s.key <> 'other'
       and position(crm_norm_ar(w) in t.v) > 0
     group by s.key, s.sort_order
  )
  select key from m order by hits desc, first_at asc, sort_order limit 1;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_staff()
 RETURNS TABLE(profile_id uuid, full_name text, role text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 👥 موظفين مضمونة اللي **عندهم حساب** — دول بس اللي ينفع يتوزّع عليهم ليدات.
   البيزنس بيتحدد بـ`is_platform_owner` مش بـID متكتّب في الكود. */
  select p.id, coalesce(e.full_name, p.full_name), e.role
    from business_employees e
    join suppliers s on s.id = e.supplier_id
    join profiles  p on p.id = e.auth_user_id
   where coalesce(s.is_platform_owner,false)
     and e.employee_type='human' and e.status='active'
   order by 2;
$function$
;

CREATE OR REPLACE FUNCTION public.crm_task_update(p_task uuid, p_status text DEFAULT NULL::text, p_owner uuid DEFAULT NULL::uuid, p_specialty text DEFAULT NULL::text, p_due_at timestamp with time zone DEFAULT NULL::timestamp with time zone)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* ✅ تعديل تاسك. لو اتغيّر التخصص من غير ما نحدّد مسؤول، بيروح لمسؤول التخصص
   الجديد أوتوماتيك (نفس منطق المكالمة). */
DECLARE v_owner uuid; v_reason text;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  IF p_status IS NOT NULL AND p_status NOT IN ('pending','in_progress','done') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'حالة غير معروفة'); END IF;

  v_owner := p_owner;
  IF v_owner IS NULL AND p_specialty IS NOT NULL THEN
    v_owner := crm_pick_owner(p_specialty);
    IF v_owner IS NOT NULL THEN
      v_reason := 'التاسك اتحوّل لتخصص «' || p_specialty || '»';
    END IF;
  END IF;

  UPDATE flow_tasks SET
    status = coalesce(p_status, status),
    completed_at = CASE WHEN p_status='done' THEN now()
                        WHEN p_status IS NOT NULL THEN NULL ELSE completed_at END,
    specialty = coalesce(p_specialty, specialty),
    due_at = coalesce(p_due_at, due_at),
    routed_from = CASE WHEN v_owner IS NOT NULL AND v_owner <> owner_id THEN owner_id ELSE routed_from END,
    route_reason = coalesce(v_reason, route_reason),
    owner_id = coalesce(v_owner, owner_id),
    assignee_name = CASE WHEN v_owner IS NOT NULL
                         THEN (SELECT full_name FROM crm_staff() x WHERE x.profile_id=v_owner)
                         ELSE assignee_name END,
    updated_at = now()
  WHERE id = p_task;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error','التاسك مش موجود'); END IF;
  RETURN jsonb_build_object('ok', true);
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_tasks_list(p_owner uuid DEFAULT NULL::uuid, p_status text DEFAULT NULL::text, p_specialty text DEFAULT NULL::text, p_limit integer DEFAULT 200)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🗂️ تاسكات الـCRM — للشاشة وللموظف. الترتيب: المفتوح الأول، والعالي الأولوية فوق. */
DECLARE v jsonb;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  SELECT coalesce(jsonb_agg(x),'[]'::jsonb) INTO v FROM (
    SELECT jsonb_build_object(
      'id',t.id,'title',t.title,'detail',t.detail,'status',t.status,'priority',t.priority,
      'specialty',t.specialty,'specialty_ar',sp.name_ar,'due_at',t.due_at,'created_at',t.created_at,
      'owner_id',t.owner_id,'owner',st.full_name,
      'routed_from',rf.full_name,'route_reason',t.route_reason,
      'contact_id',t.contact_id,'contact_phone',c.phone,'contact_name',c.display_name) x
    FROM flow_tasks t
    LEFT JOIN crm_specialties sp ON sp.key=t.specialty
    LEFT JOIN crm_staff() st ON st.profile_id=t.owner_id
    LEFT JOIN crm_staff() rf ON rf.profile_id=t.routed_from
    LEFT JOIN crm_contacts c ON c.id=t.contact_id
    WHERE t.source='crm-call'
      AND (p_owner IS NULL OR t.owner_id=p_owner)
      AND (p_status IS NULL OR t.status=p_status)
      AND (p_specialty IS NULL OR t.specialty=p_specialty)
    ORDER BY (t.status='done'), (t.priority='high') DESC, t.created_at DESC
    LIMIT least(greatest(coalesce(p_limit,200),1),1000)) z;
  RETURN jsonb_build_object('ok', true, 'rows', v);
END $function$
;

CREATE OR REPLACE FUNCTION public.crm_test_rules(p_text text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
/* 🧪 جرّب القواعد قبل ما تحفظها: «الجملة دي هتروح لأنهي تخصص وليه؟»
   بيرجّع كل تخصص طابق، وكام كلمة طابقت، وأنهي كلمات — عشان الظبط يبقى
   بالعين مش بالتخمين. */
DECLARE v jsonb;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  WITH t AS (SELECT crm_norm_ar(p_text) v)
  SELECT jsonb_build_object('ok', true,
    'winner', crm_specialty_for_any(p_text),
    'matches', coalesce((SELECT jsonb_agg(x ORDER BY x->>'first_at') FROM (
        SELECT jsonb_build_object('key', s.key, 'name_ar', s.name_ar,
                 'hits', count(*), 'first_at', lpad(min(position(crm_norm_ar(w) in t.v))::text,5,'0'),
                 'words', jsonb_agg(w)) x
          FROM crm_specialties s, t, unnest(s.match_words) w
         WHERE s.active AND s.key <> 'other' AND position(crm_norm_ar(w) in t.v) > 0
         GROUP BY s.key, s.name_ar) z), '[]'::jsonb)
  ) INTO v FROM t;
  RETURN v;
END $function$
;
