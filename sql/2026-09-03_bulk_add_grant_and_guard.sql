-- 👥 (٣ سبتمبر ٢٠٢٦) محمد: «جرّب تضيف موظف عند محمود من الشاشة نفسها
--    نسخة الموبايل» → «لا انا عايزك تتأكد انت من الواجهة».
--
-- جرّبتها من الواجهة فعلًا (توكن جلسة حقيقي · viewport موبايل) — فطلع
-- **خامس عطل** ماكانش يظهر خالص من الداتابيز:
--     permission denied for function admin_bulk_add_employees
--
-- ═══ ليه ماظهرش قبل كده ═══
-- الدالة مالهاش GRANT لـ`anon`، والمستخدم الداخل بتوكن الواتساب دوره
-- **anon**. وأنا كنت بجرّبها من لوحة Supabase بدور `postgres` — وهو
-- **بيتخطى الـGRANTs**. ده فخ قاعدة ٤.٦ بالحرف («الفحص من لوحة
-- Supabase بيتم بدور postgres وبيتخطى الصلاحيات») — ووقعت فيه،
-- وقلت «اتصلح» وهي مكسورة على الواجهة.
-- 📌 الدرس: بعد أي إصلاح على دالة بتتنادى من المتصفح، **الفحص من
--    الواجهة نفسها** مش من لوحة الداتابيز.
--
-- ═══ ⛔ وليه GRANT لوحده كان غلط ═══
-- الدالة كانت **من غير أي فحص صلاحية جوّاها** — بتـinsert على طول.
-- يعني فتح anon كان معناه إن أي حد معاه المفتاح العام (وهو في كود
-- الموقع) يقدر يضيف موظفين لأي بيزنس في المنصة.
--
-- ✅ العلاج بالترتيب الصح:
--   ١) حارس البابين جوّه الدالة: `schedule_edit_ok(p_supplier_id, p_token)`
--      — نفس القاعدة المكتوبة: «أي RPC لشاشة جوّه اللوحة لازم تقبل
--      p_token وتفحص بـschedule_edit_ok» (كوكي الأدمن + توكن الواتساب).
--   ٢) بعدين GRANT execute لـanon/authenticated.
--   ٣) الواجهة بتبعت p_token من `readMadmonaToken()`.
--
-- ⚠️ فخ الأوفرلود (قاعدة الداتابيز ٢): زيادة `p_token` بـDEFAULT عملت
--    دالة **تانية** — النسخة التلاتية اتمسحت، فضلت نسخة واحدة.
--
-- 📌 لسه محتاجين نفس المعالجة (مالهمش GRANT لـanon):
--    `admin_move_employee_branch` · إحدى نسختين `admin_update_employee_contact`

-- الدالة الكاملة بحارسها في نداء الميجريشن اللايف. الجوهر:
--   if not public.schedule_edit_ok(p_supplier_id, p_token) then
--     raise exception 'مالكش صلاحية تضيف موظفين للبيزنس ده';
--   end if;

drop function if exists public.admin_bulk_add_employees(uuid, uuid, jsonb);
grant execute on function public.admin_bulk_add_employees(uuid, uuid, jsonb, uuid)
  to anon, authenticated;

-- الفحص:
-- select pg_get_function_arguments(p.oid), has_function_privilege('anon', p.oid, 'EXECUTE')
--   from pg_proc p join pg_namespace n on n.oid=p.pronamespace
--  where n.nspname='public' and p.proname='admin_bulk_add_employees';
