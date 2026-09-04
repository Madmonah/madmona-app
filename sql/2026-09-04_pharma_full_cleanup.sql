-- 🗑️ (٤ سبتمبر ٢٠٢٦) محمد: «احنا المفروض مسحنا الداتا بتاعت معرض فارما
--    مش هنحتجها».
--
-- صح — ومسح ٢/٩ كان **ناقص**: شال الـ٨٦ إعلان وقفل التصنيفات، وساب:
--   • ٥١ صف في `exhibition_companies`
--   • ٥١ حساب مورد اتعملوا للمعرض
-- كلهم كانوا **فاضيين تمامًا**: صفر إعلانات · صفر أوردرات · صفر موظفين
-- · صفر استلام (claimed_at). فمفيش أي أثر تشغيلي بيضيع.
--
-- 🐞 وملاحظة على المحاولة الأولى: مسحت `exhibition_companies` **قبل**
--    اللوب اللي بيمسح الموردين، فالمصدر بقى فاضي واللوب لف على صفر صف —
--    والنتيجة إن الموردين فضلوا وأنا فاكر إنهم اتشالوا. الفحص بعد التنفيذ
--    هو اللي كشفها (٥١ لسه موجودين). الترتيب الصح: امسح من النسخة
--    المحفوظة مش من الجدول اللي بتمسحه.
--
-- ═══ الرجوع ═══
--   _backup_pharma_companies_20260904  (الـ٥١ صف بالكامل)
--   _backup_pharma_suppliers_20260904  (الـ٥١ حساب مورد بالكامل)
--   _backup_pharma_removal_20260902    (الـ٨٦ إعلان — من مسح ٢/٩)
--   كلهم RLS مفعّل وصفر صلاحية لـanon.
--
-- 📊 بعد التنفيذ: صفر شركات معارض · صفر من موردي فارما ·
--    الموردين ٣٢٨ → ٢٧٧ · المنشور ٤٥٢ (ما اتأثرش).

create table if not exists _backup_pharma_companies_20260904 as
select * from exhibition_companies where event='pharmaconex-2026';
alter table public._backup_pharma_companies_20260904 enable row level security;
revoke all on public._backup_pharma_companies_20260904 from anon, authenticated;

create table if not exists _backup_pharma_suppliers_20260904 as
select * from suppliers where id in
  (select supplier_id from exhibition_companies where event='pharmaconex-2026' and supplier_id is not null);
alter table public._backup_pharma_suppliers_20260904 enable row level security;
revoke all on public._backup_pharma_suppliers_20260904 from anon, authenticated;

delete from exhibition_companies where event='pharmaconex-2026';

-- ⚠️ من **النسخة المحفوظة** مش من الجدول المتمسوح
do $$
declare r record;
begin
  for r in select distinct supplier_id as id from _backup_pharma_companies_20260904 where supplier_id is not null loop
    begin
      delete from marketplace_suppliers where id = r.id;
      delete from suppliers where id = r.id;
    exception when others then null;   -- صف عليه شغل يفضل، الباقي يكمل
    end;
  end loop;
end $$;
