-- (١٤/٩/٢٠٢٦) محمد: «الاكونت بعد ما بنعمله ونيجي نسجل دخول من تاب ستارت مش بنعرف ندخل — ٢ مرة».
-- الجذر (من الداتا — إيمان): نفس الرقم ليه حسابين Supabase (واتساب <الرقم>@madmonacairo.com + جوجل) —
-- الباسورد بتاع /start اتحط على حساب جوجل، والدخول بالرقم كان بيحوّل لحساب الواتساب بس → «الباسورد غلط».
-- الحل: كل الحسابات المرتبطة بالرقم (auth.users.phone · الإيميل الداخلي · profiles.phone · suppliers.contact_phone
-- لصاحب البيزنس · الموظف) — و/api/login بيجرّب الباسورد عليهم بالترتيب. مطبّقة لايف ١٤/٩ ومجرّبة (_start_dup_e2e.cjs).
create or replace function public.auth_users_for_account_phone(p_phone text)
returns jsonb language plpgsql security definer set search_path to 'public','auth','pg_catalog' as $$
declare v_core text; v_emp jsonb; v_out jsonb;
begin
  v_core := phone_core(p_phone);
  if v_core is null or v_core = '' then return '[]'::jsonb; end if;
  v_emp := public.auth_user_for_employee_login(p_phone);
  with cand as (
    select u.id, 0 as pri from auth.users u where phone_core(coalesce(u.phone,'')) = v_core
    union all select u.id, 1 from auth.users u where lower(u.email) = '20'||v_core||'@madmonacairo.com'
    union all select p.id, 2 from profiles p where phone_core(coalesce(p.phone,'')) = v_core
    union all select ms.profile_id, 3 from suppliers s join marketplace_suppliers ms on ms.id = s.id
      where ms.profile_id is not null and phone_core(coalesce(s.contact_phone,'')) = v_core
    union all select (v_emp->>'user_id')::uuid, -1 where coalesce((v_emp->>'found')::boolean, false)
  ), ranked as (
    select u.id, u.email, min(c.pri) as pri,
      (u.encrypted_password is not null and u.encrypted_password <> '') as has_password,
      exists(select 1 from marketplace_suppliers ms where ms.profile_id = u.id) as owns_business,
      u.last_sign_in_at
    from cand c join auth.users u on u.id = c.id
    where u.email is not null and u.deleted_at is null
    group by u.id, u.email, u.encrypted_password, u.last_sign_in_at
  )
  select coalesce(jsonb_agg(jsonb_build_object('user_id', r.id, 'email', r.email, 'has_password', r.has_password,
           'owns_business', r.owns_business, 'last_sign_in', r.last_sign_in_at)
         order by r.has_password desc, r.owns_business desc, r.last_sign_in_at desc nulls last, r.pri), '[]'::jsonb)
  into v_out from ranked r;
  return v_out;
end $$;
revoke all on function public.auth_users_for_account_phone(text) from public, anon, authenticated;
grant execute on function public.auth_users_for_account_phone(text) to service_role;

-- الدالة القديمة (حساب واحد — /api/auth/upgrade): الموظف الأول، وإلا أول عنصر من القايمة فوق
create or replace function public.auth_user_for_account_phone(p_phone text)
returns jsonb language plpgsql security definer set search_path to 'public','auth','pg_catalog' as $$
declare v_core text; v_emp jsonb; v_list jsonb;
begin
  v_core := phone_core(p_phone);
  if v_core is null or v_core = '' then return jsonb_build_object('found', false); end if;
  v_emp := public.auth_user_for_employee_login(p_phone);
  if coalesce((v_emp->>'found')::boolean, false) then return v_emp || jsonb_build_object('via','employee'); end if;
  v_list := public.auth_users_for_account_phone(p_phone);
  if jsonb_array_length(v_list) = 0 then return jsonb_build_object('found', false); end if;
  return jsonb_build_object('found', true, 'user_id', (v_list->0->>'user_id')::uuid, 'email', v_list->0->>'email', 'via', 'phone', 'candidates', jsonb_array_length(v_list));
end $$;
