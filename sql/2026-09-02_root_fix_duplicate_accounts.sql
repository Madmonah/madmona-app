-- 🧬 (٢ سبتمبر ٢٠٢٦) محمد: «لا، الصح يتعمل — وشوف إيه سبب المشكلة
--    وعالجه من الجذر».
--
-- ═══ السبب الجذري ═══
-- **٨ دوال** بتعمل insert في madmona_accounts، وكل واحدة بتحسب الرقم
-- بطريقتها وبتكتبه **خام**:
--   employee_login_phone_pin · issue_madmona_token_for_admin ·
--   login_with_password · madmona_verify_magic_link · madmona_verify_otp ·
--   madmona_wa_login_confirm · tg_project_owner_account · wa_login_mint
-- ولا واحدة فيهم بتوحّد الصيغة قبل الكتابة. فنفس الشخص بياخد صف بـ
-- '+201…' من مسار وصف بـ'201…' من مسار تاني.
--
-- النتيجة: **٣٧ رقم ليهم حسابين** (من ضمنهم محمد ونورا وشهد)، وهوية
-- الموظف بتضيع حسب المسار اللي دخل منه — madmona_resolve كانت بتقارن
-- الأرقام خام فترجّع roles فاضية: «الموظف بيدخل ويلاقي نفسه مش موظف».
--
-- ═══ العلاج من الجذر (مش ترقيع الـ٨ دوال) ═══
-- الحماية اتحطت في **الداتابيز** عشان تشتغل مهما كان المصدر — نفس منطق
-- قاعدة ٤.٨ («مصدر الحسابات مش في الكود، فالحماية في الداتابيز»).
-- أي دالة جديدة أو سكريبت خارجي هيتحكم بيها تلقائيًا.
--
--   ١) تريجر trg_madmona_account_canon_phone — بيوحّد phone_normalized
--      قبل أي insert/update. الكود يبعت أي صيغة، الجدول يخزّن واحدة.
--   ٢) فهرس فريد madmona_accounts_phone_uniq — مستحيل يتعمل حسابين
--      بنفس الرقم تاني.
--
-- ═══ الدمج (من غير حذف) ═══
-- البنية بسيطة: الحساب مالوش غير مرجعين — madmona_sessions.account_id
-- (FK) و madmona_wa_login.account_id. كل الباقي بيتحدد بالرقم مش بالـid.
--   • الناجي = الأقدم (created_at) — التاريخ يتحفظ.
--   • ١٩٣ جلسة اتوجّهت للناجي · صفر فاضلة على المكرر.
--   • الناجي أخد أحسن اسم وآخر دخول من المجموعة.
--   • الصف المكرر **مااتحذفش** — أخد رقم «شاهد قبر»
--     ('merged:<الرقم>:<id>') فمايطابقش أي بحث، والأثر محفوظ
--     (نفس أسلوب ٤.٨ مع الموردين المؤقتين).
--
-- ═══ النتيجة (متحقّق منها) ═══
--   صفر حساب بصيغة + · صفر رقم مكرر · ٣٧ صف معطّل (أثر) ·
--   ٢٥٣ حساب (مفيش صف ضاع) · صفر جلسة مكسورة ·
--   كل فريق مضمونة (٨ بجلسات) هويتهم رجعت.
--
-- ═══ اختبار الحماية بمحاولة حقيقية ═══
--   insert بـ'+201002229982' (رقم محمد الموجود) → **اترفض** (unique_violation)
--   insert برقم جديد '+201999888777'            → **اتخزّن '201999888777'**
--
-- ═══ الرجوع ═══
--   _backup_madmona_accounts_20260902 (كل الصفوف قبل التعديل)
--   _backup_madmona_sessions_acct_20260902 (token → account_id الأصلي)
--   _merge_map_accounts_20260902 (canon · keeper · all_ids)
--   كلهم RLS مفعّل وصفر صلاحية لـanon.

create or replace function public.tg_madmona_account_canon_phone()
returns trigger
language plpgsql
set search_path to 'public', 'extensions', 'pg_catalog'
as $function$
begin
  if new.phone_normalized is not null and new.phone_normalized not like 'merged:%' then
    new.phone_normalized := coalesce(normalize_phone(new.phone_normalized), new.phone_normalized);
  end if;
  return new;
end $function$;

drop trigger if exists trg_madmona_account_canon_phone on public.madmona_accounts;
create trigger trg_madmona_account_canon_phone
  before insert or update of phone_normalized on public.madmona_accounts
  for each row execute function public.tg_madmona_account_canon_phone();

create unique index if not exists madmona_accounts_phone_uniq
  on public.madmona_accounts (phone_normalized);
