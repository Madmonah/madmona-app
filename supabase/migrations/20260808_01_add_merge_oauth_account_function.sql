-- Google sign-in conflict fix: merge an oauth-orphan account into the
-- existing account that owns the (OTP-verified) phone number.
-- Deployed to production 2026-08-08. service_role only.

CREATE OR REPLACE FUNCTION public.merge_oauth_into_existing(p_orphan_user_id uuid, p_phone text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
declare
  v_old_user_id uuid;
  v_orphan_phone text;
  v_orphan_email text;
begin
  -- 1) the account that owns this (already OTP-verified) phone
  select id into v_old_user_id
  from public.profiles
  where phone = p_phone;

  if v_old_user_id is null then
    raise exception 'no_account_with_phone';
  end if;

  if v_old_user_id = p_orphan_user_id then
    raise exception 'same_account';
  end if;

  -- 2) caller account must be a fresh oauth orphan (placeholder phone),
  --    so we can never destroy an established account by mistake
  select phone into v_orphan_phone
  from public.profiles
  where id = p_orphan_user_id;

  if v_orphan_phone is null or v_orphan_phone not like 'oauth:%' then
    raise exception 'not_an_oauth_orphan';
  end if;

  select email into v_orphan_email
  from auth.users
  where id = p_orphan_user_id;

  -- 3) re-parent all login identities (google/apple/...) onto the old account
  update auth.identities
     set user_id = v_old_user_id
   where user_id = p_orphan_user_id;

  -- 4) carry the gmail over if the old account has no email and it's unused
  update auth.users u
     set email = v_orphan_email
   where u.id = v_old_user_id
     and u.email is null
     and v_orphan_email is not null
     and not exists (
       select 1 from auth.users x
       where lower(x.email) = lower(v_orphan_email)
         and x.id <> p_orphan_user_id
     );

  update public.profiles p
     set email = coalesce(p.email, v_orphan_email)
   where p.id = v_old_user_id;

  -- 5) remove the empty orphan (explicit deletes; FK failure = full rollback)
  delete from public.profiles where id = p_orphan_user_id;
  begin
    delete from public.users where id = p_orphan_user_id;
  exception when undefined_table then
    null;
  end;
  delete from auth.users where id = p_orphan_user_id;

  return jsonb_build_object('status', 'merged', 'merged_into', v_old_user_id);
end;
$function$;

revoke all on function public.merge_oauth_into_existing(uuid, text) from public, anon, authenticated;
grant execute on function public.merge_oauth_into_existing(uuid, text) to service_role;
