-- 🛡️ (٣ سبتمبر ٢٠٢٦) محمد: «اربط الـ٢٢ اعلان بمورديهم الحقيقيين
--    ولو مفيش رقم وقف الاعلان».
--
-- ═══ الحالة وقت التنفيذ ═══
-- ١٨ من الـ٢٢ كانوا **اتربطوا فعلًا** بموردين حقيقيين قبل ما أبدأ
-- (عزازي ٧ عربيات · ليبيا · مي · مصطفى · حماده محمد · عقارات ميامي ·
--  أحمد سامي · صاحب الشاليهين · صاحب الموتوسيكل).
--
-- الـ٤ الباقيين: **ولا واحد فيهم له رقم مالك حقيقي**
--   • «عربيه بيجو»                  → مفيش رقم خالص
--   • «شقه مصطفى النحاس»            → الرقم رقم **عبير** (موظفة)
--   • «شقة ٢٠٠م مصر الجديدة»        → الرقم رقم **شهد** (موظفة)
--   • «استوديو ٦٠ م»                → الرقم رقم **شهد**، والمالك «محمد عربي»
-- رقم الموظفة = طريق تواصل، **مش ملكية** — وربطهم بشهد/عبير كان هيخلّي
-- موظفات مضمونة يبانوا بايعين. فاتوقفوا (`paused`) طبقًا لأمر محمد،
-- ونسخة في `_paused_no_owner_20260903` للرجوع بسطر واحد.
-- 📞 المطلوب من الفريق: أرقام ملّاك الأربعة دول، وبعدين يترفعوا تاني.
--
-- ═══ 🐞 الجذر: ليه الحساب اتلوّث ٣ مرات والحارس موجود ═══
-- الحارس `trg_block_listings_on_platform_owner` **موجود وموصّل من ٢١/٨**
-- (محمد وقتها: «مضمونة أكونت واحد ومش المفروض يكون لها إعلانات»)
-- ومع ذلك الحساب شفط ٢٢ إعلان جديد.
--
-- السبب: الحارس كان بيفحص `suppliers.is_platform_owner` **بس**،
-- ولمضمونة **حسابين** بنفس الاسم:
--     c8b7b9d7…  عنده صف في suppliers ومعلّم  → محمي  → صفر إعلانات
--     267e0655…  **مالوش صف في suppliers خالص** → مش محمي → شفط الـ٢٢
-- يعني الحارس كان بيحرس الباب الفاضي ١٢ يوم. (نفس مرض قاعدة ٤.٧:
-- جدولين موردين بنفس الـid، والصف ممكن يكون في واحد بس.)
--
-- ✅ الحارس بقى يفحص **الجدولين** — العلامة في أي واحد فيهم بتكفي.
-- ⚠️ وبقى يقع **بس** لما `supplier_id` يتحط أو يتغيّر، عشان الصيانة
--    العادية (إيقاف · تعديل سعر) على إعلان قايم ماتتقفلش في وشنا —
--    وده اللي كان هيمنعنا نوقف الأربعة أصلاً.
--
-- 🧪 اتجرّب بمحاولة حقيقية مش بالقراءة:
--    رمي على 267e0655 → ✅ اترفض · رمي على c8b7b9d7 → ✅ اترفض ·
--    صيانة عادية → ✅ عدّت.
--
-- 📊 النتيجة: صفر إعلان منشور على حساب مضمونة.

create table if not exists _paused_no_owner_20260903 as
select l.id, l.title, l.contact_phone, l.owner_name, l.status::text as old_status, now() as saved_at
from listings l where l.supplier_id = '267e0655-96d9-431e-bf12-b4c2cd58778a';
alter table public._paused_no_owner_20260903 enable row level security;
revoke all on public._paused_no_owner_20260903 from anon, authenticated;

update listings set status = 'paused'
where supplier_id = '267e0655-96d9-431e-bf12-b4c2cd58778a' and status = 'published';

create or replace function public.tg_block_listings_on_platform_owner()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
begin
  -- صيانة عادية على إعلان قايم (المورد ما اتغيّرش) بتعدّي
  if tg_op = 'UPDATE' and new.supplier_id is not distinct from old.supplier_id then
    return new;
  end if;
  if new.supplier_id is not null and (
       exists (select 1 from suppliers s
                where s.id = new.supplier_id and coalesce(s.is_platform_owner,false))
    or exists (select 1 from marketplace_suppliers ms
                where ms.id = new.supplier_id and coalesce(ms.is_platform,false))
  ) then
    raise exception 'مضمونة مالهاش إعلانات — الإعلان لازم يتربط بصاحبه الحقيقي (listing: %)', new.title;
  end if;
  return new;
end $function$;

-- الرجوع: update listings l set status=b.old_status
--           from _paused_no_owner_20260903 b where b.id=l.id;
