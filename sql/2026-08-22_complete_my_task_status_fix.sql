-- =====================================================================
-- 🐞 (٢٢ أغسطس ٢٠٢٦) الباج: تاب «مهامي» — الدوسة على المهمة مابتشيلهاش
-- =====================================================================
-- الأعراض (محمد): «التاب بتاع مهامي لما بدوس عليه في الأبليكيشن مش بتختفي».
--
-- السبب الجذري — كلمتين مختلفتين لنفس المعنى في جدولين:
--
--     daily_tasks.status  CHECK →  pending · in_progress · completed · skipped · overdue
--     flow_tasks.status   CHECK →  pending · in_progress · done
--
--   ودالة complete_my_task() كانت بتكتب 'done' في **الاتنين**.
--   في flow_tasks ماشي. في daily_tasks الكلمة دي مرفوضة من الـCHECK،
--   فالـUPDATE بيرمي استثناء والصف مابيتغيّرش.
--
--   واللي خلّى الباج «صامت»: الواجهة (src/app/account/work/page.tsx)
--   كانت بتنادي الـRPC كده:
--       await supabaseBrowser.rpc('complete_my_task', {...})
--       onDone()
--   من غير ما تبصّ لا على `error` ولا على `data.ok`. يعني الخطأ بيتبلع،
--   والشاشة بتعمل refresh، والمهمة بتفضل مكانها — والمستخدم شايف إن
--   الزرار مش بيعمل حاجة أصلاً.
--
-- الإصلاح (جزءين — الاتنين لازم):
--   (١) الداتابيز — الدالة تحت: كل جدول بكلمته
--         daily_tasks → 'completed'
--         flow_tasks  → 'done'
--       وكمان بترجّع `already:true` لو الصف كان مقفول أصلاً بدل ما
--       ترجّع ok:true على الفاضي.
--   (٢) الواجهة — بقت تقرا `error` و`data.ok` وتوريهم للمستخدم في سطر
--       أحمر تحت المهمة بدل ما تبلعهم في console.error.
--
-- 🔎 وصفة اصطياد الباج ده لو رجع في أي شاشة تانية:
--   أي RPC بترجّع jsonb فيه {ok:false,error} — الواجهة **لازم** تقرا
--   الاتنين. مجرد `await rpc(...)` من غير فحص = فشل صامت.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.complete_my_task(p_task_id uuid, p_source text DEFAULT 'daily'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE uid uuid := auth.uid(); v_ok boolean; v_name text; v_rows int;
BEGIN
  IF uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'مش مسجّل دخول'); END IF;

  IF coalesce(p_source,'daily') = 'daily' THEN
    SELECT EXISTS (SELECT 1 FROM daily_tasks d JOIN business_employees e ON e.id = d.employee_id
                    WHERE d.id = p_task_id AND e.auth_user_id = uid) INTO v_ok;
    IF NOT v_ok THEN RETURN jsonb_build_object('ok', false, 'error', 'المهمة دي مش بتاعتك'); END IF;

    -- ⚠️ 'completed' مش 'done' — ده اللي الـCHECK بتاع daily_tasks بيقبله.
    UPDATE daily_tasks SET status='completed', completed_at=now(),
           completed_by=(SELECT e.id FROM business_employees e WHERE e.auth_user_id = uid
                          AND e.id = daily_tasks.employee_id)
     WHERE id = p_task_id AND status <> 'completed';
    GET DIAGNOSTICS v_rows = ROW_COUNT;
    IF v_rows = 0 THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
    RETURN jsonb_build_object('ok', true);
  END IF;

  SELECT full_name INTO v_name FROM profiles WHERE id = uid;
  SELECT EXISTS (
    SELECT 1 FROM flow_tasks f WHERE f.id = p_task_id
     AND (public.current_user_platform_admin_role() IN ('owner','admin')
          OR (v_name IS NOT NULL AND f.assignee_name = v_name)
          OR f.supplier_id IN (
               SELECT e.supplier_id FROM business_employees e
                WHERE e.auth_user_id = uid AND e.employee_type='human' AND e.status='active'
               UNION SELECT ms.id FROM marketplace_suppliers ms WHERE ms.profile_id = uid
               UNION SELECT s.id FROM suppliers s WHERE s.auth_user_id = uid))) INTO v_ok;
  IF NOT v_ok THEN RETURN jsonb_build_object('ok', false, 'error', 'مالكش صلاحية على المهمة دي'); END IF;

  -- flow_tasks بتستعمل 'done' — دي صح زي ما هي.
  UPDATE flow_tasks SET status='done', completed_at=now(), updated_at=now()
   WHERE id = p_task_id AND status <> 'done';
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows = 0 THEN RETURN jsonb_build_object('ok', true, 'already', true); END IF;
  RETURN jsonb_build_object('ok', true);
END $function$;
