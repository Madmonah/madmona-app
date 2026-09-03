-- 🧹📦 (٣ سبتمبر ٢٠٢٦) محمد: «شيل صلاحيات الفريق واحفظ الأرقام في مكان الحفظ».
--
-- ═══ ١) الصلاحيات — الباب اللي كان لسه مفتوح ═══
-- بعد إنهاء الخدمة، الفحص على **كل** مصادر الصلاحية (مش عمود واحد) لقى
-- عبير لسه `owner` **نشط** في `supplier_admins` على «رويال إستيت (نموذج)».
-- الصف ده كان بيدّيها `business_admin` = لوحة الفلوس الكاملة على البيزنس
-- ده، رغم إن حسابها كموظفة اتقفل. **قاعدة ٣: بابين مش باب واحد.**
-- ✅ اتعطّل (active=false) مش اتمسح — الأثر بيتحفظ.
--    نسخة في `_backup_supplier_admin_off_20260903`.
--
-- ✔️ الباقي اتأكد إنه نضيف:
--    permissions={} · صفر platform_admins · صفر جلسة · receives_leads=false
--    و`is_madmona_staff()` بتفحص `status='active'` فالخمسة اتشالوا منها
--    تلقائي (يعني مافيش تعديل صلاحيات إعلانات على مستوى المنصة).
-- ⚠️ ملاحظة: أدوار البروفايل بقت customer/supplier — ماتلمستش، لأن
--    `role` مش هو مصدر الصلاحية عند مضمونة (الصلاحية في permissions).
--
-- ═══ ٢) الأرقام — مخزن صريح ═══
-- `crm_contacts_parked`: كل رقم كان على موظف منهي خدمته، **محتفظ
-- بمندوبه الأصلي** عشان لو رجع التوزيع نعرف كان مع مين.
--   مديحة ١٬٦٥١ (١٬٦٢٩ شغّالة) · عبير ١٬٢٨٠ (١٬٢٤٧) ·
--   شهد ١٬٢٧٨ (١٬٢٥٠) · ايمان ٥٤١ (٤٨٨)
--   **الإجمالي ٤٬٧٥٠ رقم · ٤٬٦١٤ منها لسه شغّالة**
-- 🔒 RLS مفعّل وصفر صلاحية لـanon.
--
-- 📌 نورا وسامية **صفر أرقام** عليهم دلوقتي — الـ٣٩٥ بتوع نورا اللي
--    اتذكروا يوم ٢/٩ اتشالوا عنها وقتها، فمش داخلين هنا.
--
-- ⚠️ الأرقام لسه مسنودة لأصحابها الأصليين في `crm_contacts` (owner_id
--    ما اتغيّرش). المخزن ده **حفظ**، مش إعادة توزيع — التوزيع محتاج
--    قرار محمد: مين ياخد قطاع مين.
--    لما يتقرر: update crm_contacts set owner_id=<الجديد>
--                 where id in (select contact_id from crm_contacts_parked ...)

create table if not exists _backup_supplier_admin_off_20260903 as
select sa.* from supplier_admins sa
where phone_core(sa.phone) in (select phone_core(phone) from _backup_terminated_20260903 where phone is not null)
  and sa.active;
alter table public._backup_supplier_admin_off_20260903 enable row level security;
revoke all on public._backup_supplier_admin_off_20260903 from anon, authenticated;

update supplier_admins sa set active = false
where phone_core(sa.phone) in (select phone_core(phone) from _backup_terminated_20260903 where phone is not null);

create table if not exists crm_contacts_parked (
  contact_id uuid primary key,
  phone text, display_name text, specialty text, city text, status text,
  prev_owner_id uuid, prev_owner_name text,
  last_contact_at timestamptz, notes text,
  parked_at timestamptz not null default now(),
  parked_reason text
);
alter table public.crm_contacts_parked enable row level security;
revoke all on public.crm_contacts_parked from anon, authenticated;

insert into crm_contacts_parked (contact_id, phone, display_name, specialty, city, status,
                                 prev_owner_id, prev_owner_name, last_contact_at, notes, parked_reason)
select c.id, c.phone, c.display_name, c.specialty, c.city, c.status,
       c.owner_id, be.full_name, c.last_contact_at, c.notes,
       'إنهاء خدمة الموظف — ٣ سبتمبر ٢٠٢٦'
from crm_contacts c
join business_employees be on be.auth_user_id = c.owner_id
where be.status = 'terminated'
on conflict (contact_id) do nothing;
