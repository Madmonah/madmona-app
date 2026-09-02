-- 👤 (٢ سبتمبر ٢٠٢٦) محمد: «لسه تاب الحضور بيقولي مالكش صلاحية» —
--    للمرة التالتة. الإصلاحين اللي قبل كده كانوا **صح** بس على طبقات
--    تانية (الدور owner · صيغة الرقم · مفتاح التوكن) — والسبب الحقيقي
--    كان لسه مستخبي وراهم.
--
-- ═══ السبب الحقيقي (اتكشف بمقارنة حسابيه) ═══
--   moh91arabco@gmail.com    → ٠١٠٢٦٢٢٢٣٣٧ → **مفيش صف موظف** ❌
--   madmona@madmonacairo.com → ٠١٠٠٢٢٢٩٩٨٢ → محمد ناصف (owner) ✅
--
-- محمد بيدخل بحسابه الشخصي على جوجل. `whoami` بيولّد توكن مضمونة من
-- **رقم حساب الدخول** — يعني رقمه الشخصي. والرقم ده مالوش صف في
-- business_employees، فالحارس بيرفض **بحق**: هو فعلًا مش لاقي موظف بيه.
--
-- ⛔ الحل مش صف موظف تاني بنفس الاسم — ده بيعمل **شخصين** في المرتبات
--    والحضور والعمولة، وهو بالظبط المرض اللي نضّفناه (٣٧ حساب مكرر).
--    الشخص واحد وليه رقمين، والاتنين موثّقين في CLAUDE.md:
--      ٠١٠٠٢٢٢٩٩٨٢ — الرقم الأساسي
--      ٠١٠٢٦٢٢٢٣٣٧ — «محمد ناصف (بيزنس موثّق)»
--
-- ✅ جدول ألياس صريح: «الرقم ده كمان بتاع الموظف ده». مقروء ومحدود
--    ومراجَع — مش ربط ضمني ولا تخمين. والحارس بقى يقبل الرقم الأساسي
--    أو أي ألياس مسجّل.
--
-- 🔒 الأمان: الجدول RLS مفعّل وصفر صلاحية لـanon/authenticated —
--    بيتقري بس جوّه دوال SECURITY DEFINER. وفهرس فريد على phone_core
--    يمنع إن رقم واحد يتربط بموظفين مختلفين.
--
-- ✔️ اتجرب بالرقمين: الاتنين بيوصلوا لـ«محمد ناصف» ·
--    madmona_mgr_employees ok=true · ٩ صفوف حضور من كل رقم.
--
-- 📌 استخدام مستقبلي: أي موظف بيدخل برقم غير المسجّل عليه (ثاني خط،
--    رقم شخصي) يتحل بسطر هنا بدل صف موظف مكرر.

create table if not exists public.employee_phone_aliases (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.business_employees(id) on delete cascade,
  phone text not null,
  phone_core text generated always as (regexp_replace(regexp_replace(phone,'\D','','g'), '^(002|20)?0?', '')) stored,
  note text,
  created_at timestamptz not null default now()
);
create unique index if not exists employee_phone_aliases_uq
  on public.employee_phone_aliases (phone_core);
alter table public.employee_phone_aliases enable row level security;
revoke all on public.employee_phone_aliases from anon, authenticated;
