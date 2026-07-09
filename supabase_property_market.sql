-- ============================================================
-- 📊 بورصة عقارات مضمونة — العاصمة الإدارية + التجمع (يوليو 2026)
-- ✅ الملف ده اتنفذ بالفعل على Supabase مباشرة يوم 9 يوليو 2026
--    (migration: property_market_items_july2026) — محفوظ هنا كمرجع.
-- الصفحة /real-estate/market بتقرأ من الجدول (قراءة عامة).
-- التحديث: عدّل الصفوف من Table Editor — updated_at بيتظبط لوحده
-- والصفحة بتعرض "آخر تحديث" تلقائياً.
-- ============================================================

create table if not exists public.property_market_items (
  id uuid primary key default gen_random_uuid(),
  area text not null check (area in ('new_capital','new_cairo')),
  segment text not null check (segment in ('developer','resale','rent')),
  developer text,
  title text not null,
  unit_label text,
  price_from numeric,
  price_to numeric,
  price_unit text not null default 'egp_total'
    check (price_unit in ('egp_total','egp_per_m2','egp_month')),
  note text,
  source_name text,
  is_active boolean not null default true,
  sort_order int not null default 100,
  updated_at timestamptz not null default now()
);

alter table public.property_market_items enable row level security;

drop policy if exists pmi_public_read on public.property_market_items;
create policy pmi_public_read on public.property_market_items
  for select using (is_active = true);

create or replace function public.touch_property_market_items()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists trg_touch_pmi on public.property_market_items;
create trigger trg_touch_pmi before update on public.property_market_items
  for each row execute function public.touch_property_market_items();

-- SEED (يوليو 2026) — التفاصيل الكاملة في migration
-- property_market_items_july2026 على Supabase.
-- 32 صف: 13 مشروع مطورين + 15 ريسيل + 4 إيجارات.

select area, segment, count(*) from public.property_market_items group by 1,2 order by 1,2;
