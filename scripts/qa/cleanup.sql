-- 🧹 تنضيف حسابات الاختبار اليومي (١٨/٩/٢٠٢٦ — محمد: «وبعدين تمسح الحساب»)
-- الشرط الوحيد اللي بيحدد الحساب: اسم الشركة بيبدأ بـ«QA » **و** الرقم في نطاق
-- الاختبار 01999 88xxxx. ⚠️ ماتوسّعش الشرط — في حسابات حقيقية اسمها فيه dev-
-- (مثال arqa-development-group) وماتتمسحش.
-- التشغيل: من SQL Editor أو execute_sql. بيرجّع الباقي (لازم يطلع صفر).
begin;

create temp table _qa_sup on commit drop as
select id, contact_phone from public.suppliers
 where business_name ilike 'QA %' and contact_phone like '01999%';

create temp table _qa_usr on commit drop as
select u.id from auth.users u
 where u.email ~ '^2019998[0-9]{5}@madmonacairo\.com$';

-- ١) كل اللي متعلّق بالشركة
delete from public.listing_photos where listing_id in (select id from public.listings where supplier_id in (select id from _qa_sup));
delete from public.listings              where supplier_id in (select id from _qa_sup);
delete from public.inventory_products    where supplier_id in (select id from _qa_sup);
delete from public.services_catalog      where supplier_id in (select id from _qa_sup);
delete from public.business_employees    where supplier_id in (select id from _qa_sup);
delete from public.supplier_branches     where supplier_id in (select id from _qa_sup);
delete from public.marketplace_suppliers where id          in (select id from _qa_sup);
delete from public.suppliers             where id          in (select id from _qa_sup);

-- ٢) الجلسات والهوية
delete from public.madmona_sessions where account_id in (
  select id from public.madmona_accounts where phone_normalized ~ '^2019998[0-9]{5}$');
delete from public.madmona_accounts where phone_normalized ~ '^2019998[0-9]{5}$';
delete from public.wa_inbound_verifications where phone ~ '2?0?1999 ?8[0-9]{6}$';

-- ٣) الحساب نفسه
delete from public.profiles  where id in (select id from _qa_usr);
delete from auth.users       where id in (select id from _qa_usr);

commit;
