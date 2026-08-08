-- Unified account system, deployed to production 2026-08-08:
--   get_module_token()  : Supabase login -> madmona_sessions token (المارد/الإدارة)
--   whoami(p_token)     : profile + roles via the same engine as madmona_resolve
--   my_sessions()       : Account Center — list logged-in devices
--   revoke_session(id)  : remote logout of one device

CREATE OR REPLACE FUNCTION public.get_module_token()
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_norm text;
  v_name text;
  v_account_id uuid;
  v_token uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select public.madmona_norm_phone(
           coalesce(nullif(u.phone, ''),
                    case when p.phone not like 'oauth:%' then p.phone end)),
         p.full_name
    into v_norm, v_name
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_uid;

  if v_norm is null then
    raise exception 'no_phone_on_account';
  end if;

  select id into v_account_id
  from public.madmona_accounts
  where phone_normalized = v_norm;

  if v_account_id is null then
    insert into public.madmona_accounts (phone_normalized, full_name, last_login_at)
    values (v_norm, v_name, now())
    returning id into v_account_id;
  else
    update public.madmona_accounts
       set last_login_at = now(),
           full_name = coalesce(full_name, v_name)
     where id = v_account_id;
  end if;

  insert into public.madmona_sessions (token, account_id, expires_at, last_seen_at, created_at)
  values (gen_random_uuid(), v_account_id, now() + interval '90 days', now(), now())
  returning token into v_token;

  return v_token;
end;
$function$;

revoke all on function public.get_module_token() from public, anon;
grant execute on function public.get_module_token() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.whoami(p_module_token uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_norm text;
  v_token uuid := p_module_token;
  v_roles jsonb;
  v_profile jsonb;
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;

  select to_jsonb(p) - 'national_id' into v_profile
  from public.profiles p
  where p.id = v_uid;

  select public.madmona_norm_phone(
           coalesce(nullif(u.phone, ''),
                    case when p.phone not like 'oauth:%' then p.phone end))
    into v_norm
  from auth.users u
  left join public.profiles p on p.id = u.id
  where u.id = v_uid;

  -- Email-only account: profile without module roles
  if v_norm is null then
    return jsonb_build_object(
      'authenticated', true,
      'user_id', v_uid,
      'profile', v_profile,
      'module_token', null
    );
  end if;

  -- Reuse a provided token only if it truly belongs to this user
  if v_token is not null and not exists (
    select 1
    from public.madmona_sessions s
    join public.madmona_accounts a on a.id = s.account_id
    where s.token = v_token
      and s.expires_at > now()
      and a.phone_normalized = v_norm
  ) then
    v_token := null;
  end if;

  if v_token is null then
    v_token := public.get_module_token();
  end if;

  v_roles := public.madmona_resolve(v_token);

  return coalesce(v_roles, '{}'::jsonb)
         || jsonb_build_object('user_id', v_uid, 'profile', v_profile, 'module_token', v_token);
end;
$function$;

revoke all on function public.whoami(uuid) from public, anon;
grant execute on function public.whoami(uuid) to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_sessions()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
  select coalesce(jsonb_agg(jsonb_build_object(
           'session_id', s.id,
           'created_at', s.created_at,
           'last_active', greatest(coalesce(s.refreshed_at, s.created_at)::timestamptz, s.updated_at),
           'user_agent', s.user_agent,
           'ip', case when s.ip is null then null else host(s.ip) end,
           'is_current', (s.id::text = coalesce(auth.jwt() ->> 'session_id', ''))
         ) order by greatest(coalesce(s.refreshed_at, s.created_at)::timestamptz, s.updated_at) desc),
         '[]'::jsonb)
  from auth.sessions s
  where s.user_id = auth.uid();
$function$;

revoke all on function public.my_sessions() from public, anon;
grant execute on function public.my_sessions() to authenticated, service_role;

CREATE OR REPLACE FUNCTION public.revoke_session(p_session_id uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'auth', 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated';
  end if;
  if p_session_id::text = coalesce(auth.jwt() ->> 'session_id', '') then
    raise exception 'cannot_revoke_current_session';
  end if;

  delete from auth.refresh_tokens
  where session_id = p_session_id
    and exists (select 1 from auth.sessions s
                where s.id = p_session_id and s.user_id = v_uid);

  delete from auth.sessions
  where id = p_session_id and user_id = v_uid;

  return found;
end;
$function$;

revoke all on function public.revoke_session(uuid) from public, anon;
grant execute on function public.revoke_session(uuid) to authenticated, service_role;
