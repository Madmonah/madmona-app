-- =====================================================================
-- Marid Orchestrator — central cron control for مضمونة
-- كل الكرونات standby تحت المارد؛ نبضة واحدة بتقرر وتشغّل وتسجّل.
-- الملف ده idempotent — تقدر تطبّقه على أي بيئة من الأول لآخره بأمان.
-- Applied live to project mjhflxpxunwycbiquoig on 2026-07-27.
-- ملف مرجعي فقط — مش داخل supabase/migrations عشان مايتنفّذش تلقائي.
-- =====================================================================

-- ── 1) TABLES ────────────────────────────────────────────────────────
create table if not exists public.orchestrator_jobs (
  job_key      text primary key,
  title        text,
  command      text not null,          -- full SQL to EXECUTE (same string pg_cron used)
  policy_cron  text,                   -- 5-field cron; null = manual only
  managed      boolean not null default false,  -- true = orchestrator drives it
  enabled      boolean not null default true,   -- false = standby (won't run even if due)
  category     text,                   -- infra | monitor | work | test
  source_jobid bigint,                 -- original cron.job id (to restore native)
  last_run_at  timestamptz,
  last_status  text,
  run_count    int not null default 0,
  error_count  int not null default 0,
  config       jsonb not null default '{}'::jsonb,
  updated_at   timestamptz not null default now()
);

create table if not exists public.orchestrator_job_runs (
  id           bigserial primary key,
  job_key      text,
  triggered_by text,                   -- heartbeat | manual | watchdog | ...
  started_at   timestamptz not null default now(),
  finished_at  timestamptz,
  status       text,                   -- ok | error
  detail       text
);
create index if not exists idx_orch_jobruns_job_time
  on public.orchestrator_job_runs(job_key, started_at desc);

alter table public.orchestrator_jobs     enable row level security;
alter table public.orchestrator_job_runs enable row level security;

-- ── 2) CRON MATCHER (evaluated in UTC, like pg_cron) ─────────────────
create or replace function public.cron_field_matches(spec text, val int)
returns boolean language plpgsql immutable as $fn$
declare part text; base text; stp int; lo int; hi int;
begin
  if spec is null or spec = '*' then return true; end if;
  foreach part in array string_to_array(spec, ',') loop
    stp := 1; base := part;
    if position('/' in part) > 0 then
      base := split_part(part,'/',1);
      stp  := nullif(split_part(part,'/',2),'')::int;
      if base = '*' then base := ''; end if;
    end if;
    if base = '' then
      if stp is not null and stp > 0 and (val % stp) = 0 then return true; end if;
    elsif position('-' in base) > 0 then
      lo := split_part(base,'-',1)::int; hi := split_part(base,'-',2)::int;
      if val between lo and hi and ((val - lo) % coalesce(stp,1)) = 0 then return true; end if;
    else
      if val = base::int then return true; end if;
    end if;
  end loop;
  return false;
end;
$fn$;

create or replace function public.cron_matches(expr text, ts timestamptz)
returns boolean language plpgsql immutable as $fn$
declare f text[]; u timestamp; mm int; hh int; dom int; mon int; dow int;
        dom_restricted boolean; dow_restricted boolean;
begin
  if expr is null then return false; end if;
  f := string_to_array(regexp_replace(btrim(expr), '\s+', ' ', 'g'), ' ');
  if array_length(f,1) <> 5 then return false; end if;
  u := ts at time zone 'UTC';
  mm := extract(minute from u)::int; hh := extract(hour from u)::int;
  dom := extract(day from u)::int;   mon := extract(month from u)::int;
  dow := extract(dow from u)::int;   -- 0=Sun..6=Sat
  dom_restricted := f[3] <> '*'; dow_restricted := f[5] <> '*';
  if not (public.cron_field_matches(f[1], mm) and public.cron_field_matches(f[2], hh)
          and public.cron_field_matches(f[4], mon)) then
    return false;
  end if;
  if dom_restricted and dow_restricted then     -- standard cron OR-quirk
    return public.cron_field_matches(f[3], dom) or public.cron_field_matches(f[5], dow);
  else
    return public.cron_field_matches(f[3], dom) and public.cron_field_matches(f[5], dow);
  end if;
end;
$fn$;

-- ── 3) THE HEARTBEAT BRAIN — dispatch every due, managed, enabled job ─
create or replace function public.marid_orchestrate(p_trigger text default 'heartbeat', p_max int default 200)
returns jsonb language plpgsql security definer
set search_path = public, extensions, net, pg_catalog as $fn$
declare j record; n int:=0; ok int:=0; err int:=0; rid bigint;
begin
  for j in
    select * from public.orchestrator_jobs
    where managed and enabled and policy_cron is not null
      and public.cron_matches(policy_cron, now())
    order by job_key limit p_max
  loop
    n := n + 1;
    insert into public.orchestrator_job_runs(job_key, triggered_by, started_at)
      values (j.job_key, p_trigger, clock_timestamp()) returning id into rid;
    begin
      execute j.command;
      ok := ok + 1;
      update public.orchestrator_jobs set last_run_at=now(), last_status='ok',
        run_count=run_count+1, updated_at=now() where job_key=j.job_key;
      update public.orchestrator_job_runs set finished_at=clock_timestamp(), status='ok' where id=rid;
    exception when others then
      err := err + 1;
      update public.orchestrator_jobs set last_run_at=now(), last_status='error',
        error_count=error_count+1, updated_at=now() where job_key=j.job_key;
      update public.orchestrator_job_runs set finished_at=clock_timestamp(), status='error',
        detail=left(SQLERRM,400) where id=rid;
    end;
  end loop;
  return jsonb_build_object('trigger',p_trigger,'due',n,'ok',ok,'error',err,'at',now());
end;
$fn$;

-- ── 4) MANUAL DISPATCH — the Marid (or you) run any job on command ───
create or replace function public.marid_run_job(p_job_key text, p_trigger text default 'manual')
returns jsonb language plpgsql security definer
set search_path = public, extensions, net, pg_catalog as $fn$
declare j public.orchestrator_jobs; rid bigint;
begin
  select * into j from public.orchestrator_jobs where job_key = p_job_key;
  if not found then return jsonb_build_object('ok',false,'error','job not found'); end if;
  if not j.enabled then return jsonb_build_object('ok',false,'error','job is standby/disabled'); end if;
  insert into public.orchestrator_job_runs(job_key, triggered_by, started_at)
    values (p_job_key, p_trigger, clock_timestamp()) returning id into rid;
  begin
    execute j.command;
    update public.orchestrator_jobs set last_run_at=now(), last_status='ok',
      run_count=run_count+1, updated_at=now() where job_key=p_job_key;
    update public.orchestrator_job_runs set finished_at=clock_timestamp(), status='ok' where id=rid;
    return jsonb_build_object('ok',true,'job',p_job_key);
  exception when others then
    update public.orchestrator_jobs set last_run_at=now(), last_status='error',
      error_count=error_count+1, updated_at=now() where job_key=p_job_key;
    update public.orchestrator_job_runs set finished_at=clock_timestamp(), status='error',
      detail=left(SQLERRM,400) where id=rid;
    return jsonb_build_object('ok',false,'job',p_job_key,'error',left(SQLERRM,400));
  end;
end;
$fn$;

-- ── 5) WATCHDOG — guards the heartbeat, self-heals, alerts owner ─────
create or replace function public.marid_heartbeat_watchdog() returns jsonb
language plpgsql security definer set search_path = public, extensions, net, pg_catalog as $fn$
declare last_beat timestamptz; stale boolean; hb_active boolean; recovered jsonb;
begin
  select max(started_at) into last_beat from public.orchestrator_job_runs;
  stale := last_beat is null or last_beat < now() - interval '150 seconds';
  if not stale then return jsonb_build_object('ok',true,'stale',false,'last_beat',last_beat); end if;
  select active into hb_active from cron.job where jobname='marid-heartbeat';
  if hb_active is null then
    perform cron.schedule('marid-heartbeat','* * * * *', $q$select public.marid_orchestrate('heartbeat')$q$);
  elsif hb_active = false then
    perform cron.alter_job((select jobid from cron.job where jobname='marid-heartbeat'), active:=true);
  end if;
  recovered := public.marid_orchestrate('watchdog-recovery');
  begin
    insert into public.whatsapp_outbound_queue(recipient_phone, message, campaign, status, agent_name)
    values ('201002229982','⚠️ نبضة المارد كانت واقفة واترجّعت أوتوماتيك.', 'owner_alert','pending','watchdog');
  exception when others then null; end;
  return jsonb_build_object('ok',true,'stale',true,'action','recovered','last_beat',last_beat,'recovery',recovered);
end;
$fn$;

-- ── 6) REGISTER all existing pg_cron jobs (managed=false → no change) ─
insert into public.orchestrator_jobs (job_key, title, command, policy_cron, managed, enabled, source_jobid, category)
select jobname, jobname, command, schedule, false, active, jobid,
  case
    when jobname ~* 'whatsapp|wa-|wa_|clockout|push|listing-autopublish|outbound|instant-claim' then 'infra'
    when jobname ~* 'health|monitor|reaper|orphan|storage' then 'monitor'
    else 'work' end
from cron.job
where jobname not in ('marid-heartbeat','marid-heartbeat-watchdog')
on conflict (job_key) do update set command=excluded.command, policy_cron=excluded.policy_cron,
  source_jobid=excluded.source_jobid, category=excluded.category;

insert into public.orchestrator_jobs (job_key, title, command, policy_cron, managed, enabled, category)
values ('_orch_log_prune','prune orchestrator run log',
        'delete from public.orchestrator_job_runs where started_at < now() - interval ''7 days''',
        '30 3 * * *', true, true, 'infra')
on conflict (job_key) do nothing;

-- ── 7) THE ONLY TWO NATIVE CRONS: heartbeat + its watchdog ───────────
select cron.schedule('marid-heartbeat',          '* * * * *',   $q$select public.marid_orchestrate('heartbeat')$q$);
select cron.schedule('marid-heartbeat-watchdog', '*/2 * * * *', $q$select public.marid_heartbeat_watchdog()$q$);

-- ── 8) CUTOVER — hand every job to the Marid (disable native, managed=true)
do $$
declare r record;
begin
  for r in
    select oj.source_jobid from public.orchestrator_jobs oj
    join cron.job cj on cj.jobid = oj.source_jobid
    where cj.active = true
  loop
    perform cron.alter_job(r.source_jobid, active := false);
  end loop;
end $$;
update public.orchestrator_jobs set managed = true;

-- =====================================================================
-- HOW TO USE
--   • شغّل مهمة فورًا:          select marid_run_job('اسم_المهمة');
--   • أوقف مهمة (standby):      update orchestrator_jobs set enabled=false where job_key='...';
--   • رجّعها:                   update orchestrator_jobs set enabled=true  where job_key='...';
--   • رجّعها لكرونها الأصلي:    update orchestrator_jobs set managed=false where job_key='...';
--                              select cron.alter_job(<source_jobid>, active:=true);
--   • آخر التشغيلات:           select * from orchestrator_job_runs order by id desc limit 50;
--   • صحة النظام:              select job_key,last_status,last_run_at,error_count
--                              from orchestrator_jobs where managed and enabled order by last_run_at desc;
-- ملاحظة: كرونات Vercel الـ8 (vercel.json) لسه على Vercel — بره النظام ده.
-- =====================================================================
