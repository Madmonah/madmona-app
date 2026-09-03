-- 🏢 (٣ سبتمبر ٢٠٢٦) محمد: «اتأكد من أكونت أستاذ محمود بيفتح الإدارة
--    الكاملة» ← «بيفتح صفحة اسمها إدارة بيزنسك مفيهاش أي صلاحيات ولا إضافة».
--
-- ═══ حاجزين مع بعض ═══
--
-- ١) **البلاسهولدر اتنسخ في supplier_admins** (داتا)
--    صف الأونر بتاعه كان phone = 'oauth:5df429ae-…' — نفس بلاسهولدر
--    دخول جوجل. فحتى بعد ما وثّقنا رقمه الحقيقي، الحارس بيقارن
--    phone_core('+201222203004') بـphone_core('oauth:…') = رقم وهمي
--    من ١٧ خانة، ومايطابقش.
--    📊 **١٣ صاحب بيزنس نشط** كانوا كده — كلهم مقفول في وشهم لوحتهم هم.
--    الـuuid جوّه البلاسهولدر هو نفسه profile_id، فالرقم اترجّع منه.
--    بعد الإصلاح: ١٢ فاضلين (بروفايلهم لسه من غير رقم حقيقي).
--
-- ٢) **AdminGuard كان بيقفلها قبل أي حارس تاني** (واجهة)
--    حارس ٢٨/٨ بيسأل سؤال واحد: «هو موظف مضمونة؟» وأي حد غيره يتقذف
--    على «دي لوحة فريق مضمونة — نظام إدارة بيزنسك في مكان تاني».
--    بس **لوحة البيزنس نفسها عايشة تحت /admin**، وحارس الصفحة الداخلي
--    (admin_check_finance_access) بيدعم `business_admin` صراحةً،
--    والميدلوير أصلاً بيستثني المسار ده من ٢١/٨.
--    يعني تلات طبقات بتقول «اسمحله» وطبقة رابعة بترميه.
--    ✅ AdminGuard بقى يسمح لصاحب البيزنس بمسار **بيزنسه هو** بس
--       (my_supplier_access: full/is_owner/is_staff)؛ أي شاشة تانية
--       تحت /admin تفضل لفريق مضمونة بس.
--
-- 🧪 اتجرّب بجلسة محمود الحقيقية (مش بالقراءة):
--    admin_check_finance_access → {"role":"business_admin","allowed":true,"readonly":false}
--    my_supplier_access        → {"full":true,"is_owner":true,"source":"owner"}
--    (جلسة الاختبار اتمسحت بعدها)

update supplier_admins sa
set phone = p.phone
from profiles p
where sa.phone like 'oauth:%'
  and p.id::text = replace(sa.phone, 'oauth:', '')
  and p.phone is not null and p.phone not like 'oauth:%';

update business_employees be
set phone = p.phone
from profiles p
where be.phone is null and be.auth_user_id = p.id
  and p.phone is not null and p.phone not like 'oauth:%';

-- الفحص الدوري: لازم يفضل صفر عند اللي بروفايلهم فيه رقم حقيقي
-- select count(*) from supplier_admins where active and phone like 'oauth:%';
