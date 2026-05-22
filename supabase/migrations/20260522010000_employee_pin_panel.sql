-- =====================================================================
-- Employee self-panel via PIN (works for ALL employees, incl. PIN-only
-- ones with no phone/account). Powers the /clock kiosk: after entering
-- PIN the employee sees their presence (in/out) + today's tasks, and can
-- tick tasks done. View-only panel has NO side effects (does not clock).
-- Permanent (repo migration). Applied to prod 2026-05-22.
-- =====================================================================

-- Panel: presence + today's tasks for the employee behind this PIN ----
CREATE OR REPLACE FUNCTION public.employee_panel_by_pin(p_branch_code text, p_pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_sup uuid; v_emp RECORD;
  v_open_in timestamptz; v_cnt int; v_first_in timestamptz; v_last_out timestamptz; v_hours numeric;
  v_state text; v_tasks jsonb; v_done int; v_total int;
BEGIN
  SELECT supplier_id INTO v_sup FROM supplier_branches WHERE code=p_branch_code AND status='active';
  IF v_sup IS NULL THEN RETURN jsonb_build_object('ok',false,'error','فرع غير موجود'); END IF;

  SELECT * INTO v_emp FROM business_employees
    WHERE supplier_id=v_sup AND status='active'
      AND (pin_code=p_pin OR phone=p_pin OR phone='+'||p_pin) LIMIT 1;
  IF v_emp.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الكود/الرقم مش مسجل'); END IF;

  SELECT clock_in_at INTO v_open_in FROM attendance_logs
    WHERE employee_id=v_emp.id AND date=CURRENT_DATE AND clock_out_at IS NULL
    ORDER BY clock_in_at DESC LIMIT 1;
  SELECT count(*), min(clock_in_at), max(clock_out_at), COALESCE(sum(hours_worked),0)
    INTO v_cnt, v_first_in, v_last_out, v_hours
    FROM attendance_logs WHERE employee_id=v_emp.id AND date=CURRENT_DATE;

  v_state := CASE WHEN v_open_in IS NOT NULL THEN 'in' WHEN v_cnt>0 THEN 'out' ELSE 'none' END;

  SELECT jsonb_agg(jsonb_build_object(
           'id', t.id::text, 'title', t.title_ar, 'description', t.description,
           'priority', t.priority, 'status', t.status,
           'due_time', to_char(t.due_time,'HH24:MI')
         ) ORDER BY (t.status='completed'), (t.priority='high') DESC, t.due_time NULLS LAST, t.created_at),
         count(*), count(*) FILTER (WHERE t.status='completed')
    INTO v_tasks, v_total, v_done
    FROM daily_tasks t
    WHERE t.employee_id=v_emp.id AND t.task_date=CURRENT_DATE;

  RETURN jsonb_build_object(
    'ok', true,
    'employee', jsonb_build_object('id',v_emp.id,'full_name',v_emp.full_name,'role_ar',v_emp.role_ar,'avatar_initial',v_emp.avatar_initial),
    'presence', jsonb_build_object(
      'state', v_state,
      'since', v_open_in,
      'first_in', v_first_in,
      'last_out', v_last_out,
      'sessions', COALESCE(v_cnt,0),
      'hours_today', v_hours),
    'tasks', COALESCE(v_tasks,'[]'::jsonb),
    'tasks_done', COALESCE(v_done,0),
    'tasks_total', COALESCE(v_total,0));
END; $function$;

-- Toggle a task done/undone for the employee behind this PIN ----------
CREATE OR REPLACE FUNCTION public.employee_toggle_task_by_pin(p_branch_code text, p_pin text, p_task_id uuid, p_status text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE v_sup uuid; v_emp uuid; v_new text;
BEGIN
  IF p_status NOT IN ('completed','pending') THEN
    RETURN jsonb_build_object('ok',false,'error','حالة غير صحيحة'); END IF;
  SELECT supplier_id INTO v_sup FROM supplier_branches WHERE code=p_branch_code AND status='active';
  IF v_sup IS NULL THEN RETURN jsonb_build_object('ok',false,'error','فرع غير موجود'); END IF;
  SELECT id INTO v_emp FROM business_employees
    WHERE supplier_id=v_sup AND status='active'
      AND (pin_code=p_pin OR phone=p_pin OR phone='+'||p_pin) LIMIT 1;
  IF v_emp IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الكود/الرقم مش مسجل'); END IF;

  -- NOTE: daily_tasks.completed_by FKs to auth users, not business_employees,
  -- so we do not write it here (employees are PIN-based, not auth users).
  UPDATE daily_tasks
     SET status = p_status,
         completed_at = CASE WHEN p_status='completed' THEN now() ELSE NULL END
   WHERE id = p_task_id AND employee_id = v_emp
  RETURNING status INTO v_new;

  IF v_new IS NULL THEN RETURN jsonb_build_object('ok',false,'error','التاسك مش بتاعك'); END IF;
  RETURN jsonb_build_object('ok',true,'status',v_new);
END; $function$;

GRANT EXECUTE ON FUNCTION public.employee_panel_by_pin(text,text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.employee_toggle_task_by_pin(text,text,uuid,text) TO anon, authenticated;
