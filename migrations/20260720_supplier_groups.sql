-- =====================================================================
-- جروبات متابعة الموردين
--
-- الفكرة: لكل مورد جروب واتساب فيه المورد + فريق مضمونة.
--   • أي طلب يجي للمارد ويخصّ المورد ده → يتحوّل على جروبه
--   • أي تحديث على إعلانه يتقال قدام الكل
--   • مفيش حاجة بتضيع في محادثة خاصة محدش شايفها
--
-- ليه جدول منفصل مش عمود في marketplace_suppliers:
--   المورد ممكن يبقى له أكتر من جروب بعدين (مبيعات / دعم / تشغيل).
--   والجدول المنفصل بيسجّل مين اتضاف وإمتى — ده مهم لو حد اشتكى
--   إنه اتضاف من غير إذنه.
-- =====================================================================

create table if not exists public.supplier_wa_groups (
  id              uuid primary key default gen_random_uuid(),
  supplier_id     uuid not null references public.marketplace_suppliers(id) on delete cascade,

  group_jid       text not null unique,
  subject         text not null,
  invite_url      text,

  -- الغرض: متابعة عامة، مبيعات، دعم...
  purpose         text not null default 'followup',

  -- مين كان في الجروب وقت الإنشاء
  participants    jsonb not null default '[]'::jsonb,

  -- نص التعريف اللي اتبعت أول ما اتعمل — سجل عشان لو حد سأل
  intro_message   text,

  is_active       boolean not null default true,
  created_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create index if not exists supplier_wa_groups_supplier_idx
  on public.supplier_wa_groups (supplier_id) where is_active;

create index if not exists supplier_wa_groups_jid_idx
  on public.supplier_wa_groups (group_jid);

-- ── الأمان ──────────────────────────────────────────────────────────
-- الجدول ده فيه أرقام وJIDs — ممنوع تمامًا على الزوار.
-- الوصول للخدمة (service_role) بس.
alter table public.supplier_wa_groups enable row level security;

revoke all on public.supplier_wa_groups from anon, authenticated;

-- =====================================================================
-- التحقق بعد التنفيذ:
--   select count(*) from supplier_wa_groups;              -- بالخدمة: شغال
--   -- بالمفتاح العام: لازم يرجع خطأ صلاحيات
-- =====================================================================
