-- =====================================================================
-- 🔴 إصلاح أمني حرج — جدول suppliers
--
-- المشكلة: أي حد معاه المفتاح العام (موجود في كود الموقع = أي زائر)
-- كان يقدر يقرا:
--   password_hash, payout_details, payout_method,
--   commission_rate, commission_extra_rate, contact_phone, contact_email
--
-- الإصلاح: منع الأعمدة دي عن anon فقط.
-- المسجّلين (أدمن/مالك) مش هيتأثروا — كل صفحات business-finance و owner
-- بتشتغل بجلسة مسجّلة، فهتفضل شغالة عادي.
--
-- ✅ عكسه سهل: GRANT SELECT (...) ON public.suppliers TO anon;
-- ✅ مفيش حذف بيانات — صلاحيات بس
-- =====================================================================

-- ١) امنع الأعمدة الحساسة عن الزوار
revoke select (
  password_hash,
  payout_details,
  payout_method,
  commission_rate,
  commission_extra_rate,
  contact_phone,
  contact_email
) on public.suppliers from anon;

-- ٢) اتأكد إن المسجّلين لسه شايفين كل حاجة
grant select on public.suppliers to authenticated;

-- =====================================================================
-- ٣) marketplace_suppliers — أخطر من الأول
--    ١٤٦ صف مكشوف للزوار، ٤ منهم فيهم رقم قومي فعلي.
--    الرقم القومي مستحيل يكون كشفه مقصود.
-- =====================================================================

revoke select (national_id, commission_rate) on public.marketplace_suppliers from anon;
grant select on public.marketplace_suppliers to authenticated;

-- =====================================================================
-- ملاحظة على listings:
--   ١٦٤ إعلان بتليفون مكشوف — ده على الأغلب **مقصود** (الإعلان محتاج
--   وسيلة تواصل). سايبه زي ما هو.
--   لو عايز تخفيه، الأنضف إنك تعمل view عام من غير التليفون وتخلي
--   الرقم يظهر بعد تسجيل الدخول بس.
-- =====================================================================

-- =====================================================================
-- للتحقق بعد التنفيذ:
--
--   select column_name, privilege_type
--   from information_schema.column_privileges
--   where table_name = 'suppliers' and grantee = 'anon'
--   order by column_name;
--
-- المتوقع: الأعمدة السبعة اللي فوق مش موجودة في النتيجة.
-- =====================================================================
