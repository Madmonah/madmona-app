-- Robust phone -> auth user lookup (handles 010..., 2010..., +2010... formats)
-- Matches on the last 10 digits (Egyptian mobile core). service_role only.
-- Deployed to production 2026-08-08.

CREATE OR REPLACE FUNCTION public.find_auth_user_by_phone(p_phone text)
 RETURNS TABLE(user_id uuid, email text)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public', 'auth'
AS $function$
  with target as (
    select right(regexp_replace(p_phone, '\D', '', 'g'), 10) as tail
  )
  select u.id, u.email
  from auth.users u, target t
  where length(t.tail) = 10
    and (
      right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10) = t.tail
      or exists (
        select 1 from public.profiles p
        where p.id = u.id
          and p.phone not like 'oauth:%'
          and right(regexp_replace(p.phone, '\D', '', 'g'), 10) = t.tail
      )
    )
  limit 1;
$function$;

revoke all on function public.find_auth_user_by_phone(text) from public, anon, authenticated;
grant execute on function public.find_auth_user_by_phone(text) to service_role;
