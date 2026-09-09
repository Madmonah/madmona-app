-- (٩/٩/٢٠٢٦) محمد:
--  • «حساب البيزنس يفتح لموظف واحد فقط بدل ٥ (صاحب البيزنس + موظف واحد فقط)»
--  • «ليه تاب للعهد والسلف والمشتريات الخاصة بيه علشان تتسوي في العهدة… مش عايز أي تداخل»
-- مطبّق لايف ٩/٩/٢٠٢٦ — التعريفات الكاملة في الداتابيز؛ ده ملخّص للرجوع.
--
-- ١) حد الموظفين: trg_enforce_employee_cap بيعدّ الصفوف النشطة (بما فيها المالك) →
--    max_employees = 2 لكل الموردين (٣٢٣) و50 لبيزنس مضمونة نفسه. الافتراضي في التريجر بقى ٢.
update marketplace_suppliers set max_employees = 2 where id <> 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d';
update marketplace_suppliers set max_employees = 50 where id = 'c8b7b9d7-6178-4d0c-abdf-66f34b628e9d';
-- ٢) my_custody_ledger(p_supplier_id): عهدتي (custody_items) + سلفي (employee_advances) +
--    مشترياتي الشهر (branch_expenses category='custody_purchase' metadata.employee_id) — للموظف نفسه بس.
-- ٣) employee_custody_purchase(p_supplier_id, p_custody_id, p_amount, p_title, p_vendor):
--    مصروف category='custody_purchase' (recorded_by = auth.uid، metadata.custody_id/employee_id)
--    + custody_items.cash_spent += المبلغ. بيرفض لو المبلغ أكبر من المتبقي أو العهدة مش باسمه/مش نقدية/مش مفتوحة.
-- الواجهة: CustodyCard في src/app/account/work/page.tsx (للأوفيس بوي) + RequestForm kinds=['advance','custody'].
