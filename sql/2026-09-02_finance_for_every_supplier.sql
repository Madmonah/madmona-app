-- 🏦 (٢ سبتمبر ٢٠٢٦) محمد: «عايز أتأكد إن أي مورد بيتسجل كبيزنس، وإن
--    المنتج النهائي بتاعه أو الخدمة أو الإيجار أو المنيو بيبقى مربوط
--    بالماركتبليس ومسمّع في الفينانس».
--
-- ═══ 🔴 الجذر — مكتوب صراحةً في التريجر ═══
--   CREATE TRIGGER trg_erp_provision_supplier
--     AFTER INSERT OR UPDATE OF origin ON suppliers
--     WHEN (new.origin <> 'marketplace')        ← ⚠️ الاستثناء
--
-- يعني أي مورد بيتسجل **من الماركتبليس — وده المسار الطبيعي** كان
-- مستثنى من تجهيز الفينانس. وكمان لو origin فاضي (NULL) الشرط بيرجّع
-- NULL فالتريجر مابيشتغلش أصلًا.
--
-- ═══ 📊 الإثبات بالأرقام (قبل الإصلاح) ═══
--   origin='b2b'         : ٦٢ مورد  → ٦٢ عندهم فينانس (١٠٠٪)
--   origin='marketplace' : ٢٥٥ مورد → **١٢٩ من غير فينانس**
-- و٩١ من الـ٩٢ اللي عندهم إعلانات منشورة من غير فينانس اتسجلوا **آخر
-- شهر**، وآخر واحد ٣١ أغسطس — يعني المشكلة كانت **حيّة ومستمرة**.
--
-- ═══ ✅ الإصلاح ═══
--   • شرط WHEN اتشال — التريجر بيشتغل على **كل** مورد.
--   • ترحيل الـ١٢٩ القدامى. erp_provision_supplier idempotent
--     (بتفحص count=0 قبل الـseed و not exists للمحفظة) فمفيش تكرار.
--
-- ═══ 🧪 التحقق بالمسار الحقيقي (مش بالقراءة) ═══
--   إدخال مورد جديد فعلي بـorigin='marketplace' جوّه DO block بيرجع
--   نفسه (raise exception = rollback) → النتيجة:
--     **٣٠ حساب + ١ إعدادات + محفظة العملاء** فورًا. وصفر بقايا بعد الرجوع.
--   وبعد الترحيل: ٣١٧ مورد / ٣١٧ عندهم فينانس — صفر من غير.
--
-- ═══ ⚠️ فاضل محتاج قرار محمد ═══
--   ٢٣ مشروع بورصة منشور **من غير إعلان في السوق**. السبب مش عطل:
--   جوب `sync_bourse_to_ads` **موقوف عن قصد** ضمن إعادة ضبط المارد
--   (٢٧/٨ — قاعدة ٤.٢). وقاعدة القفل بتقول: «ممنوع تشغيلهم من نفسك
--   مهما بدا السبب وجيه — اسأل محمد». فمالمستهوش.
--   التشغيل لو اتقرر: select public.unlock_orchestrator_job('sync_bourse_to_ads');

drop trigger if exists trg_erp_provision_supplier on public.suppliers;
create trigger trg_erp_provision_supplier
  after insert or update of origin on public.suppliers
  for each row
  execute function public.tg_erp_provision_new_supplier();

-- الترحيل (اتنفّذ): كل مورد من غير حسابات
--   do $$ declare r record; begin
--     for r in select id from suppliers s
--               where not exists (select 1 from erp_accounts a where a.supplier_id=s.id)
--     loop perform erp_provision_supplier(r.id); end loop;
--   end $$;
