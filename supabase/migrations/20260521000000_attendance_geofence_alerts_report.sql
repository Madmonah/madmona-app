-- =====================================================================
-- Attendance geofence: out-of-range owner alerts, attempt log,
-- per-movement WhatsApp (employee confirmation + owner notification),
-- and the unified attendance report view.
--
-- This file makes these features PERMANENT (part of the repo migrations)
-- so they survive any future deploy / db reset. Applied to prod 2026-05-21.
-- =====================================================================

-- 1) Log of rejected out-of-range clock attempts -----------------------
CREATE TABLE IF NOT EXISTS public.attendance_geofence_attempts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id   uuid NOT NULL,
  branch_id     uuid,
  branch_code   text,
  employee_id   uuid,
  identifier    text,
  employee_name text,
  distance_m    numeric,
  max_radius_m  numeric,
  lat           numeric,
  lng           numeric,
  accuracy_m    numeric,
  attempted_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_attempts_supplier_time
  ON public.attendance_geofence_attempts (supplier_id, attempted_at DESC);

-- 2) Clock function: geofence + attempt log + owner alert + movement msgs
CREATE OR REPLACE FUNCTION public.employee_clock_via_qr(p_branch_code text, p_phone_or_pin text, p_lat numeric DEFAULT NULL::numeric, p_lng numeric DEFAULT NULL::numeric, p_accuracy_m numeric DEFAULT NULL::numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_branch RECORD;
  v_employee RECORD;
  v_attendance RECORD;
  v_action text;
  v_hours numeric;
  v_distance numeric;
  v_max_radius int;
BEGIN
  SELECT b.id AS branch_id, b.supplier_id, b.name AS branch_name,
         s.business_name, b.latitude, b.longitude,
         COALESCE(b.geofence_radius_meters, 100) AS geofence_radius,
         COALESCE(b.geofence_enabled, true) AS geofence_enabled
  INTO v_branch FROM supplier_branches b
  JOIN suppliers s ON s.id = b.supplier_id
  WHERE b.code = p_branch_code AND b.status = 'active';

  IF v_branch.branch_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'فرع غير موجود');
  END IF;

  IF v_branch.geofence_enabled AND v_branch.latitude IS NOT NULL THEN
    IF p_lat IS NULL OR p_lng IS NULL THEN
      RETURN jsonb_build_object('ok', false, 'error', 'يرجى السماح بمشاركة الموقع — الـ system بـ يتحقق إنك في الفرع', 'reason_code', 'gps_required');
    END IF;
    v_distance := distance_meters(p_lat, p_lng, v_branch.latitude, v_branch.longitude);
    v_max_radius := v_branch.geofence_radius;
    IF p_accuracy_m IS NOT NULL AND p_accuracy_m < 500 THEN
      v_max_radius := v_max_radius + p_accuracy_m::int;
    END IF;
    IF v_distance > v_max_radius THEN
      BEGIN
        DECLARE v_who text; v_emp uuid; v_alerted int;
        BEGIN
          SELECT id, full_name INTO v_emp, v_who FROM business_employees
            WHERE supplier_id = v_branch.supplier_id AND status = 'active'
              AND (pin_code = p_phone_or_pin OR phone = p_phone_or_pin OR phone = '+' || p_phone_or_pin) LIMIT 1;
          INSERT INTO attendance_geofence_attempts
            (supplier_id, branch_id, branch_code, employee_id, identifier, employee_name, distance_m, max_radius_m, lat, lng, accuracy_m)
          VALUES (v_branch.supplier_id, v_branch.branch_id, p_branch_code, v_emp, p_phone_or_pin, v_who,
                  ROUND(v_distance), v_max_radius, p_lat, p_lng, p_accuracy_m);
          SELECT count(*) INTO v_alerted FROM whatsapp_outbound_queue
            WHERE campaign='attendance_out_of_range' AND metadata->>'branch_id'=v_branch.branch_id::text
              AND metadata->>'pin'=p_phone_or_pin AND created_at > now() - interval '15 minutes';
          IF v_alerted = 0 THEN
            INSERT INTO whatsapp_outbound_queue (recipient_phone, recipient_name, message, status, scheduled_at, agent_name, campaign, metadata)
            SELECT normalize_phone(sa.phone), sa.full_name,
                   '⚠️ تنبيه حضور — ' || v_branch.business_name || E'\n' ||
                   COALESCE(v_who,'حد') || ' حاول يسجّل حضور وهو بعيد عن ' || v_branch.branch_name ||
                   ' بـ ' || ROUND(v_distance)::text || ' متر.' || E'\n' ||
                   'الوقت: ' || to_char(now() AT TIME ZONE 'Africa/Cairo','HH24:MI') || E'\n' || 'لو ده مش طبيعي راجع معاه.',
                   'pending', now(), 'attendance_geofence', 'attendance_out_of_range',
                   jsonb_build_object('branch_id',v_branch.branch_id,'branch_code',p_branch_code,'pin',p_phone_or_pin,'distance_m',ROUND(v_distance),'employee_name',v_who)
            FROM supplier_admins sa
            WHERE sa.supplier_id=v_branch.supplier_id AND sa.active=true AND sa.role IN ('owner','manager') AND sa.phone IS NOT NULL;
          END IF;
        END;
      EXCEPTION WHEN OTHERS THEN NULL;
      END;
      RETURN jsonb_build_object('ok', false,
        'error','إنت بعيد عن الفرع بـ '||ROUND(v_distance)::text||' متر · لازم تكون قريب من المكان',
        'reason_code','out_of_range','distance_m',ROUND(v_distance,0),'max_radius_m',v_max_radius,'accuracy_m',p_accuracy_m);
    END IF;
  END IF;

  SELECT * INTO v_employee FROM business_employees
  WHERE supplier_id=v_branch.supplier_id AND status='active'
    AND (pin_code=p_phone_or_pin OR phone=p_phone_or_pin OR phone='+'||p_phone_or_pin) LIMIT 1;
  IF v_employee.id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error','الرقم ده مش مسجل في الفرع');
  END IF;

  SELECT * INTO v_attendance FROM attendance_logs WHERE employee_id=v_employee.id AND date=CURRENT_DATE;
  IF v_attendance.id IS NULL THEN
    INSERT INTO attendance_logs (employee_id, branch_id, date, clock_in_at, status, clock_in_lat, clock_in_lng, clock_in_distance_m, clock_in_method)
    VALUES (v_employee.id, v_branch.branch_id, CURRENT_DATE, now(), 'present', p_lat, p_lng, v_distance, 'qr_geo');
    v_action := 'clock_in'; v_hours := NULL;
  ELSIF v_attendance.clock_out_at IS NULL THEN
    UPDATE attendance_logs SET clock_out_at=now(), clock_out_lat=p_lat, clock_out_lng=p_lng, clock_out_distance_m=v_distance WHERE id=v_attendance.id;
    v_hours := ROUND(EXTRACT(EPOCH FROM (now()-v_attendance.clock_in_at))/3600.0 - (v_attendance.break_minutes/60.0), 2);
    v_action := 'clock_out';
  ELSE
    RETURN jsonb_build_object('ok', false, 'error','حضرتك سجلت دخول وخروج بالفعل النهارده','reason_code','already_done',
      'employee', jsonb_build_object('full_name',v_employee.full_name,'role_ar',v_employee.role_ar,'avatar_initial',v_employee.avatar_initial),
      'clocked_in_at',v_attendance.clock_in_at,'clocked_out_at',v_attendance.clock_out_at);
  END IF;

  -- Per-movement WhatsApp (best-effort, never breaks attendance)
  BEGIN
    DECLARE v_loc text; v_t text;
    BEGIN
      v_t := to_char(now() AT TIME ZONE 'Africa/Cairo','HH24:MI');
      v_loc := CASE WHEN v_distance IS NULL THEN 'مفيش GPS'
                    WHEN v_distance <= 30 THEN 'جوّه ✅'
                    WHEN v_distance <= 100 THEN 'قريب ⚠️ ('||ROUND(v_distance)::text||'م)'
                    ELSE 'بعيد ❌ ('||ROUND(v_distance)::text||'م)' END;
      IF v_employee.phone IS NOT NULL THEN
        INSERT INTO whatsapp_outbound_queue (recipient_phone, recipient_name, message, status, scheduled_at, agent_name, campaign, metadata)
        VALUES (normalize_phone(v_employee.phone), v_employee.full_name,
          CASE WHEN v_action='clock_in'
               THEN '✅ تم تسجيل دخولك'||E'\n'||v_branch.business_name||' — '||v_branch.branch_name||E'\n'||'الساعة '||v_t||E'\n'||'يوم موفّق 🌟'
               ELSE '✅ تم تسجيل خروجك'||E'\n'||v_branch.business_name||' — '||v_branch.branch_name||E'\n'||'الساعة '||v_t||COALESCE(E'\n'||'اشتغلت '||v_hours::text||' ساعة','')||E'\n'||'تسلم 🙏' END,
          'pending', now(), 'attendance_geofence', 'attendance_movement',
          jsonb_build_object('employee_id',v_employee.id,'action',v_action,'to','employee'));
      END IF;
      INSERT INTO whatsapp_outbound_queue (recipient_phone, recipient_name, message, status, scheduled_at, agent_name, campaign, metadata)
      SELECT normalize_phone(sa.phone), sa.full_name,
        CASE WHEN v_action='clock_in'
             THEN '🟢 دخول — '||v_employee.full_name||E'\n'||v_branch.branch_name||' · '||v_t||E'\n'||'الموقع: '||v_loc
             ELSE '🔴 خروج — '||v_employee.full_name||E'\n'||v_branch.branch_name||' · '||v_t||COALESCE(E'\n'||'اشتغل '||v_hours::text||' ساعة','')||E'\n'||'الموقع: '||v_loc END,
        'pending', now(), 'attendance_geofence', 'attendance_movement',
        jsonb_build_object('employee_id',v_employee.id,'action',v_action,'to','owner')
      FROM supplier_admins sa
      WHERE sa.supplier_id=v_branch.supplier_id AND sa.active=true AND sa.role IN ('owner','manager') AND sa.phone IS NOT NULL;
    END;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  RETURN jsonb_build_object('ok', true, 'action', v_action,
    'employee', jsonb_build_object('id',v_employee.id,'full_name',v_employee.full_name,'role_ar',v_employee.role_ar,'avatar_initial',v_employee.avatar_initial,'pin_code',v_employee.pin_code),
    'branch', jsonb_build_object('name',v_branch.branch_name,'business_name',v_branch.business_name),
    'timestamp', now(), 'hours_worked', v_hours,
    'distance_m', CASE WHEN v_distance IS NOT NULL THEN ROUND(v_distance,0) ELSE NULL END);
END; $function$;

-- 3) Unified attendance report view -----------------------------------
DROP VIEW IF EXISTS public.v_attendance_report;
CREATE VIEW public.v_attendance_report AS
SELECT b.supplier_id, al.branch_id, b.name AS branch_name, b.code AS branch_code,
       e.full_name AS employee_name, 'دخول'::text AS event_type,
       al.clock_in_at AS event_at,
       (al.clock_in_at AT TIME ZONE 'Africa/Cairo')::date AS event_date,
       to_char(al.clock_in_at AT TIME ZONE 'Africa/Cairo','HH24:MI') AS event_time,
       ROUND(al.clock_in_distance_m)::int AS distance_m,
       CASE WHEN al.clock_in_distance_m IS NULL THEN 'مش متأكد (مفيش GPS)'
            WHEN al.clock_in_distance_m <= 30 THEN 'جوّه ✅'
            WHEN al.clock_in_distance_m <= 100 THEN 'قريب ⚠️'
            ELSE 'بعيد ❌' END AS location_status,
       (EXTRACT(hour FROM al.clock_in_at AT TIME ZONE 'Africa/Cairo') >= 10
        AND EXTRACT(hour FROM al.clock_in_at AT TIME ZONE 'Africa/Cairo') < 22) AS within_work_hours
FROM attendance_logs al
JOIN supplier_branches b ON b.id = al.branch_id
LEFT JOIN business_employees e ON e.id = al.employee_id
WHERE al.clock_in_at IS NOT NULL
UNION ALL
SELECT b.supplier_id, al.branch_id, b.name, b.code,
       e.full_name, 'خروج', al.clock_out_at,
       (al.clock_out_at AT TIME ZONE 'Africa/Cairo')::date,
       to_char(al.clock_out_at AT TIME ZONE 'Africa/Cairo','HH24:MI'),
       ROUND(al.clock_out_distance_m)::int,
       CASE WHEN al.clock_out_distance_m IS NULL THEN 'مش متأكد (مفيش GPS)'
            WHEN al.clock_out_distance_m <= 30 THEN 'جوّه ✅'
            WHEN al.clock_out_distance_m <= 100 THEN 'قريب ⚠️'
            ELSE 'بعيد ❌' END,
       (EXTRACT(hour FROM al.clock_out_at AT TIME ZONE 'Africa/Cairo') >= 10
        AND EXTRACT(hour FROM al.clock_out_at AT TIME ZONE 'Africa/Cairo') < 22)
FROM attendance_logs al
JOIN supplier_branches b ON b.id = al.branch_id
LEFT JOIN business_employees e ON e.id = al.employee_id
WHERE al.clock_out_at IS NOT NULL
UNION ALL
SELECT ga.supplier_id, ga.branch_id, b.name, ga.branch_code,
       COALESCE(ga.employee_name, ga.identifier), 'محاولة مرفوضة', ga.attempted_at,
       (ga.attempted_at AT TIME ZONE 'Africa/Cairo')::date,
       to_char(ga.attempted_at AT TIME ZONE 'Africa/Cairo','HH24:MI'),
       ROUND(ga.distance_m)::int, 'برّه ❌',
       (EXTRACT(hour FROM ga.attempted_at AT TIME ZONE 'Africa/Cairo') >= 10
        AND EXTRACT(hour FROM ga.attempted_at AT TIME ZONE 'Africa/Cairo') < 22)
FROM attendance_geofence_attempts ga
LEFT JOIN supplier_branches b ON b.id = ga.branch_id;
