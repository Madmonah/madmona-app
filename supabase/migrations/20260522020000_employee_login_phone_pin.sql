-- =====================================================================
-- Employee login by phone + PIN (2026-05-22).
-- Lets an employee sign into the Madmona app (/login -> /me) using their
-- phone number + the same 4-digit PIN they clock in with — instead of the
-- WhatsApp OTP. Produces the SAME madmona_sessions token as madmona_verify_otp
-- so /me (madmona_employee_summary) works unchanged.
-- NOTE: only works for employees who have a phone on file. PIN-only employees
-- (no phone) still use the branch /clock self-view ("تاسكاتي وحالتي").
-- =====================================================================
CREATE OR REPLACE FUNCTION public.employee_login_phone_pin(p_phone text, p_pin text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER AS $function$
DECLARE v_phone text; v_emp record; v_account_id uuid; v_token uuid;
BEGIN
  v_phone := normalize_phone(p_phone);
  IF v_phone IS NULL OR p_pin IS NULL OR length(trim(p_pin)) < 3 THEN
    RETURN jsonb_build_object('success', false, 'error', 'اكتب رقم تليفونك والـPIN');
  END IF;

  SELECT * INTO v_emp FROM business_employees
  WHERE normalize_phone(phone) = v_phone AND pin_code = trim(p_pin) AND status = 'active'
  LIMIT 1;
  IF v_emp.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'رقم التليفون أو الـPIN غلط');
  END IF;

  SELECT id INTO v_account_id FROM madmona_accounts WHERE phone_normalized = v_phone;
  IF v_account_id IS NULL THEN
    INSERT INTO madmona_accounts (phone_normalized, full_name) VALUES (v_phone, v_emp.full_name)
    RETURNING id INTO v_account_id;
  ELSE
    UPDATE madmona_accounts SET last_login_at = NOW(), full_name = COALESCE(full_name, v_emp.full_name)
    WHERE id = v_account_id;
  END IF;

  INSERT INTO madmona_sessions (account_id) VALUES (v_account_id) RETURNING token INTO v_token;
  RETURN jsonb_build_object('success', true, 'token', v_token::text, 'employee_name', v_emp.full_name);
END; $function$;
GRANT EXECUTE ON FUNCTION public.employee_login_phone_pin(text,text) TO anon, authenticated;
