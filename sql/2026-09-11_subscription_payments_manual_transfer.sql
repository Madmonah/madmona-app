-- 💳 (١١/٩/٢٠٢٦) دفع يدوي لبرنامج الإدارة — إنستاباي / فودافون كاش / تحويل بنكي (زي لهجتي)
-- محمد: «هما عاملين آلية دفع بإنستاباي وفودافون كاش — ممكن نعمل آلية زيهم بالظبط».
-- الميجريشن مطبّقة لايف باسم subscription_payments_manual_transfer. النسخة هنا للتوثيق وإعادة البناء.
create table if not exists public.subscription_payments (
  id uuid primary key default gen_random_uuid(),
  plan text not null default 'erp1000',
  amount numeric(12,2) not null,
  currency text not null default 'EGP',
  method text not null check (method in ('instapay','vodafone_cash','bank_transfer')),
  phone text not null,
  business_name text,
  sender_name text not null,
  reference text,
  proof_path text not null,                       -- bucket payment-proofs (خاص) — signed URL من لوحة الأدمن بس
  supplier_id uuid references public.suppliers(id) on delete set null,
  status text not null default 'pending' check (status in ('pending','approved','rejected','expired')),
  expires_at timestamptz not null default (now() + interval '1 hour'),
  reviewed_by text, reviewed_at timestamptz, review_note text,
  utm_source text, utm_medium text, utm_content text,
  created_at timestamptz not null default now()
);
create index if not exists subscription_payments_status_idx on public.subscription_payments (status, created_at desc);
alter table public.subscription_payments enable row level security;
revoke all on public.subscription_payments from anon, authenticated;
insert into public.site_settings (key, value, updated_at) values ('erp_price_egp', '1000', now()) on conflict (key) do nothing;
