-- 👥 (٣ سبتمبر ٢٠٢٦) محمد: «أنا كل ما أجي أضيف حد لازم ألاقي مشكلة».
--
-- مش حادثة — **تلات أعطال متراكبة** في نفس المسار، كل واحد لوحده
-- كفيل يمنع الإضافة. عشان كده كانت بتفشل كل مرة بشكل مختلف.
--
-- ═══ ١) 🏢 «فرع غير موجود» ═══
-- `admin_bulk_add_employees` أول سطر فيها:
--     IF v_branch_code IS NULL THEN RAISE EXCEPTION 'فرع غير موجود';
-- يعني إضافة أي موظف بتتطلب فرع. و`erp_provision_supplier` بتعمل شجرة
-- الحسابات (٣٠ حساب) بس **مابتعملش فرع رئيسي**.
-- 📊 **٣١٧ من ٣٢٦ مورد من غير أي فرع** = الإضافة مقفولة عند ٩٧٪،
--    و٦٧ منهم عندهم موظفين بالفعل (دخلوا بمسار تاني) ومش قادرين يزوّدوا.
-- ✅ backfill لكل الـ٣١٧ + `tg_erp_provision_new_supplier` بقت تعمل
--    الفرع الرئيسي مع كل بيزنس جديد.
--
-- ═══ ٢) 🔑 قيد فريد غلط على كود الفرع ═══
-- `supplier_branches_code_key` كان unique على `code` **لوحده** — يعني
-- بيزنس واحد بس في المنصة كلها يقدر يكون عنده فرع كوده HQ. أول ما
-- حاولنا نعمل الفروع الناقصة، اتصادم من التاني.
-- ✅ بقى `unique (supplier_id, code)` — كود الفرع معناه جوّه بيزنسه.
--
-- ═══ ٣) 🔢 الرقم السري بيتحسب بنطاق غير نطاق القيد ═══
-- القيد `uniq_emp_pin_per_supplier` **لكل بيزنس**، بس الحساب كان:
--     WHERE supplier_id = ... AND branch_id = p_branch_id
-- يعني بيدوّر على أكبر رقم **في الفرع بس**. فأي بيزنس موظفينه القدام
-- من غير فرع (**٦٩ موظف** في المنصة) أو في فرع تاني → الحساب يبدأ من
-- ١٠٠١ ويصطدم بموظف موجود:
--     duplicate key value violates unique constraint "uniq_emp_pin_per_supplier"
-- ✅ الحساب بقى على مستوى **البيزنس** زي القيد بالظبط، + حلقة بتدوّر
--    على أول رقم فاضي (سقف ٩٩٩) عشان أي فجوة أو تصادم نادر مايوقفش الإضافة.
--
-- 🧪 اتجرّب بإضافة حقيقية (واتمسحت بعدها):
--    محمود سالم → ✅ اتضاف · pin 1002 (بدل التصادم مع 1001)
--    ٥ بيزنسات موظفينها من غير فرع → ✅ نجح ٥ من ٥
--
-- ⚠️ ملاحظة مسيبها: أكواد الفروع في حساب البادئة (GOLF · HIJAB · BR4 ·
--    BR5) بقايا من صالون معيّن، وأي كود تاني بياخد البادئة ٩. تغييرها
--    هيحرّك أرقام موظفين قايمين — محتاج قرار منفصل.

-- ─── ٢) القيد ───
alter table public.supplier_branches drop constraint if exists supplier_branches_code_key;
drop index if exists public.supplier_branches_code_key;
create unique index if not exists supplier_branches_supplier_code_uq
  on public.supplier_branches (supplier_id, code);

-- ─── ١) الفروع الناقصة ───
insert into supplier_branches (supplier_id, name, code, status, phone)
select s.id,
       left(coalesce(nullif(btrim(s.business_name),''), 'البيزنس'), 60) || ' (الرئيسي)',
       'HQ', 'active', s.contact_phone
from suppliers s
where not exists (select 1 from supplier_branches b where b.supplier_id = s.id);

-- ─── ١ب) وكل بيزنس جديد ───
create or replace function public.tg_erp_provision_new_supplier()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  perform erp_provision_supplier(new.id);
  if not exists (select 1 from supplier_branches b where b.supplier_id = new.id) then
    begin
      insert into supplier_branches (supplier_id, name, code, status, phone)
      values (new.id,
              left(coalesce(nullif(btrim(new.business_name),''), 'البيزنس'), 60) || ' (الرئيسي)',
              'HQ', 'active', new.contact_phone);
    exception when others then null;  -- الفرع تحسين مش شرط لإنشاء المورد
    end;
  end if;
  return new;
end $function$;

-- ─── ٣) حساب الرقم السري: الملف الكامل في نداء الميجريشن اللايف ───
-- التغيير الجوهري: شيل `AND branch_id = p_branch_id` من حساب MAX،
-- وزوّد حلقة بتدوّر على أول pin فاضي على مستوى البيزنس قبل كل insert.

-- الفحص الدوري:
-- select count(*) from suppliers s
--  where not exists (select 1 from supplier_branches b where b.supplier_id=s.id);  -- لازم صفر
