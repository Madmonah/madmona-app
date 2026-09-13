-- 🔑 (١٤/٩/٢٠٢٦) محمد: «تسجيل دخول الاكونت بتاع ستارت بيزنس مش شغال — عايزينه بإيميل وباسورد أو برقم تليفون وباسورد».
-- الجذر: الحساب اللي بيتعمل من /start (واتساب → createUser بدون باسورد، أو جوجل) ماكانش ليه باسورد أصلًا،
-- وإيميله الداخلي <الرقم>@madmonacairo.com مش الإيميل اللي المستخدم كتبه في الفورم. فالدخول بالباسورد كان مستحيل.
-- العلاج (٣ أجزاء): (١) باسورد في فورم /start بيتحط على مستخدم Supabase بـservice_role في /api/start/create-business
-- + الإيميل في user_metadata.login_email · (٢) الدالة دي بتحوّل أي إيميل بيعرفه المستخدم لإيميل auth وقت الدخول (/api/login)
-- · (٣) SetPasswordCard في /account للحسابات القديمة. مطبّقة لايف ١٤/٩/٢٠٢٦ عبر execute_sql.
create or replace function public.auth_user_for_login_email(p_email text)
returns jsonb
language plpgsql
security definer
set search_path to 'public','auth','pg_catalog'
as $$
declare v_e text; v_uid uuid; v_email text;
begin
  v_e := lower(btrim(coalesce(p_email,'')));
  if v_e = '' or position('@' in v_e) = 0 then return jsonb_build_object('found', false); end if;
  select u.id, u.email into v_uid, v_email from auth.users u where lower(u.email) = v_e limit 1;
  if v_uid is null then
    select u.id, u.email into v_uid, v_email from auth.users u where lower(coalesce(u.raw_user_meta_data->>'login_email','')) = v_e limit 1;
  end if;
  if v_uid is null then
    select u.id, u.email into v_uid, v_email from profiles p join auth.users u on u.id = p.id where lower(coalesce(p.email,'')) = v_e limit 1;
  end if;
  if v_uid is null then
    select u.id, u.email into v_uid, v_email
      from suppliers s join marketplace_suppliers ms on ms.id = s.id join auth.users u on u.id = ms.profile_id
     where lower(coalesce(s.contact_email,'')) = v_e order by s.created_at desc limit 1;
  end if;
  if v_uid is null or v_email is null then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'user_id', v_uid, 'email', v_email);
end $$;
revoke all on function public.auth_user_for_login_email(text) from public, anon, authenticated;
grant execute on function public.auth_user_for_login_email(text) to service_role;
