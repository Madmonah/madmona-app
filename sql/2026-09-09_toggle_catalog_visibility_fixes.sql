-- 🐞 (٩/٩/٢٠٢٦ — آخر الليل) النشر من الكتالوج للسوق كان مستحيل — ٣ أسباب اتصلحوا (ميجريشنات:
-- toggle_catalog_visibility_fix_category_pick · toggle_catalog_visibility_draft_then_publish_with_photo · catalog_rpcs_reject_null_supplier):
--   ١) `order by sort_order` على categories والعمود مش موجود → خطأ في أول نشر لأي صنف.
--      التصنيف بقى: تصنيف آخر إعلان منشور للمورد، وإلا أول تصنيف رئيسي نشط في التراك.
--   ٢) الإعلان كان بيتعمل published من غير صور → enforce_listing_content_minimums بيرفض.
--      دلوقتي: الصنف لازم له صورة (رسالة واضحة) → إعلان draft → الصورة بتتزامن → published.
--   ٣) catalog_supplier_ok: الدوال الجديدة بترفض supplier فاضي (schedule_edit_ok(NULL) كانت true للأدمن).
-- 🧪 اختبار بجلسة محمد على «رويال إستيت (نموذج)»: منتج بصورة → toggle → listing published + الصورة
--    الرئيسية catalog-image + تصنيف sale-furniture-home. اتمسح بعده.
select 1;
