-- =====================================================================
-- 🧑‍💼 (٢٣ أغسطس ٢٠٢٦ — محمد: «لوحة الاستف خليها تاخد البيانات من
--    الموظفين وتعمل الحسابات»)
--    migration: madmona_staff_accounts_from_employees_2026_08_23
--
--    قبل كده /admin/staff كانت **بتتفرّج** بس — بتقول «مفيش حساب» و«مفيش
--    رقم» ومحدش يقدر يعمل حاجة من نفس الشاشة.
--
--    ⚠️ اللي اكتشفناه وإحنا بنعمل ده: ٧ من ٩ عندهم حساب فعلاً **بس من غير
--    باسورد** — الحساب موجود والدخول مقفول. الشاشة كانت بتقول
--    «الأبليكيشن ✓» وهي كده مش دقيقة.
--
--    الباسورد: **جدول الموظفين هو المصدر الوحيد** (bcrypt في password_hash)
--    زي ما هو متكتوب في provision_employee_auth_account — مابنولّدش باسورد
--    ومابنخزّنش plaintext في أي مكان.
--
--    ⚠️ الدوال التلاتة الجداد لازم يكونوا في ALLOWED بتاع
--       src/app/api/admin/rpc/route.ts وإلا هترجع «عملية غير مسموحة».
-- =====================================================================

-- ١) الفريق + حالة الحساب الحقيقية (زودنا has_password و login_email)
CREATE OR REPLACE FUNCTION public.madmona_team_accounts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE v jsonb;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;
  SELECT jsonb_build_object('ok', true,
    'team', coalesce(jsonb_agg(x ORDER BY x->>'full_name'), '[]'::jsonb),
    'counts', jsonb_build_object('team', count(*),
      'with_app',  count(*) FILTER (WHERE (x->>'has_app')::boolean),
      'with_admin',count(*) FILTER (WHERE (x->>'has_admin')::boolean),
      -- 🔑 اللي يقدر **فعلاً** يدخل = عنده حساب + عنده باسورد
      'can_login', count(*) FILTER (WHERE (x->>'has_app')::boolean AND (x->>'has_password')::boolean),
      'no_phone',  count(*) FILTER (WHERE coalesce(x->>'phone','') = '' AND coalesce(x->>'email','') = ''))
  ) INTO v FROM (
    SELECT jsonb_build_object(
      'employee_id', e.id, 'full_name', e.full_name,
      'role_ar', CASE e.role WHEN 'owner' THEN 'مالك' WHEN 'manager' THEN 'مدير' ELSE 'موظف' END,
      'phone', e.phone,
      'email', e.email,
      'has_app', e.auth_user_id IS NOT NULL,
      'has_password', coalesce(e.password_hash,'') <> '',
      -- إيميل الدخول: الحقيقي، وإلا المشتق من الرقم (نفس اتفاقية phoneToEmail)
      'login_email', coalesce(
        nullif(lower(btrim(coalesce(e.email,''))), ''),
        CASE WHEN length(regexp_replace(coalesce(e.phone,''), '\D', '', 'g')) >= 10
             THEN '20' || right(regexp_replace(e.phone, '\D', '', 'g'), 10) || '@madmonacairo.com' END),
      'has_admin', pa.id IS NOT NULL,
      'admin_role', pa.role, 'admin_status', pa.status, 'last_admin_login', pa.last_login_at,
      'specialties', (SELECT coalesce(jsonb_agg(s.name_ar), '[]'::jsonb)
                        FROM crm_staff_specialties ss JOIN crm_specialties s ON s.key = ss.specialty
                       WHERE ss.profile_id = e.auth_user_id AND ss.active),
      'crm_contacts', (SELECT count(*) FROM crm_contacts c WHERE c.owner_id = e.auth_user_id),
      'open_tasks', (SELECT count(*) FROM flow_tasks t WHERE t.owner_id = e.auth_user_id AND t.status <> 'done'),
      'missing', (SELECT coalesce(jsonb_agg(m), '[]'::jsonb) FROM (
          SELECT 'حساب على الأبليكيشن' m WHERE e.auth_user_id IS NULL
          UNION ALL SELECT 'باسورد للدخول' WHERE coalesce(e.password_hash,'') = ''
          UNION ALL SELECT 'دخول لوحة الأدمن' WHERE pa.id IS NULL
          UNION ALL SELECT 'رقم تليفون' WHERE coalesce(e.phone,'') = ''
          UNION ALL SELECT 'تخصص في الـCRM'
            WHERE e.auth_user_id IS NOT NULL
              AND NOT EXISTS (SELECT 1 FROM crm_staff_specialties ss
                               WHERE ss.profile_id = e.auth_user_id AND ss.active)
        ) q)) x
    FROM business_employees e
    JOIN suppliers s ON s.id = e.supplier_id
    LEFT JOIN platform_admins pa
      ON regexp_replace(coalesce(pa.phone,''), '\D', '', 'g') = regexp_replace(coalesce(e.phone,''), '\D', '', 'g')
     AND coalesce(e.phone,'') <> ''
   WHERE coalesce(s.is_platform_owner, false)
     AND e.employee_type = 'human' AND e.status = 'active') z;
  RETURN v;
END $$;

-- ٢) «اعمل الحسابات» — بتمشي على كل موظفي مضمونة وتعمل اللي ناقص
CREATE OR REPLACE FUNCTION public.madmona_sync_staff_accounts()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
/* بتنادي provision_employee_auth_account لكل موظف — الدالة دي idempotent
   (لو الحساب موجود بترجّع created=false ومابتعملش حاجة). النتيجة بترجع
   **لكل موظف على حدة** عشان مايحصلش اللي حصل قبل كده: الخطأ يتبلع
   والشاشة تقول «تمام» وهي مش تمام. */
DECLARE
  r        record;
  res      jsonb;
  out_rows jsonb := '[]'::jsonb;
  n_created int := 0;
  n_exists  int := 0;
  n_failed  int := 0;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  FOR r IN
    SELECT e.id, e.full_name, e.phone, e.email, coalesce(e.password_hash,'') <> '' AS has_pw
      FROM business_employees e
      JOIN suppliers s ON s.id = e.supplier_id
     WHERE coalesce(s.is_platform_owner, false)
       AND e.employee_type = 'human' AND e.status = 'active'
     ORDER BY e.full_name
  LOOP
    BEGIN
      res := public.provision_employee_auth_account(r.id);
    EXCEPTION WHEN OTHERS THEN
      res := jsonb_build_object('ok', false, 'reason', 'exception', 'detail', SQLERRM);
    END;

    IF coalesce((res->>'ok')::boolean, false) THEN
      IF coalesce((res->>'created')::boolean, false) THEN n_created := n_created + 1;
      ELSE n_exists := n_exists + 1; END IF;
    ELSE
      n_failed := n_failed + 1;
    END IF;

    out_rows := out_rows || jsonb_build_object(
      'employee_id', r.id,
      'full_name',   r.full_name,
      'ok',          coalesce((res->>'ok')::boolean, false),
      'created',     coalesce((res->>'created')::boolean, false),
      'reason',      res->>'reason',
      'detail',      res->>'detail',
      'login_email', res->>'login_email',
      'has_password',r.has_pw);
  END LOOP;

  RETURN jsonb_build_object('ok', true, 'rows', out_rows,
    'counts', jsonb_build_object('created', n_created, 'existed', n_exists, 'failed', n_failed));
END $$;

-- ٣) حطّ رقم/إيميل لموظف من نفس الشاشة → الحساب بيتعمل على طول
CREATE OR REPLACE FUNCTION public.madmona_staff_set_contact(
  p_employee_id uuid, p_phone text DEFAULT NULL, p_email text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth AS $$
DECLARE
  v_sup   uuid;
  v_owner boolean;
  v_phone text;
  v_email text;
  v_dup   int;
  res     jsonb;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  SELECT e.supplier_id, coalesce(s.is_platform_owner,false)
    INTO v_sup, v_owner
    FROM business_employees e JOIN suppliers s ON s.id = e.supplier_id
   WHERE e.id = p_employee_id;
  IF v_sup IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الموظف مش موجود'); END IF;
  -- 🚧 الشاشة دي لمضمونة بس — موظفين الـB2B حساباتهم قرار صاحب البيزنس
  IF NOT v_owner THEN RETURN jsonb_build_object('ok',false,'error','الموظف ده مش من مضمونة'); END IF;

  v_phone := nullif(regexp_replace(coalesce(p_phone,''), '\D', '', 'g'), '');
  v_email := nullif(lower(btrim(coalesce(p_email,''))), '');

  IF v_phone IS NOT NULL THEN
    -- بنقبل 01xxxxxxxxx أو 201xxxxxxxxx وبنخزّن الشكل المحلي
    IF v_phone ~ '^201[0-9]{9}$' THEN v_phone := right(v_phone, 11); END IF;
    IF v_phone !~ '^01[0-9]{9}$' THEN
      RETURN jsonb_build_object('ok',false,'error','الرقم لازم يكون ١١ رقم ويبدأ بـ01');
    END IF;
    SELECT count(*) INTO v_dup FROM business_employees
     WHERE regexp_replace(coalesce(phone,''), '\D','','g') LIKE '%' || right(v_phone,10)
       AND id <> p_employee_id;
    IF v_dup > 0 THEN
      RETURN jsonb_build_object('ok',false,'error','الرقم ده متسجّل لموظف تاني');
    END IF;
  END IF;

  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RETURN jsonb_build_object('ok',false,'error','الإيميل مش مظبوط');
  END IF;

  IF v_phone IS NULL AND v_email IS NULL THEN
    RETURN jsonb_build_object('ok',false,'error','اكتب رقم أو إيميل');
  END IF;

  UPDATE business_employees
     SET phone      = coalesce(v_phone, phone),
         email      = coalesce(v_email, email),
         updated_at = now()
   WHERE id = p_employee_id;

  -- التريجر بيعمل الحساب لوحده، بس بنناديها صريح عشان نرجّع النتيجة للشاشة
  res := public.provision_employee_auth_account(p_employee_id);
  RETURN jsonb_build_object('ok', true, 'provision', res);
END $$;

-- ٤) حطّ باسورد للموظف (bcrypt في جدول الموظفين — المصدر الوحيد)
CREATE OR REPLACE FUNCTION public.madmona_staff_set_password(
  p_employee_id uuid, p_password text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions AS $$
/* ⚠️ مش نفس employee_set_password: دي بتطلب إيميل حقيقي، وموظفين مضمونة
   أغلبهم بيدخلوا بإيميل مشتق من الرقم — فكانت بترفض. */
DECLARE
  e   record;
  res jsonb;
BEGIN
  IF NOT (public.is_madmona_staff() OR public.is_admin_or_service()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden'); END IF;

  IF p_password IS NULL OR length(p_password) < 8 THEN
    RETURN jsonb_build_object('ok',false,'error','الباسورد لازم ٨ حروف/أرقام على الأقل');
  END IF;

  SELECT be.*, coalesce(s.is_platform_owner,false) AS is_owner
    INTO e FROM business_employees be JOIN suppliers s ON s.id = be.supplier_id
   WHERE be.id = p_employee_id;
  IF NOT FOUND THEN RETURN jsonb_build_object('ok',false,'error','الموظف مش موجود'); END IF;
  IF NOT e.is_owner THEN RETURN jsonb_build_object('ok',false,'error','الموظف ده مش من مضمونة'); END IF;

  IF coalesce(e.phone,'') = '' AND coalesce(e.email,'') = '' THEN
    RETURN jsonb_build_object('ok',false,'error','حطّ رقمه الأول — من غير رقم مفيش حساب أصلاً');
  END IF;

  UPDATE business_employees
     SET password_hash = crypt(p_password, gen_salt('bf')), updated_at = now()
   WHERE id = p_employee_id;

  -- بتنسخ الهاش لـauth.users كمان
  res := public.provision_employee_auth_account(p_employee_id);
  RETURN jsonb_build_object('ok', true, 'provision', res);
END $$;

GRANT EXECUTE ON FUNCTION public.madmona_sync_staff_accounts()                       TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.madmona_staff_set_contact(uuid, text, text)         TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.madmona_staff_set_password(uuid, text)              TO authenticated, service_role;
