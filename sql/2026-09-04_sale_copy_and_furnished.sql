-- 🛋️ (٤ سبتمبر ٢٠٢٦) محمد بعد تيست نسخة الموبايل: «مفروش*» كان **مطلوب**
--    في شقة/فيلا/استوديو **للبيع**. ده حقل إيجار — المشتري بيشتري العقار
--    مش الفرش، والحقل كان بيوقف النشر من غير داعي.
--
-- الحقل نفسه فاضل موجود (المالك يقدر يقول «مفروشة» لو حب) — بس بقى
-- **اختياري** في تراك البيع. وفاضل **مطلوب** في الإيجار زي ما هو،
-- لأنه هناك سؤال جوهري.
--
-- قبل: rentals ٣ مطلوب · sales ٣ مطلوب
-- بعد: rentals ٣ مطلوب · sales ٣ اختياري

update attributes a
   set is_required = false
from categories c
where c.id = a.category_id
  and c.track = 'sales'
  and a.field_key in ('furnished','is_furnished')
  and a.is_required;
