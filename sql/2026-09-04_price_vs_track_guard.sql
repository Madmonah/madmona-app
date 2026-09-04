-- 💰 (٤ سبتمبر ٢٠٢٦) محمد: «إزاي إيجار الوحدة بمليون ٣٥٠ ألف ومكتوب
--    الإيجار ٢٧٠٠٠؟» ← «انقلهم لأقسام البيع واعمل الحارس ده».
--
-- ═══ الغلطة الأصلية (غلطتي) ═══
-- «مدينتي» ليها ١٢ مسودة (نسخ حفظ تلقائي وصاحبها بيرفع الصور):
--     ١٤:٣٩:٣٠  ١٬٣٥٠٬٠٠٠   ← أول حفظة
--     ١٤:٣٩:٤١  ٢٧٬٠٠٠       ← صحّحها بعدها بـ١١ ثانية
--     … وفضلت ٢٧٬٠٠٠ في ١١ حفظة
-- أنا اخترت النسخة بـ**أعلى سعر** فمسكت الرقم اللي اتشال. الصح كان
-- **آخر** نسخة. اتصلح: السعر رجع ٢٧٬٠٠٠.
-- والتصنيف properties-studio = تراك **إيجار** — يعني ١٬٣٥٠٬٠٠٠ إيجار
-- استوديو رقم مالوش معنى من أساسه، وده اللي كان لازم يوقفني.
--
-- ═══ والفحص لقى ٤ تانيين بنفس المرض (مش من شغل النهاردة) ═══
--   فيلا                  ١٢٬٠٠٠٬٠٠٠  properties-villa      → sale-properties-villa
--   شقه ١٥٥م اسكندرية      ٧٬٥٠٠٬٠٠٠  properties-apartment  → sale-properties-apartment
--   اسكندريه ميامي         ٢٬٩٠٠٬٠٠٠  properties-apartment  → sale-properties-apartment
--   شقه اسكندريه           ٢٬٩٠٠٬٠٠٠  properties-apartment  → sale-properties-apartment
-- يعني اللي بيتفرّج على «إيجار» كان بيلاقي فيلا بـ١٢ مليون في الشهر.
-- اتنقلوا. نسخة الرجوع: `_backup_track_move_20260904`.
--
-- 👤 مين ضافهم: «اسكندريه ميامي» شهد · «شقه اسكندريه» عبير ·
--    والاتنين التانيين من الويزارد مباشرة (من غير موظف).
--    وعمومًا في قسم العقارات: عبير ١٢٤ إعلان · شهد ١٢٣ · الويزارد ٣٠.
--
-- ═══ الحارس ═══
-- `trg_guard_price_vs_track` بيمسك الاتجاهين **عند النشر بس**
-- (المسودة تفضل تتحفظ عادي عشان صاحب الإعلان يكمّل ويصحّح):
--   • سعر بيع في تراك إيجار  (> ٥٠٠ ألف)
--   • سعر إيجار في تراك بيع  (< ٥٠ ألف)
-- ⚠️ العقارات السياحية مستثناة من حد الإيجار — إيجار سنوي لشاليه ممكن
--    يعدّي ٥٠٠ ألف بشكل مشروع (فيه واحد فعلًا بـ٢٥٠ ألف).
-- والرسالة بتقول **الرقم والقسم والمطلوب**، مش «مرفوض» وخلاص.
--
-- 🧪 اتجرّب بمحاولات حقيقية على إعلان حي (واترجّع بعدها):
--   سعر بيع في إيجار → ✅ اترفض  ·  سعر إيجار في بيع → ✅ اترفض
--   إيجار سياحي ٢٥٠ ألف → ✅ عدّى  ·  إيجار ٢٧ ألف في إيجار → ✅ عدّى

create table if not exists _backup_track_move_20260904 as
select l.id, l.title, l.category_id as old_category_id, c.slug as old_slug,
       l.price_egp, now() as saved_at
from listings l join categories c on c.id=l.category_id
where c.track='rentals' and l.status='published' and l.price_egp > 500000;
alter table public._backup_track_move_20260904 enable row level security;
revoke all on public._backup_track_move_20260904 from anon, authenticated;

update listings l set category_id = sc.id
from _backup_track_move_20260904 b
join categories sc on sc.slug = 'sale-' || b.old_slug and sc.is_active
where l.id = b.id;

create or replace function public.tg_guard_price_vs_track()
 returns trigger language plpgsql security definer set search_path to 'public'
as $function$
declare
  v_track text; v_slug text;
  RENT_MAX constant numeric := 500000;
  SALE_MIN constant numeric := 50000;
begin
  if new.status <> 'published' then return new; end if;
  if new.price_egp is null or new.price_egp <= 0 then return new; end if;
  select c.track, c.slug into v_track, v_slug from categories c where c.id = new.category_id;
  if v_track is null then return new; end if;

  if v_track = 'rentals' and coalesce(v_slug,'') not like '%tourism%'
     and new.price_egp > RENT_MAX then
    raise exception 'النشر متوقف: السعر % ج كبير على قسم إيجار (%). لو ده سعر بيع، انقل الإعلان لقسم البيع المقابل (sale-%). ولو ده إيجار فعلًا، راجع الرقم.',
      to_char(new.price_egp,'FM999,999,999'), v_slug, v_slug;
  end if;

  if v_track = 'sales' and new.price_egp < SALE_MIN then
    raise exception 'النشر متوقف: السعر % ج صغير على قسم بيع (%). لو ده إيجار شهري، انقل الإعلان لقسم الإيجار المقابل. ولو ده سعر بيع فعلًا، راجع الرقم.',
      to_char(new.price_egp,'FM999,999,999'), v_slug;
  end if;
  return new;
end $function$;

drop trigger if exists trg_guard_price_vs_track on public.listings;
create trigger trg_guard_price_vs_track
  before insert or update of status, price_egp, category_id on public.listings
  for each row execute function public.tg_guard_price_vs_track();
