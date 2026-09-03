-- 🧱 (٣ سبتمبر ٢٠٢٦) محمد: «محتاجين نشتغل صح على المعرض الجاي بتاع مواد
--    البناء، ونبعت للناس اللي هتشارك نبذة تعريفية، ونشتغل قبل المعرض مع
--    العارضين، ونجهّز حاجة هاردكوبي» + «عايزين نعمل فورم بالإيميل كمان —
--    أكتر احترافية في التعامل مع الشركات».
--
-- ═══ ١) شجرة مواد البناء ═══
-- «مواد بناء بالجملة» كانت قسم واحد **من غير أولاد ولا حقول** — العارض
-- مكانش هيلاقي مكان لمنتجه، وده أطول خطوة في التجهيز.
-- اتعمل ١٢ قسم × ٧ حقول لكل واحد.
--
-- الحقول كلها **قوايم منسدلة مع «أخرى»** — قاعدة محمد ٢٧/٨: «كل حقول
-- التفاصيل تبقى قوايم منسدلة مش كتابة حرة».
--   وحدة البيع (إجباري) · أقل كمية للطلب (إجباري) · صفة المورّد (إجباري)
--   · بلد المنشأ · مدة التوريد · التوصيل · الماركة
-- «وحدة البيع» إجبارية لأن سعر جملة من غير وحدة مالوش معنى (طن؟ متر؟
-- شيكارة؟) — وده بالظبط اللي خلّى منتجات المعرض اللي فات مش قابلة للمقارنة.
--
-- ═══ ٢) طلبات العارضين — expo_leads ═══
-- الشركة بتملا فورم /expo → صف هنا → **إيميل تأكيد للشركة** (customer-facing)
-- + **إشعار پوش** لفريق الإعلانات (قاعدة: التنبيهات الداخلية نوتيفيكيشن
-- مش إيميل ولا واتساب).
-- 🔒 الجدول RLS مفعّل و**صفر صلاحية** لـanon/authenticated — الكتابة
--    من السيرفر بـservice_role بس، فمفيش طريق حد يقرا طلبات غيره.
-- فهرس فريد على (event, lower(email)) — الشركة تبعت تاني = تحديث مش تكرار.
--
-- ═══ ٣) listings_staff_profile_ids() ═══
-- مين ياخد إشعار «عارض جديد». **نفس تعريف** notify_wizard_draft_submitted
-- بالظبط (موظفي مضمونة النشطين اللي عندهم can_manage_listings) — مصدر
-- واحد بدل تعريف موازي. اتجرّب: بيرجّع ٦ موظفين.

-- ─── التصنيفات ───
with p as (select id, image_url, track, group_slug, group_name_ar, group_emoji,
                  group_display_order, order_mode
           from categories where slug='industry-building-materials'),
kids(slug, ar, en, ord) as (values
  ('bm-cement','أسمنت ومونة جاهزة','Cement & Mortar',1),
  ('bm-steel','حديد تسليح ومعادن','Rebar & Metals',2),
  ('bm-concrete','خرسانة وطوب ومنتجات أسمنتية','Concrete & Blocks',3),
  ('bm-ceramic','سيراميك وبورسلين','Ceramics & Porcelain',4),
  ('bm-marble','رخام وجرانيت وحجر','Marble, Granite & Stone',5),
  ('bm-paints','دهانات وعوازل وكيماويات بناء','Paints, Coatings & Chemicals',6),
  ('bm-gypsum','جبس وأسقف ومعالجة حوائط','Gypsum & Ceilings',7),
  ('bm-aluminium','ألومنيوم وزجاج وواجهات','Aluminium, Glass & Facades',8),
  ('bm-wood','أخشاب وأبواب وأرضيات','Wood, Doors & Flooring',9),
  ('bm-sanitary','أدوات صحية وحمامات ومطابخ','Sanitary Ware & Kitchens',10),
  ('bm-electrical','كهرباء وإضاءة وكابلات','Electrical & Lighting',11),
  ('bm-tools','معدات وعدد موقع','Site Equipment & Tools',12)
)
insert into categories (parent_id, slug, name_ar, name_en, image_url, is_active, display_order,
                        track, group_slug, group_name_ar, group_emoji, group_display_order, order_mode)
select p.id, k.slug, k.ar, k.en, p.image_url, true, k.ord,
       p.track, p.group_slug, p.group_name_ar, p.group_emoji, p.group_display_order, p.order_mode
from kids k, p
where not exists (select 1 from categories c where c.slug = k.slug);

-- ─── الحقول: الملف الكامل في نداء الميجريشن اللايف (٧ حقول × ١٢ قسم) ───
-- bm_unit · bm_min_order · bm_origin · bm_supply_role · bm_lead_time
-- · bm_delivery · brand_name

-- ─── طلبات العارضين ───
create table if not exists public.expo_leads (
  id uuid primary key default gen_random_uuid(),
  event text not null default 'building-materials-2026',
  company_name text not null,
  contact_name text,
  email text not null,
  phone text,
  phone_core text generated always as (regexp_replace(regexp_replace(coalesce(phone,''),'\D','','g'),'^(002|20)?0?','')) stored,
  website text, booth text, categories text[], supplier_role text,
  message text, catalog_url text,
  status text not null default 'new',
  supplier_id uuid references public.marketplace_suppliers(id) on delete set null,
  source text not null default 'web-form',
  created_at timestamptz not null default now(),
  handled_at timestamptz, handled_by uuid
);
create index if not exists expo_leads_event_idx on public.expo_leads(event, created_at desc);
create unique index if not exists expo_leads_dedupe on public.expo_leads(event, lower(email));
alter table public.expo_leads enable row level security;
revoke all on public.expo_leads from anon, authenticated;

create or replace function public.listings_staff_profile_ids()
 returns uuid[] language sql security definer set search_path to 'public' stable
as $$
  select coalesce(array_agg(distinct be.auth_user_id), '{}'::uuid[])
  from business_employees be
  join suppliers s on s.id = be.supplier_id
  where s.is_platform_owner = true
    and be.status = 'active'
    and be.auth_user_id is not null
    and coalesce((be.permissions->>'can_manage_listings')::boolean, false) = true;
$$;
