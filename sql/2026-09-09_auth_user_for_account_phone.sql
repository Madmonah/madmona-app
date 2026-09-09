-- 🚪🚪 (٩/٩/٢٠٢٦) ترقية جلسة التوكن لجلسة Supabase — محمد: «حساب محمد على مضمونة
-- مش ظاهر بالشكل الصح ولا تاب شغلي… مش عارف بيسجل دخول إزاي». تليفونه ماسك
-- madmona_token صالح (باب واحد) وauth.users.last_sign_in_at من ٢٩/٧ — الباب التاني
-- عمره ما اتفتح. بدل «اعمل خروج وادخل»: /api/auth/upgrade بياخد التوكن → الرقم →
-- مستخدم Supabase بنفس الرقم (موظف الأول، وإلا أي حساب بنفس الرقم) → magiclink.
-- service_role بس. مطبّقة لايف يوم ٩/٩/٢٠٢٦ (migration: auth_user_for_account_phone).
create or replace function public.auth_user_for_account_phone(p_phone text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','pg_catalog'
as $$
declare v_core text; v_uid uuid; v_email text; v_emp jsonb;
begin
  v_core := phone_core(p_phone);
  if v_core is null or v_core = '' then return jsonb_build_object('found', false); end if;
  v_emp := public.auth_user_for_employee_login(p_phone);
  if coalesce((v_emp->>'found')::boolean, false) then return v_emp || jsonb_build_object('via','employee'); end if;
  select u.id, u.email into v_uid, v_email from auth.users u where phone_core(coalesce(u.phone,'')) = v_core limit 1;
  if v_uid is null then
    select u.id, u.email into v_uid, v_email from auth.users u where lower(u.email) = '20'||v_core||'@madmonacairo.com' limit 1;
  end if;
  if v_uid is null then
    select u.id, u.email into v_uid, v_email from profiles p join auth.users u on u.id = p.id
     where phone_core(coalesce(p.phone,'')) = v_core limit 1;
  end if;
  if v_uid is null or v_email is null then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'user_id', v_uid, 'email', v_email, 'via', 'phone');
end $$;
revoke all on function public.auth_user_for_account_phone(text) from public, anon, authenticated;
grant execute on function public.auth_user_for_account_phone(text) to service_role;
