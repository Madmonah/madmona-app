-- 🚪🚪 (٩/٩/٢٠٢٦) دخول الموظف بالـPIN بيفتح البابين — محمد: «تاب حسابي بيلود على
-- الفاضي… المشكلة لسه قايمة». من معرّف الدخول (رقم/إيميل) → مستخدم Supabase وإيميله،
-- عشان /api/login يطلّع token_hash (magiclink) والواجهة تعمل verifyOtp.
-- service_role بس (بتقرا auth.users). مطبّقة لايف يوم ٩/٩/٢٠٢٦.
create or replace function public.auth_user_for_employee_login(p_identifier text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','pg_catalog'
as $$
declare v_emp record; v_uid uuid; v_email text; v_core text;
begin
  if position('@' in coalesce(p_identifier,'')) > 0 then
    select * into v_emp from business_employees where lower(email)=lower(trim(p_identifier)) and status='active' limit 1;
  else
    select * into v_emp from business_employees where phone_core(phone)=phone_core(p_identifier) and status='active' limit 1;
  end if;
  if v_emp.id is null then return jsonb_build_object('found', false); end if;
  v_core := phone_core(v_emp.phone);
  select u.id, u.email into v_uid, v_email from auth.users u
   where v_core is not null and phone_core(coalesce(u.phone,'')) = v_core limit 1;
  if v_uid is null and v_emp.email is not null then
    select u.id, u.email into v_uid, v_email from auth.users u where lower(u.email)=lower(v_emp.email) limit 1;
  end if;
  if v_uid is null and v_core is not null then
    select u.id, u.email into v_uid, v_email from auth.users u where lower(u.email)= '20'||v_core||'@madmonacairo.com' limit 1;
  end if;
  if v_uid is null then return jsonb_build_object('found', false, 'employee_id', v_emp.id); end if;
  return jsonb_build_object('found', true, 'user_id', v_uid, 'email', v_email, 'employee_id', v_emp.id);
end $$;
revoke all on function public.auth_user_for_employee_login(text) from public, anon, authenticated;
grant execute on function public.auth_user_for_employee_login(text) to service_role;
