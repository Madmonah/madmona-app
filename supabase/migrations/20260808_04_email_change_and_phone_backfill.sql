-- v2 additions (8 Aug 2026): real-email attach flow + platform-wide phone login
-- 1) email_change_requests: codes for attaching/changing a REAL email (service_role only)
create table if not exists public.email_change_requests (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  new_email  text not null,
  code       text not null,
  expires_at timestamptz not null,
  attempts   int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.email_change_requests enable row level security;

-- 2) is this email already taken by another account?
create or replace function public.email_in_use(p_email text, p_exclude uuid)
returns boolean
language sql security definer
set search_path to 'public','auth'
as $$
  select exists (
    select 1 from auth.users
    where lower(email) = lower(p_email)
      and id <> coalesce(p_exclude, '00000000-0000-0000-0000-000000000000'::uuid)
  );
$$;
revoke all on function public.email_in_use(text, uuid) from public, anon, authenticated;
grant execute on function public.email_in_use(text, uuid) to service_role;

-- 3) hardened find_auth_user_by_phone: deterministic on duplicates
--    (confirmed phone first, then oldest; ignores oauth:/dup: placeholder profiles)
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
  from auth.users u
  cross join target t
  left join public.profiles p on p.id = u.id
  where length(t.tail) = 10
    and (
      right(regexp_replace(coalesce(u.phone, ''), '\D', '', 'g'), 10) = t.tail
      or (
        p.phone is not null
        and p.phone not like 'oauth:%'
        and p.phone not like 'dup:%'
        and right(regexp_replace(p.phone, '\D', '', 'g'), 10) = t.tail
      )
    )
  order by (u.phone_confirmed_at is not null) desc, u.created_at asc
  limit 1;
$function$;

-- 4) one-time backfill (already executed on prod 2026-08-08):
--    copy verified phones from profiles into auth.users so native
--    phone+password login works for every legacy account.
--    Safe to re-run: only fills NULL phones, dedupes, skips taken numbers.
with cand as (
  select u.id,
         case
           when d.digits ~ '^20(10|11|12|15)[0-9]{8}$' then d.digits
           when d.digits ~ '^0(10|11|12|15)[0-9]{8}$'  then '2' || d.digits
           when d.digits ~ '^(10|11|12|15)[0-9]{8}$'   then '20' || d.digits
           else null
         end as norm,
         u.created_at,
         (u.email_confirmed_at is not null) as confirmed
  from auth.users u
  join public.profiles p on p.id = u.id
  cross join lateral (select regexp_replace(coalesce(p.phone,''), '\D', '', 'g') as digits) d
  where u.phone is null
    and p.phone is not null
    and p.phone not like 'oauth:%'
    and p.phone not like 'dup:%'
),
ranked as (
  select id, norm,
         row_number() over (partition by norm order by confirmed desc, created_at asc) as rn
  from cand
  where norm is not null
),
chosen as (
  select r.id, r.norm from ranked r
  where r.rn = 1
    and not exists (select 1 from auth.users x where x.phone = r.norm)
)
update auth.users u
   set phone = c.norm,
       phone_confirmed_at = coalesce(u.phone_confirmed_at, now()),
       updated_at = now()
  from chosen c
 where u.id = c.id;
