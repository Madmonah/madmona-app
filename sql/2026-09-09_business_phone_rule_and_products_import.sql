-- 📵📥 (٩/٩/٢٠٢٦ — آخر الليل) مطبّق لايف: publish_no_phone_check_for_business_accounts · business_products_import
-- محمد: «صاحب البيزنس عنده حساب وليه رقم — مفيش داعي نطلب رقم علشان ننشر إعلان من كتالوجه» +
--       «تاب استيراد إكسيل للمنتجات علشان مايضفش واحد واحد».
--   enforce_listing_publish_requirements: لو المورد ليه حساب (marketplace_suppliers.profile_id / suppliers.auth_user_id)
--   ورقمه موجود → contact_phone = رقم صاحبه · phone_verified_source = 'business_account' (اتجرّب: إعلان لمورد
--   من غير أي إعلان موثّق → published بـbusiness_account).
--   business_products_import(p_supplier_id, p_rows jsonb, p_token): upsert بالاسم أو SKU · item_class بالعربي
--   (خامة/مستهلك) أو الإنجليزي · الحد ٢٠٠٠ صف. اتجرّب: ٢ جديد + ١ تحديث + ١ من غير اسم اتعدّى.
select 1;
