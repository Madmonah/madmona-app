-- 👥 (٢ سبتمبر ٢٠٢٦) محمد: «افتح صلاحيات الفريق لنورا وعبير وشهد».
--
-- ═══ البابين اتفحصوا الاتنين (قاعدة ٣) ═══
-- الباب التاني (platform_admins) كان **مفتوح عندهم أصلًا** بدور staff —
-- اتأكدت قبل التعديل عشان مانفتحش باب ونسيب التاني. فالناقص كان الباب
-- الأول بس: business_employees.permissions.
--
-- ═══ اللي اتفتح ═══
--   can_manage_team     = true
--   can_manage_branches = true
--
-- ⛔ **الفلوس والتسعير ماتلمسوش** — can_view_finance و can_manage_pricing
--    فاضلين false. القاعدة بتقول ماينفتحوش إلا بأمر صريح، ومحمد طلب
--    «صلاحيات الفريق» بالتحديد.
--
-- ═══ اتجرّب بجلستهم الحقيقية مش بالقراءة (درس ٢٥/٨) ═══
--   نورا · عبير · شهد → madmona_mgr_employees ok=true · ٩ موظفين
--                       · madmona_mgr_attendance ok=true
--   النطاق = 'branch'، والفريق كله (٩) في فرع واحد
--   («مضمونة - مصر الجديدة») فبيشوفوا الكل. لو اتفتح فرع تاني،
--   هيشوفوا فرعهم بس — وده سلوك مناسب لمستوى staff، ويتوسّع بأمر محمد.
--
-- ═══ الرجوع ═══
--   _backup_team_perms_20260902 (id · full_name · permissions قبل التعديل)
--   RLS مفعّل وصفر صلاحية لـanon.
--
-- ⚠️ **لقطة اتكشفت أثناء التنفيذ — محتاجة قرار محمد (مااتغيّرتش):**
--   إيمان  → can_view_finance = **true**
--   مديحة → can_view_finance = **true** و can_manage_pricing = **true**
--   بينما القاعدة المكتوبة: «نورا · مديحة · عبير · شهد · ايمان · سامية
--   عندهم صلاحيات الأدمن الكاملة **ما عدا الفلوس والتسعير**
--   (can_view_finance / can_manage_pricing = false لحد أمر صريح)».
--   يعني الاتنين دول مفتوح عندهم أكتر من القاعدة. مالمستهاش لأنها فلوس.

update business_employees
   set permissions = coalesce(permissions,'{}'::jsonb) || jsonb_build_object(
         'can_manage_team', true,
         'can_manage_branches', true
       )
 where status='active' and employee_type='human'
   and full_name in ('نورا محمد','عبير ايهاب','شهد محمد عبدالحكيم');
