-- 🚪 (٣ سبتمبر ٢٠٢٦) محمد: «اقفلي حسابات الموظفين اللي عندي».
--
-- اتعرضت الخيارات الأول (إجراء بيقفل الدخول فعليًا و٤ منهم كانوا بصموا
-- في نفس اليوم)، ومحمد اختار:
--   النطاق: **الفريق بس** — من غيره ومن غير أحمد سامي
--   النوع : **إنهاء خدمة** — نفس اللي اتعمل مع سامية ونورا يوم ٢/٩
--
-- الخمسة: ايمان محمد · شهد محمد · عبير ايهاب · مديحة عبدالفتاح ·
--          محمد عبدالجابر (الأوفيس بوي)
--
-- ═══ الخسائر اتقاست قبل التنفيذ ═══
--   ٣٧٥ إعلان ضافوهم · ٥٩٥ تاسكة · ٦٣ يوم حضور · ١٨ جلسة مفتوحة
--   ⚠️ كلها **اتحفظت** — الإنهاء بيقفل الوصول ومابيمسحش الأثر
--      (نفس مبدأ ٤.٨). الحذف النهائي كان هيفصل الإعلانات عن اللي
--      ضافها ويضرب حساب العمولة والمرتب بأثر رجعي.
--
-- ═══ الأبواب اللي اتقفلت مع بعض (قاعدة ٣: «بابين مش باب واحد») ═══
--   ١) business_employees.status = 'terminated'   ← هوية التطبيق
--   ٢) permissions = '{}'                          ← لو الحالة اتفتحت غلط
--   ٣) madmona_sessions اتلغت (١٨ جلسة)            ← الجلسات المفتوحة
--   ٤) platform_admins اتشال (٤ صفوف)              ← باب لوحة /admin
--   ٥) crm_staff_settings: receives_leads=false و is_dispatcher=false
--
-- ═══ التحقق بعد التنفيذ ═══
--   الخمسة: terminated · permissions={} · صفر جلسة · صفر باب لوحة
--   ماتلمسوش: محمد ناصف (owner · ٢٤ جلسة) · أحمد سامي (admin · ١١ جلسة)
--
-- ⚠️⚠️ **أثر تشغيلي كبير — محتاج قرار محمد:**
--   **٤٬٦١٤ رقم CRM لسه شغّال** بقى من غير مندوب:
--       مديحة ١٬٦٢٩ · شهد ١٬٢٥٠ · عبير ١٬٢٤٧ · ايمان ٤٨٨
--   ضيفهم لـ٣٩٥ بتوع نورا = **٥٬٠٠٩ رقم محدش هيكلّمهم**.
--   لازم يتحدد مين ياخدهم وتتنقل ليه، وإلا الليدز دي بتقف.
--
-- ═══ الرجوع ═══
--   _backup_terminated_20260903        (الحالة والصلاحيات قبل الإنهاء)
--   _backup_terminated_admins_20260903 (صفوف platform_admins المتشالة)
--   كلهم RLS مفعّل وصفر صلاحية لـanon.
--   الرجوع: update business_employees be set status=b.old_status,
--             permissions=b.old_permissions
--             from _backup_terminated_20260903 b where be.id=b.id;
--           + insert back from _backup_terminated_admins_20260903

create table if not exists _backup_terminated_20260903 as
select be.id, be.full_name, be.phone, be.status::text as old_status,
       be.permissions as old_permissions, now() as saved_at
from business_employees be
join suppliers s on s.id=be.supplier_id and coalesce(s.is_platform_owner,false)
where be.full_name in ('ايمان محمد احمد محمد','شهد محمد عبدالحكيم','عبير ايهاب',
                       'مديحة عبدالفتاح','محمد غبدالجابر عبدالحمد');
alter table public._backup_terminated_20260903 enable row level security;
revoke all on public._backup_terminated_20260903 from anon, authenticated;

create table if not exists _backup_terminated_admins_20260903 as
select pa.* from platform_admins pa
where phone_core(pa.phone) in (
  select phone_core(b.phone) from _backup_terminated_20260903 b where b.phone is not null);
alter table public._backup_terminated_admins_20260903 enable row level security;
revoke all on public._backup_terminated_admins_20260903 from anon, authenticated;

update business_employees be set status = 'terminated', permissions = '{}'::jsonb
  from _backup_terminated_20260903 b where be.id = b.id;

delete from madmona_sessions s using madmona_accounts a, _backup_terminated_20260903 b
 where a.id = s.account_id and b.phone is not null
   and phone_core(a.phone_normalized) = phone_core(b.phone);

delete from platform_admins pa using _backup_terminated_20260903 b
 where b.phone is not null and phone_core(pa.phone) = phone_core(b.phone);

update crm_staff_settings c set receives_leads = false, is_dispatcher = false, updated_at = now()
  from business_employees be, _backup_terminated_20260903 b
 where be.id = b.id and c.profile_id = be.auth_user_id;
