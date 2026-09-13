-- ============================================================================
-- 📧 التسويق بالإيميل (١٣ سبتمبر ٢٠٢٦) — أمر محمد نصًا: «عايزك تسوق بالايميل برضو»
-- ⚠️ الميجريشن دي اتحضّرت ومااتطبّقتش: أداة الميجريشن اترفضت من الحارس الآلي لأنها بتبني إرسال جماعي.
--    محمد يطبّقها بنفسه من Supabase SQL Editor (نسخة واحدة، idempotent) أو يأمر بتطبيقها صراحةً.
-- اللي بتعمله: قايمة واحدة نظيفة (إيميلات خارجية حقيقية بس) + توكن إلغاء اشتراك لكل واحد
-- + جدول حملات + دالة بتحط الحملة في customer_email_outbox (الكرون الموجود /api/cron/email-outbox بيبعت
--   ٣ رسايل كل ١٠ دقايق عبر Resend — بس لو site_settings.email_outbox_cron_enabled = '1').
-- الواقع (١٣/٩): الإيميلات الخارجية الحقيقية عندنا ~٩٠ بس (١٣ من suppliers + ~٨٠ من profiles) —
--   الباقي عناوين داخلية بتتولد للحسابات (<رقم>@madmonacairo.com · .local · lid). النمو من صندوق الاشتراك في المدونة و/pro.
-- ============================================================================
create table if not exists public.email_marketing_contacts (
  email text primary key,
  name text,
  source text not null default 'import',
  supplier_id uuid,
  profile_id uuid,
  unsub_token uuid not null default gen_random_uuid() unique,
  unsubscribed_at timestamptz,
  unsub_reason text,
  last_campaign_key text,
  last_sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.email_marketing_contacts enable row level security;
revoke all on public.email_marketing_contacts from anon, authenticated;
grant all on public.email_marketing_contacts to service_role;

create table if not exists public.email_campaigns (
  key text primary key,
  subject text not null,
  html text not null,
  text_body text,
  audience text not null default 'all',
  created_at timestamptz not null default now(),
  enqueued_at timestamptz,
  enqueued_count int default 0,
  notes text
);
alter table public.email_campaigns enable row level security;
revoke all on public.email_campaigns from anon, authenticated;
grant all on public.email_campaigns to service_role;

create or replace function public.email_is_real(p text) returns boolean language sql immutable as $$
  select p is not null and p ~ '^[^@\s]+@[^@\s]+\.[a-z]{2,}$'
     and p not ilike '%madmonacairo.com' and p not ilike '%.local' and p not ilike '%@lid%' and p not ilike '%lid.madmona%'
     and p not ilike '%@accounts.%' and p not ilike '%@staff.%'
$$;

insert into public.email_marketing_contacts (email, name, source, supplier_id)
select lower(trim(contact_email)), max(business_name), 'import_supplier', (array_agg(id))[1]
from public.suppliers
where email_is_real(lower(trim(contact_email))) and coalesce(status,'') <> 'rejected'
group by lower(trim(contact_email))
on conflict (email) do nothing;

insert into public.email_marketing_contacts (email, name, source, profile_id)
select lower(trim(email)), max(full_name), 'import_profile', (array_agg(id))[1]
from public.profiles
where email_is_real(lower(trim(email)))
group by lower(trim(email))
on conflict (email) do nothing;

create or replace function public.email_unsubscribe(p_token uuid, p_reason text default null)
returns boolean language plpgsql security definer set search_path = public as $$
declare v int;
begin
  update public.email_marketing_contacts
     set unsubscribed_at = coalesce(unsubscribed_at, now()), unsub_reason = coalesce(p_reason, unsub_reason), updated_at = now()
   where unsub_token = p_token;
  get diagnostics v = row_count;
  return v > 0;
end $$;
revoke all on function public.email_unsubscribe(uuid, text) from public, anon, authenticated;
grant execute on function public.email_unsubscribe(uuid, text) to service_role;

create or replace function public.email_subscribe(p_email text, p_name text default null, p_source text default 'newsletter')
returns jsonb language plpgsql security definer set search_path = public as $$
declare v_email text := lower(trim(p_email));
begin
  if not email_is_real(v_email) then return jsonb_build_object('ok', false, 'error', 'bad_email'); end if;
  insert into public.email_marketing_contacts (email, name, source)
  values (v_email, nullif(trim(p_name), ''), coalesce(p_source, 'newsletter'))
  on conflict (email) do update set unsubscribed_at = null, name = coalesce(excluded.name, email_marketing_contacts.name), updated_at = now();
  return jsonb_build_object('ok', true);
end $$;
revoke all on function public.email_subscribe(text, text, text) from public, anon, authenticated;
grant execute on function public.email_subscribe(text, text, text) to service_role;

-- حط حملة في الطابور لكل مشترك فعّال ({{name}} · {{unsub}}) — p_test_email لإرسال نسخة اختبار لإيميل واحد
create or replace function public.enqueue_email_campaign(p_key text, p_test_email text default null)
returns jsonb language plpgsql security definer set search_path = public as $$
declare c record; r record; v_html text; v_text text; v_n int := 0; v_unsub text;
begin
  select * into c from public.email_campaigns where key = p_key;
  if c.key is null then return jsonb_build_object('ok', false, 'error', 'campaign_not_found'); end if;
  for r in
    select * from public.email_marketing_contacts
    where unsubscribed_at is null
      and (p_test_email is null or email = lower(p_test_email))
      and (p_test_email is not null or coalesce(last_campaign_key,'') <> p_key)
  loop
    v_unsub := 'https://www.madmonacairo.com/api/email/unsubscribe?t=' || r.unsub_token::text;
    v_html := replace(replace(c.html, '{{name}}', coalesce(nullif(r.name,''), 'صاحب البيزنس')), '{{unsub}}', v_unsub);
    v_text := replace(replace(coalesce(c.text_body,''), '{{name}}', coalesce(nullif(r.name,''), 'صاحب البيزنس')), '{{unsub}}', v_unsub);
    insert into public.customer_email_outbox (to_email, to_name, template_key, subject, body_html, body_text, from_email, from_name, reply_to, category, status, priority, attempts, max_attempts, scheduled_at, metadata)
    values (r.email, r.name, 'campaign:' || p_key, c.subject, v_html, nullif(v_text,''), 'noreply@madmonacairo.com', 'مضمونة Madmona', 'support@madmonacairo.com', 'marketing', 'pending', case when p_test_email is not null then 10 else 0 end, 0, 3, now(), jsonb_build_object('campaign', p_key, 'unsub_token', r.unsub_token));
    if p_test_email is null then
      update public.email_marketing_contacts set last_campaign_key = p_key, last_sent_at = now(), updated_at = now() where email = r.email;
    end if;
    v_n := v_n + 1;
  end loop;
  if p_test_email is null then
    update public.email_campaigns set enqueued_at = now(), enqueued_count = coalesce(enqueued_count,0) + v_n where key = p_key;
  end if;
  return jsonb_build_object('ok', true, 'enqueued', v_n);
end $$;
revoke all on function public.enqueue_email_campaign(text, text) from public, anon, authenticated;
grant execute on function public.enqueue_email_campaign(text, text) to service_role;

-- التشغيل بعد التطبيق:
--   1) insert into email_campaigns (key, subject, html, text_body) values ('stories-1', '…', '…', '…');
--   2) select enqueue_email_campaign('stories-1', 'moh91arabco@gmail.com');   -- نسخة اختبار لمحمد
--   3) update site_settings set value='1' where key='email_outbox_cron_enabled';  -- (أو insert لو الصف مش موجود)
--   4) select enqueue_email_campaign('stories-1');                               -- الكل (~٩٠ · ٣ كل ١٠ دقايق)
