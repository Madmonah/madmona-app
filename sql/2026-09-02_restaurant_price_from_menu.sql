-- 🍽️ (٢ سبتمبر ٢٠٢٦) ٢٢ مطعم منشور من غير أي سعر ظاهر — الكارت بيطلع
--    من غير رقم خالص، بينما **منيوهم فيه أسعار حقيقية** (من ٢٧٢ صنف
--    لصنفين، وكلهم عندهم أرخص صنف).
--
-- ⛔ مش اختراع سعر: الرقم ده **سعر المطعم نفسه** لأرخص صنف في منيوه،
--    وبيتعرض «يبدأ من X ج.م» — نفس اللي بيحصل مع باقي المطاعم أصلًا.
--
-- ⚠️ أول محاولة وقعت: تحديث price_egp بيشغّل enforce_listing_content_minimums
--    اللي بيعيد التحقق من المحتوى، وإعلان واحد («سلسلة مطاعم دنيا
--    الجمبري») صوره كلها بلايس-هولدر فرفض — والدفعة كلها وقعت معاه.
--    الحل: صف بصف، واللي يرفض يتسجّل في _food_price_skipped_20260902
--    ويتعدّى.
--
-- ═══ النتيجة ═══
--   ٢٧ من ٢٨ مطعم منشور بقى ليهم سعر ظاهر · واحد بس اتعدّى (صوره
--   بلايس-هولدر — والرفض ده **صح**، الإعلان محتاج صور حقيقية).
--
-- ═══ المنع الدائم ═══
--   trg_listing_price_from_menu على restaurant_menu_items: أي صنف
--   يتضاف/يتعدّل سعره والإعلان الأم من غير سعر → بياخد أرخص صنف.
--   لو عليه سعر متحطّ بالإيد مايتلمسش — مفيش عراك مع التاجر.
--   والاستثناء بيبلع رفض حراس المحتوى فمايوقّفش حفظ الصنف نفسه.
--
-- الرجوع: _backup_food_price_20260902 (id · price_egp · price_on_request)

create or replace function public.tg_listing_price_from_menu()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare v_min numeric; v_listing uuid;
begin
  v_listing := coalesce(new.listing_id, old.listing_id);
  if v_listing is null then return coalesce(new, old); end if;

  select min(price) into v_min from restaurant_menu_items
   where listing_id = v_listing and coalesce(price,0) > 0;

  if v_min is not null then
    begin
      update listings
         set price_egp = v_min
       where id = v_listing
         and coalesce(price_egp,0) = 0
         and coalesce(price_on_request,false) = false;
    exception when others then
      null;
    end;
  end if;
  return coalesce(new, old);
end $function$;

drop trigger if exists trg_listing_price_from_menu on public.restaurant_menu_items;
create trigger trg_listing_price_from_menu
  after insert or update of price on public.restaurant_menu_items
  for each row execute function public.tg_listing_price_from_menu();
