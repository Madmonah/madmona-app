-- ============================================================================
-- ٢١ أغسطس ٢٠٢٦ — (١) مضمونة أكونت واحد ومالهاش إعلانات  (٢) سبب الرفض
-- ============================================================================
-- محمد: «يا عم الحج مضمونة أكونت واحد ومش المفروض يكون لها إعلانات»
--        «وعايزين سبب للإعلانات المرفوضة»
--
-- ============================ (١) مضمونة =====================================
-- الحالة اللي اتلقت: **تلات حسابات** لمضمونة، مش اتنين:
--   c8b7b9d7  «مضمونة»                    is_platform_owner ✅  ٠ إعلان
--   9da8212a  «MADMONA»                    marketplace       ❌  ٢٠ إعلان
--   7310f6ef  «مضمونة — وكيل الليستنجات»   b2b               ❌  ١ إعلان
--
-- 🔍 السبب الجذري (ده أهم سطر في الملف):
--    حساب «مضمونة» الرسمي **مالوش صف في `marketplace_suppliers`** — موجود
--    في `suppliers` بس. و`listings.supplier_id` عليه FK على
--    `marketplace_suppliers`، يعني الإعلان **ماكانش يقدر أصلًا** يتربط
--    بحساب مضمونة الرسمي. فاتعمل حساب ماركتبليس تاني اسمه «MADMONA»،
--    و`profile_id` بتاعه كان **بروفايل محمد الشخصي** — وبقى هو المكان
--    اللي أي إعلان مالوش صاحب بيتحط فيه.
--    عشان كده الحساب اتنضّف تلات مرات ورجع يتلوّث (١٤٣ → ٨ → ٢٠).
--
-- اللي اتعمل:
--   • الـ٢١ إعلان اتوزّعوا على أصحابهم الحقيقيين:
--       - ٥ اتنقلوا لحسابات موجودة اتأكدنا منها بالرقم أو بالنص:
--           سابا باشا ٢٢٥م          → Abdelrhman Kamal - Re/Max Professional
--           عيادة Tri Hub ٤٨م       → Qawafil Developments
--             (الوصف نفسه بيقول «Tri Hub **by Qawafil Developments**»)
--           Veni Mall               → Raneem Khalifa (هي اللي بعتته:
--             property_market_items.source_lead_phone = +201156811353)
--           فرصة استثمارية فندقية    → Mary Gamil (source_name = 201122655156@c.us)
--           + المكرر رجع لأصحابه
--       - ١٠ اتعملهم حسابات باسم الإعلان (قاعدة محمد: «الباقي اعمل أكونت
--         باسم الإعلان»): Al Khal · Blaze Cafe · Fish Fish · Second Cup ·
--         الأمين للتوريدات · مسمط ولعه · غسيل نادي الشمس · كافيه روومز ·
--         شقة الرحاب · شقة ٢٠٧م أكتوبر · جاردنز بلازا
--       - ٤ مكرر اترفضوا بسبب مكتوب ورجعوا لأصحابهم الحقيقيين
--       - ٢ (كومبو سوشي) اترفضوا: مجهولين المالك، واتحطوا في حساب
--         «إعلانات مجهولة المالك — تحت المراجعة» (مش مضمونة)
--   • الدمج: MADMONA اتمسح بالكامل، ومضمونة بقى لها صف `marketplace_suppliers`
--     بحساب خدمة (مش بروفايل محمد الشخصي).
--   • «جروب شركة MADMONA» اترمى بعد ما رسايله (٢) اتنقلت لجروب مضمونة —
--     فبقى جروب مضمونة **واحد** زي ما محمد شاف واشتكى.
--
-- ⚠️ «وكيل الليستنجات» **ماتمسحش**: عليه قيدين محاسبيين مرحّلين (قيد اختبار
--    وعكسه) و`erp_guard_posted`/`erp_guard_posted_lines` بيرفضوا المسح أو
--    التعديل — **وده صح مش باج**. فاتقفل واتسمّى «أرشيف — وكيل الليستنجات
--    القديم (مقفول)» و status='suspended' عشان مايبانش كأنه مضمونة تانية.
--    لو محمد عايز يمسحه خالص لازم القيدين يتشالوا الأول بقرار منه.
--
-- 🛡️ والأهم: القاعدة بقت **متطبّقة في الداتابيز**، مش تنضيف بيتكرر —
--    `trg_block_listings_on_platform_owner` بترفض أي إعلان يتربط بحساب
--    عليه is_platform_owner، إدخال أو تعديل. جرّبناها: النقل لمضمونة
--    بيترفض برسالة عربية، والنقل لأي حساب تاني بيعدّي عادي.
--
-- باك أب: `_backup_madmona_listings_20260821` · `_backup_madmona_merge_20260821`
--
-- ======================= (٢) سبب الإعلانات المرفوضة ==========================
-- المشكلة: **مفيش خانة سبب في الجدول أصلًا**. ٣ إعلانات مرفوضة من شهرين
-- ومحدش يعرف ليه — لا صاحب الإعلان ولا احنا. ولما يسأل «ليه اتشال؟»
-- مكانش عندنا إجابة.
--
--   • listings.rejection_reason / rejected_at / rejected_by
--   • admin_bulk_set_status بقى ياخد p_reason، و**بيرفض** الرفض من غيره
--   • التوقيع القديم (ids,status) سايبينه شغّال للنشر/الإيقاف، وبيحوّل على
--     الجديد — فالرفض من واجهة قديمة بيرجع «لازم تكتب سبب الرفض»
--   • admin_listings_search بيرجّع السبب والتاريخ
--   • الـ٣ القدام اتحطلهم سبب صادق: «السبب مش مسجّل — اترفض قبل ما نضيف
--     خانة السبب». مااخترعناش سبب مانعرفهوش.
--
-- ⚠️ مافيش DEFAULT على p_reason عن قصد: مع DEFAULT بيبقى فيه لبس بين
--    (uuid[],text) و(uuid[],text,text) وأي نداء من جوّه الداتابيز بيرمي
--    "function is not unique". PostgREST بيختار بالأسماء فمش مشكلة عنده.
--
-- النسخ الكاملة للدوال موجودة في الداتابيز — الملف ده توثيق للقرارات
-- والأسباب، مش سكريبت يتشغّل تاني.
-- ============================================================================

-- 🛡️ الحارس الدائم
CREATE OR REPLACE FUNCTION public.tg_block_listings_on_platform_owner()
 RETURNS trigger
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM suppliers s
              WHERE s.id = NEW.supplier_id AND coalesce(s.is_platform_owner,false)) THEN
    RAISE EXCEPTION 'مضمونة مالهاش إعلانات — الإعلان لازم يتربط بصاحبه الحقيقي (listing: %)', NEW.title;
  END IF;
  RETURN NEW;
END $function$;

DROP TRIGGER IF EXISTS trg_block_listings_on_platform_owner ON public.listings;
CREATE TRIGGER trg_block_listings_on_platform_owner
BEFORE INSERT OR UPDATE OF supplier_id ON public.listings
FOR EACH ROW EXECUTE FUNCTION public.tg_block_listings_on_platform_owner();

-- 🚫 خانات سبب الرفض
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS rejection_reason text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid REFERENCES profiles(id) ON DELETE SET NULL;

-- 🏷️ حساب بيزنس جديد باسم معيّن (اتستخدمت لـ١١ حساب النهاردة)
--    الترتيب مهم: auth.users → (تريجر بيعمل profiles) → suppliers →
--    marketplace_suppliers، لأن listings.supplier_id عليه FK على الأخيرة.
CREATE OR REPLACE FUNCTION public.create_owner_account(p_name text, p_slug text, p_phone text, p_industry text)
 RETURNS uuid
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE v_uid uuid; v_sid uuid;
BEGIN
  SELECT id INTO v_sid FROM suppliers WHERE join_slug = p_slug LIMIT 1;
  IF v_sid IS NOT NULL THEN RETURN v_sid; END IF;

  v_uid := gen_random_uuid();
  v_sid := gen_random_uuid();

  INSERT INTO auth.users (instance_id,id,aud,role,email,encrypted_password,
    email_confirmed_at,created_at,updated_at,
    confirmation_token,recovery_token,email_change_token_new,email_change,
    email_change_token_current,phone_change,phone_change_token,reauthentication_token,
    raw_app_meta_data,raw_user_meta_data)
  VALUES ('00000000-0000-0000-0000-000000000000',v_uid,'authenticated','authenticated',
    p_slug||'@accounts.madmonacairo.com',NULL,now(),now(),now(),'','','','','','','','',
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name',p_name,'account_kind','business'));

  UPDATE profiles SET full_name=p_name, phone=p_slug, role='supplier' WHERE id=v_uid;

  INSERT INTO suppliers (id,business_name,contact_name,contact_phone,contact_email,
    industry,status,origin,join_slug,referral_code,commission_rate)
  VALUES (v_sid,p_name,p_name,p_phone,p_slug||'@accounts.madmonacairo.com',
    p_industry,'approved','marketplace',p_slug,p_slug,10);

  INSERT INTO marketplace_suppliers (id,profile_id,business_name,kyc_status)
  VALUES (v_sid,v_uid,p_name,'approved');

  RETURN v_sid;
END $function$;
