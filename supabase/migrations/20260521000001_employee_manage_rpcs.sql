-- =====================================================================
-- Employee management RPCs for the admin "manage team" tab:
--   - admin_list_employees_for_manage(supplier)  -> rows for the table
--   - admin_update_employee_contact(emp, phone, pin) -> edit phone / PIN
--   - admin_move_employee_branch(emp, branch)     -> move between branches
-- Permanent (repo migration). Applied to prod 2026-05-21.
-- =====================================================================

CREATE OR REPLACE FUNCTION public.admin_list_employees_for_manage(p_supplier_id uuid)
RETURNS TABLE(
  employee_id uuid, full_name text, role text, role_ar text,
  branch_id uuid, branch_name text, branch_code text,
  phone text, pin_code text, status text
)
LANGUAGE sql SECURITY DEFINER AS $$
  SELECT e.id, e.full_name, e.role, e.role_ar,
         e.branch_id, b.name, b.code,
         e.phone, e.pin_code, e.status
  FROM business_employees e
  LEFT JOIN supplier_branches b ON b.id = e.branch_id
  WHERE e.supplier_id = p_supplier_id
  ORDER BY b.code NULLS FIRST, e.full_name;
$$;

CREATE OR REPLACE FUNCTION public.admin_update_employee_contact(p_employee_id uuid, p_phone text DEFAULT NULL, p_pin text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sup uuid; v_phone text; v_pin text; v_dup int;
BEGIN
  SELECT supplier_id INTO v_sup FROM business_employees WHERE id = p_employee_id;
  IF v_sup IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الموظف مش موجود'); END IF;

  v_phone := NULLIF(btrim(COALESCE(p_phone,'')), '');
  v_pin   := NULLIF(btrim(COALESCE(p_pin,'')), '');

  IF v_pin IS NOT NULL THEN
    SELECT count(*) INTO v_dup FROM business_employees
      WHERE supplier_id = v_sup AND status='active' AND pin_code = v_pin AND id <> p_employee_id;
    IF v_dup > 0 THEN RETURN jsonb_build_object('ok',false,'error','الـPIN ده مستخدم لموظف تاني في نفس الشركة'); END IF;
  END IF;

  IF v_phone IS NOT NULL THEN
    SELECT count(*) INTO v_dup FROM business_employees
      WHERE supplier_id = v_sup AND phone = v_phone AND id <> p_employee_id;
    IF v_dup > 0 THEN RETURN jsonb_build_object('ok',false,'error','الرقم ده مستخدم لموظف تاني في نفس الشركة'); END IF;
  END IF;

  UPDATE business_employees
     SET phone    = CASE WHEN p_phone IS NULL THEN phone ELSE v_phone END,
         pin_code = CASE WHEN p_pin   IS NULL THEN pin_code ELSE v_pin END
   WHERE id = p_employee_id;

  RETURN jsonb_build_object('ok',true);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok',false,'error','الـPIN مكرر — اختار رقم تاني');
END; $$;

CREATE OR REPLACE FUNCTION public.admin_move_employee_branch(p_employee_id uuid, p_branch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE v_sup uuid; v_bsup uuid;
BEGIN
  SELECT supplier_id INTO v_sup FROM business_employees WHERE id = p_employee_id;
  IF v_sup IS NULL THEN RETURN jsonb_build_object('ok',false,'error','الموظف مش موجود'); END IF;

  IF p_branch_id IS NOT NULL THEN
    SELECT supplier_id INTO v_bsup FROM supplier_branches WHERE id = p_branch_id;
    IF v_bsup IS NULL OR v_bsup <> v_sup THEN
      RETURN jsonb_build_object('ok',false,'error','الفرع مش تابع لنفس الشركة');
    END IF;
  END IF;

  UPDATE business_employees SET branch_id = p_branch_id WHERE id = p_employee_id;
  RETURN jsonb_build_object('ok',true);
END; $$;

GRANT EXECUTE ON FUNCTION public.admin_list_employees_for_manage(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_update_employee_contact(uuid, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.admin_move_employee_branch(uuid, uuid) TO anon, authenticated;
