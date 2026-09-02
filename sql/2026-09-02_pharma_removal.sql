-- 🗑️ (٢ سبتمبر ٢٠٢٦) محمد: «شيل بقا الداتا كلها بتاعت مصانع الادوية دي
--    لانهم مش مهتمين».
--
-- ═══ قيست الخسارة الأول (قاعدة «اعرض الخسائر بالتحديد») ═══
--   ٨٦ إعلان منشور · ٨٦ صورة · ٢٦ اسم شركة عارضة · ٧ تصنيفات
--   **صفر استفسار · صفر أوردر** ← مفيش أي تفاعل عميل يضيع.
--
-- ═══ اللي اتكشف وقت التنفيذ ═══
--   الـ٨٦ إعلان كلهم كانوا على حساب **مضمونة** نفسها (supplier واحد)،
--   والـ٢٦ «شركة» كانوا `seller_display_name` على الإعلانات — **مش**
--   حسابات موردين. فمفيش أي حساب اتلمس، ومضمونة محتفظة بإعلاناتها الـ٢٢.
--
-- ═══ التنفيذ (على مرحلتين، كله راجع) ═══
--   ١) `_backup_pharma_removal_20260902` — id/title/status/seller_display_name
--      (RLS مفعّل · صفر صلاحية لـanon/authenticated).
--   ٢) `status='paused'` الأول ← اختفوا من السوق فورًا (رجوع بسطر واحد).
--   ٣) `delete` صف-صف ← تريجر `trg_listings_snapshot_before_delete`
--      بينزّلهم `listings_recycle_bin`. الاسترجاع: `restore_listing(id)`.
--      (صف-صف مش دفعة واحدة عشان فشل صف مايوقّعش الباقي — درس ٢/٩.)
--   ٤) تصنيفات `group_slug='pharma'` (٧) → `is_active=false` **مش مسح** —
--      نفس قاعدة «أي تصنيف وسيط مكرر بيتقفل مش بيتمسح».
--      ⚠️ ٥ من السبعة كانوا **مكررين** أصلًا مع أقسام الصناعة العامة
--      (معدات معامل · تغليف · ماكينات · خامات) — فقفلهم تنضيف كمان.
--
-- ═══ الأثر على قسم «شركات وصناعة» ═══
--   الصيدلاني كان **كل** محتوى التراك (٨٦ من ٨٦) → التراك بقى صفر منشور.
--   ✔️ اتراجع لايف: الهوم بيعرض القسم بشارة «قريبًا ✨» تلقائي،
--      و/marketplace?track=industry بيعرض «مفيش نتائج» نضيفة — مفيش كسر.
--   التصنيفات الباقية ١١ (industry-general ٦ + industry-services ٥) —
--   دي العامة القابلة لإعادة الاستخدام، فضلت شغالة لأي نشاط صناعي جديد.
--
-- 📊 إجمالي المنشور: ٥٤٠ → ٤٥٤.
--
-- ═══ الرجوع الكامل لو محمد غيّر رأيه ═══
--   select restore_listing(id) from _backup_pharma_removal_20260902;
--   update categories set is_active=true where group_slug='pharma';

create table if not exists _backup_pharma_removal_20260902 as
select l.id, l.title, l.status::text as old_status, l.seller_display_name,
       l.supplier_id, now() as saved_at
from listings l join categories c on c.id = l.category_id
where c.group_slug = 'pharma';
alter table public._backup_pharma_removal_20260902 enable row level security;
revoke all on public._backup_pharma_removal_20260902 from anon, authenticated;

update listings l set status = 'paused'
from categories c
where c.id = l.category_id and c.group_slug = 'pharma' and l.status = 'published';

do $$
declare r record; v_ok int := 0; v_skip int := 0;
begin
  for r in select l.id from listings l join categories c on c.id = l.category_id
           where c.group_slug = 'pharma'
  loop
    begin
      delete from listings where id = r.id;
      v_ok := v_ok + 1;
    exception when others then
      v_skip := v_skip + 1;   -- تريجرات النشر ممكن ترفض صف، الباقي بيكمل
    end;
  end loop;
  raise notice 'اتشال % · اتعدّى %', v_ok, v_skip;
end $$;

update categories set is_active = false where group_slug = 'pharma';
