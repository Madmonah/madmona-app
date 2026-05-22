-- =====================================================================
-- Employee tasks + self-view (2026-05-22). LIVE-aligned, idempotent.
-- (1) daily_tasks.source_booking_id + booking->task trigger (Source #2).
-- (2) PIN-based employee self-view + task completion (works for all
--     employees, no phone needed).
-- (3) madmona_employee_summary updated for multi-session presence.
-- AI task generation (Source #3) lives in the Next.js route
-- /api/agents/generate-tasks (deployed via Vercel), not in the DB.
-- =====================================================================

-- (1) Booking -> task --------------------------------------------------
ALTER TABLE public.daily_tasks ADD COLUMN IF NOT EXISTS source_booking_id uuid;
CREATE UNIQUE INDEX IF NOT EXISTS uniq_daily_task_per_booking
  ON public.daily_tasks(source_booking_id) WHERE source_booking_id IS NOT NULL;

CREATE OR REPLACE FUNCTION public.trg_create_task_from_booking()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $function$
BEGIN
  BEGIN
    IF NEW.assigned_employee_id IS NULL OR NEW.scheduled_at IS NULL
       OR NEW.status IN ('cancelled','no_show') THEN
      DELETE FROM daily_tasks WHERE source_booking_id = NEW.id;
      RETURN NEW;
    END IF;
    INSERT INTO daily_tasks (employee_id, branch_id, task_date, title_ar, description,
                             priority, due_time, is_auto_generated, source_booking_id, status)
    VALUES (
      NEW.assigned_employee_id, NEW.branch_id,
      (NEW.scheduled_at AT TIME ZONE 'Africa/Cairo')::date,
      'حجز ' || to_char(NEW.scheduled_at AT TIME ZONE 'Africa/Cairo','HH24:MI') || ' — ' || COALESCE(NEW.customer_name,'عميل'),
      COALESCE(NEW.service_name_snapshot,'خدمة'),
      'high', (NEW.scheduled_at AT TIME ZONE 'Africa/Cairo')::time, true, NEW.id, 'pending'
    )
    ON CONFLICT (source_booking_id) WHERE source_booking_id IS NOT NULL DO UPDATE SET
      employee_id = EXCLUDED.employee_id, branch_id = EXCLUDED.branch_id,
      task_date = EXCLUDED.task_date, title_ar = EXCLUDED.title_ar,
      description = EXCLUDED.description, due_time = EXCLUDED.due_time;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  RETURN NEW;
END; $function$;

DROP TRIGGER IF EXISTS trg_booking_to_task ON public.branch_bookings;
CREATE TRIGGER trg_booking_to_task
  AFTER INSERT OR UPDATE OF assigned_employee_id, scheduled_at, status, customer_name, branch_id, service_name_snapshot
  ON public.branch_bookings
  FOR EACH ROW EXECUTE FUNCTION public.trg_create_task_from_booking();

-- (2) PIN-based employee self-view + task completion -------------------
CREATE OR REPLACE FUNCTION public.employee_self_view_by_pin(p_branch_code text, p_phone_or_pin text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_branch record; v_emp record; v_att record; v_tasks jsonb;
BEGIN
  SELECT b.id AS branch_id, b.supplier_id, b.name AS branch_name, s.business_name
  INTO v_branch FROM supplier_branches b JOIN suppliers s ON s.id=b.supplier_id
  WHERE b.code=p_branch_code AND b.status='active';
  IF v_branch.branch_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','فرع غير موجود'); END IF;

  SELECT * INTO v_emp FROM business_employees
  WHERE supplier_id=v_branch.supplier_id AND status='active'
    AND (pin_code=p_phone_or_pin OR phone=p_phone_or_pin OR phone='+'||p_phone_or_pin) LIMIT 1;
  IF v_emp.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الرقم ده مش مسجل في الفرع'); END IF;

  SELECT count(*) AS sessions, bool_or(clock_out_at IS NULL) AS any_open,
    max(clock_in_at) FILTER (WHERE clock_out_at IS NULL) AS open_in,
    (array_agg(clock_in_at ORDER BY clock_in_at DESC))[1] AS last_in,
    max(clock_out_at) AS last_out, COALESCE(sum(hours_worked),0) AS total_hours
  INTO v_att FROM attendance_logs WHERE employee_id=v_emp.id AND date=CURRENT_DATE;

  SELECT jsonb_agg(jsonb_build_object('id',t.id::text,'title',t.title_ar,'description',t.description,
    'priority',t.priority,'status',t.status,'due_time',t.due_time)
    ORDER BY (t.status='completed'), t.priority DESC, t.created_at)
  INTO v_tasks FROM daily_tasks t WHERE t.employee_id=v_emp.id AND t.task_date=CURRENT_DATE;

  RETURN jsonb_build_object('ok',true,
    'employee', jsonb_build_object('id',v_emp.id::text,'full_name',v_emp.full_name,'role_ar',v_emp.role_ar,'avatar_initial',v_emp.avatar_initial),
    'branch', jsonb_build_object('name',v_branch.branch_name,'business_name',v_branch.business_name),
    'attendance', CASE WHEN COALESCE(v_att.sessions,0)=0 THEN NULL ELSE jsonb_build_object(
      'present',v_att.any_open,'status',CASE WHEN v_att.any_open THEN 'in' ELSE 'out' END,
      'clock_in_at',CASE WHEN v_att.any_open THEN v_att.open_in ELSE v_att.last_in END,
      'clock_out_at',CASE WHEN v_att.any_open THEN NULL ELSE v_att.last_out END,
      'hours_worked',v_att.total_hours,'sessions',v_att.sessions) END,
    'tasks', COALESCE(v_tasks,'[]'::jsonb));
END; $function$;
GRANT EXECUTE ON FUNCTION public.employee_self_view_by_pin(text,text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.employee_complete_task_by_pin(p_branch_code text, p_phone_or_pin text, p_task_id uuid, p_status text DEFAULT 'completed')
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_branch record; v_emp record; v_ok int;
BEGIN
  SELECT b.id AS branch_id, b.supplier_id INTO v_branch FROM supplier_branches b WHERE b.code=p_branch_code AND b.status='active';
  IF v_branch.branch_id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','فرع غير موجود'); END IF;
  SELECT * INTO v_emp FROM business_employees WHERE supplier_id=v_branch.supplier_id AND status='active'
    AND (pin_code=p_phone_or_pin OR phone=p_phone_or_pin OR phone='+'||p_phone_or_pin) LIMIT 1;
  IF v_emp.id IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الرقم مش مسجل'); END IF;
  UPDATE daily_tasks SET status=p_status,
    completed_at = CASE WHEN p_status='completed' THEN now() ELSE NULL END,
    completed_by = CASE WHEN p_status='completed' THEN v_emp.id ELSE NULL END
  WHERE id=p_task_id AND employee_id=v_emp.id AND task_date=CURRENT_DATE;
  GET DIAGNOSTICS v_ok = ROW_COUNT;
  IF v_ok=0 THEN RETURN jsonb_build_object('ok',false,'error','التاسك دي مش بتاعتك'); END IF;
  RETURN jsonb_build_object('ok',true,'task_id',p_task_id::text,'status',p_status);
END; $function$;
GRANT EXECUTE ON FUNCTION public.employee_complete_task_by_pin(text,text,uuid,text) TO anon, authenticated;

-- (3) madmona_employee_summary — multi-session presence ----------------
CREATE OR REPLACE FUNCTION public.madmona_employee_summary(p_token uuid)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_phone text; v_emp record; v_today jsonb; v_comm_month numeric; v_comm_unpaid numeric;
        v_att record; v_tasks jsonb; v_tips_recent jsonb; v_tips_month numeric; v_tips_pending int; v_branch record;
BEGIN
  SELECT a.phone_normalized INTO v_phone FROM madmona_sessions s
  JOIN madmona_accounts a ON a.id = s.account_id
  WHERE s.token = p_token AND s.expires_at > NOW();
  IF v_phone IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'انتهت الجلسة'); END IF;

  SELECT e.* INTO v_emp FROM business_employees e
  WHERE normalize_phone(e.phone) = v_phone AND e.status = 'active' LIMIT 1;
  IF v_emp.id IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'مش موظف'); END IF;

  SELECT name, code, latitude, longitude, COALESCE(geofence_radius_meters,100) AS radius,
         COALESCE(geofence_enabled,true) AS geo_on
  INTO v_branch FROM supplier_branches WHERE id = v_emp.branch_id;

  SELECT jsonb_agg(jsonb_build_object(
    'booking_id', b.id::text, 'time', to_char(b.scheduled_at, 'HH24:MI'),
    'customer', b.customer_name, 'service', COALESCE(sc.name_ar, b.service_name_snapshot, 'خدمة'),
    'extra_services', COALESCE(b.extra_services, '[]'::jsonb), 'products', COALESCE(b.products, '[]'::jsonb),
    'products_total', COALESCE(b.products_total_egp, 0), 'prep_checklist', COALESCE(b.prep_checklist, '{}'::jsonb),
    'status', b.status, 'duration', b.duration_minutes, 'price', b.price_egp, 'notes', b.notes
  ) ORDER BY b.scheduled_at)
  INTO v_today FROM branch_bookings b
  LEFT JOIN services_catalog sc ON sc.id = b.service_id
  WHERE b.assigned_employee_id = v_emp.id AND b.scheduled_at::date = CURRENT_DATE
    AND b.status NOT IN ('cancelled','no_show');

  -- MULTI-SESSION aware presence
  SELECT count(*) AS sessions, bool_or(clock_out_at IS NULL) AS any_open,
    max(clock_in_at) FILTER (WHERE clock_out_at IS NULL) AS open_in,
    (array_agg(clock_in_at ORDER BY clock_in_at DESC))[1] AS last_in,
    max(clock_out_at) AS last_out, COALESCE(sum(hours_worked),0) AS total_hours
  INTO v_att FROM attendance_logs WHERE employee_id = v_emp.id AND date = CURRENT_DATE;

  SELECT jsonb_agg(jsonb_build_object(
    'id', t.id::text, 'title', t.title_ar, 'description', t.description,
    'priority', t.priority, 'status', t.status, 'due_time', t.due_time
  ) ORDER BY (t.status='completed'), t.priority DESC, t.created_at)
  INTO v_tasks FROM daily_tasks t
  WHERE t.employee_id = v_emp.id AND t.task_date = CURRENT_DATE;

  SELECT COALESCE(SUM(amount_egp),0) INTO v_tips_month FROM tips
  WHERE recipient_employee_id = v_emp.id AND COALESCE(status,'pending')='received'
    AND received_at >= date_trunc('month', CURRENT_DATE);
  SELECT COUNT(*) INTO v_tips_pending FROM tips
  WHERE recipient_employee_id = v_emp.id AND COALESCE(status,'pending')='pending';
  SELECT jsonb_agg(x) INTO v_tips_recent FROM (
    SELECT jsonb_build_object('amount', amount_egp, 'status', COALESCE(status,'pending'),
      'customer', customer_name, 'method', payment_method, 'at', received_at) AS x
    FROM tips WHERE recipient_employee_id = v_emp.id ORDER BY received_at DESC LIMIT 10
  ) q;

  SELECT COALESCE(SUM(commission_amount),0) INTO v_comm_month FROM commissions_log
  WHERE employee_id = v_emp.id AND earned_at >= date_trunc('month', CURRENT_DATE);
  SELECT COALESCE(SUM(commission_amount),0) INTO v_comm_unpaid FROM commissions_log
  WHERE employee_id = v_emp.id AND paid_at IS NULL;

  RETURN jsonb_build_object('ok', true,
    'employee_id', v_emp.id::text, 'employee_name', v_emp.full_name, 'role_ar', v_emp.role_ar,
    'branch_id', v_emp.branch_id::text, 'branch_code', v_branch.code,
    'branch', jsonb_build_object('name', v_branch.name, 'code', v_branch.code,
      'lat', v_branch.latitude, 'lng', v_branch.longitude, 'radius', v_branch.radius, 'geofence_enabled', v_branch.geo_on),
    'attendance', CASE WHEN COALESCE(v_att.sessions,0) = 0 THEN NULL ELSE jsonb_build_object(
      'present', v_att.any_open, 'status', CASE WHEN v_att.any_open THEN 'in' ELSE 'out' END,
      'clock_in_at', CASE WHEN v_att.any_open THEN v_att.open_in ELSE v_att.last_in END,
      'clock_out_at', CASE WHEN v_att.any_open THEN NULL ELSE v_att.last_out END,
      'hours_worked', v_att.total_hours, 'sessions', v_att.sessions) END,
    'today', COALESCE(v_today, '[]'::jsonb), 'tasks', COALESCE(v_tasks, '[]'::jsonb),
    'tips', jsonb_build_object('month_total', v_tips_month, 'pending_count', v_tips_pending, 'recent', COALESCE(v_tips_recent, '[]'::jsonb)),
    'commission_this_month', v_comm_month, 'commission_unpaid', v_comm_unpaid);
END; $function$;
