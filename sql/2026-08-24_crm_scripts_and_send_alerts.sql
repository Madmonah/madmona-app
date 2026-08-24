-- ============================================================================
-- ٢٤ أغسطس ٢٠٢٦ — إشعار برسايل الفريق + الاسكريبت والنموذج من الداتابيز
-- ============================================================================
-- محمد:
--   «لأي موظف يبعت رسالة واتساب من أي رقم عايز نوتيفيكيشن بالرسالة اللي
--    اتبعتت، بلس محتاج اعدل الرسالة وابعت معاها نموذج للتخصص يكون برفكت،
--    فراجع شكل النموذج لأني لقيت تابات لصور مش عارف بتترفع منين، وعايز
--    اعرف هل انشاء الصفحة بيكون دينامك؟»
--
-- ══════════════════ (١) إشعار برسايل الفريق ═════════════════════════════════
--   `crm_wa_sends` + `crm_log_wa_send()` — الشاشة بتنادي الدالة مع كل دوسة
--   على خيار في شيت الواتساب، والدالة بتسجّل وتبعت **بوش** لمحمد.
--
--   ⚠️ **حدّ الأمانة، مهم:** الإرسال بيحصل من **تطبيق واتساب بتاع الموظف**
--      مش من السيرفر بتاعنا. فاللي بنسجّله هو الاسكريبت اللي إحنا جهّزناه
--      ونسخناه له وفتحنا بيه الشات — ويقدر يعدّله قبل ما يدوس إرسال.
--      مفيش طريقة نعرف النص النهائي إلا لو الإرسال عدّى من أرقامنا إحنا.
--      عشان كده الإشعار مكتوب فيه «الاسكريبت اللي اتبعت» مش «اللي كتبه».
--
--   بوش بس عن قصد — ده ممكن يحصل عشرات المرات في اليوم، فواتساب وإيميل
--   مع كل واحدة كانوا هيبقوا سبام. (`fire_admin_alert` بتبعت التلاتة.)
--
-- ══════════════════ (٢) الاسكريبت والنموذج دينامك ═══════════════════════════
--   `crm_scripts` — صف لكل تخصص. **العمود الفاضي معناه «استخدم اللي في
--   الكود»** (`src/lib/crmScripts.ts`)، فالجدول بيكسب لما يكون فيه قيمة
--   والكود هو الافتراضي الآمن لو الجدول فاضي أو القراءة وقعت.
--   المتغيرات في `wa_body`: {customer} {sender}
--
--   🆕 اتضاف نموذجين لأكبر تخصصين — وكانوا **الوحيدين من غير نموذج**:
--        properties → royal-estate   · vehicles → masharty-auto
--      (شهد وعبير ماسكين عقارات، وde أكبر قسم عندنا.)
--
-- ══════════════════ (٣) مراجعة النموذج — «تابات الصور» ══════════════════════
-- 🔍 اللي محمد شافه مش تابات ولا بيترفع فيه حاجة:
--    صفحة `/s/[slug]` كانت بتعرض **٤ مربعات وهمية** بعناوين ثابتة
--    («المكان · من جوه · تفاصيل · أجواء») لما البيزنس مايكونش رافع ولا
--    صورة. العناوين متكتّبة في `VERTICALS` في الكود وفي
--    `suppliers.vertical->gallery_tiles` في الداتابيز، وبتختفي لوحدها أول
--    ما أول صورة حقيقية تتضاف. بتقرا كأنها محتوى — وde كان بيضلّل.
--    دلوقتي القسم كله بيختفي لو مفيش صور حقيقية.
--
-- 📊 القياس وقت المراجعة — **٤ من ٦ نماذج ماكانش فيها ولا صورة معرض**:
--      elite ٠ · heros-chicken ٠ · nile-breeze ٠ · demo-clinic ٠
--      star-alex-yachts ٦ · sa3dawy ٤        (وdemo-clinic من غير لوجو)
--
-- ✅ اتملّت من **صور حقيقية موجودة عندنا** (مافيش ولا صورة مولّدة):
--      elite         → الغلاف من صورة إعلانه على كلاوديناري
--      heros-chicken → غلاف + ٣ صور من `content-images/listings/real/heros-*`
--      nile-breeze   → ٤ صور من `content-images/rehosted/*`
--      masharty-auto → غلاف + ٥ من صور عربياته (٣٧ صورة متاحة)
--      royal-estate  → غلاف + صورتين من وحداته
--      ncb-developments → غلاف + ٥
--    demo-clinic لسه من غير صور — مفيش صور حقيقية ليها أصلًا.
--
-- 🏷️ واللوجو: البيزنس اللي مالوش لوجو كان بياخد نجمة ✨ على `/s/[slug]`،
--    بينما نفس البيزنس على `/manage/[slug]` بياخد لوجو مولّد باسمه من
--    `/api/logo/<supplierId>`. الصفحة دي كانت الوحيدة اللي مش بتستعمله.
--
-- ══════════════════ (٤) هل إنشاء الصفحة دينامك؟ ═════════════════════════════
--   الإجابة: **الداتا دينامك ١٠٠٪، والشكل نصّه متكتّب في الكود.**
--
--   دينامك (من الداتابيز، بيتغيّر من غير نشر):
--     • `public_salon_landing(slug)` → الاسم · الوصف · اللوجو · الغلاف ·
--       المعرض · الفروع · الفريق · الخدمات · عدد المنتجات · الثيم
--     • `public_storefront_listings(slug)` → الوحدات/الإعلانات بصورها
--     • `suppliers.vertical` (jsonb) → عناوين الأقسام وكلمات الـCTA
--     → أي بيزنس جديد بياخد صفحته على طول من غير سطر كود.
--
--   متكتّب في الكود (مش دينامك):
--     • ~٢١٥ سطر نصوص ثابتة لكل ١٣ نشاط في `VERTICALS`
--     • `catLabels` · `catIcons` · `servicesIcon` — **مش** قابلين للتعديل
--       من `vertical` خالص، دايمًا من الكود
--     • رقم الواتساب `201002229982` **ثابت لكل البيزنسات** — زرار «تواصل»
--       في أي صفحة بيروح لمضمونة مش لصاحب المحل (شوف الملاحظة تحت)
--     • لوجو مضمونة من كلاوديناري · شريط الثقة · الفوتر
--     • `THEME_BY_SLUG = { sa3dawy: 'dark' }` — استثناء لسلَج واحد
--
--   ⚠️ **محتاج قرارك:** رقم الواتساب الثابت. حاليًا كل عميل بيدوس «تواصل»
--      على صفحة أي بيزنس بيكلّم مضمونة (المارد يرد). ده مقصود لو الوساطة
--      هي الموديل، وغلط لو المفروض يوصل صاحب المحل.
-- ============================================================================

create table if not exists public.crm_scripts (
  specialty     text primary key,
  wa_body       text,        -- NULL = استخدم النص اللي في src/lib/crmScripts.ts
  demo_slug     text,        -- نموذج التخصص → /s/<slug>
  demo_label    text,
  prepare_lines text[],      -- NULL = اللي في الكود
  intake_wa     text,
  active        boolean not null default true,
  updated_at    timestamptz not null default now(),
  updated_by    uuid
);
alter table public.crm_scripts enable row level security;
drop policy if exists crm_scripts_read on public.crm_scripts;
create policy crm_scripts_read on public.crm_scripts
  for select using (public.is_madmona_staff() or public.is_admin_or_service());

create table if not exists public.crm_wa_sends (
  id         uuid primary key default gen_random_uuid(),
  contact_id uuid,
  phone      text not null,
  staff_id   uuid,
  staff_name text,
  specialty  text,
  app        text,
  message    text,
  sent_at    timestamptz not null default now()
);
create index if not exists crm_wa_sends_at    on public.crm_wa_sends (sent_at desc);
create index if not exists crm_wa_sends_staff on public.crm_wa_sends (staff_id, sent_at desc);
alter table public.crm_wa_sends enable row level security;
drop policy if exists crm_wa_sends_read on public.crm_wa_sends;
create policy crm_wa_sends_read on public.crm_wa_sends
  for select using (public.is_madmona_staff() or public.is_admin_or_service());

-- الدوال: crm_scripts_list() · crm_log_wa_send(phone, message, contact, specialty, app)
-- (النسخة الحيّة في الداتابيز — `node scripts/dump-crm-sql.mjs` بيطلعها كاملة)

insert into crm_contract (kind, name, detail, note) values
 ('table','crm_scripts','','اسكريبت كل تخصص + نموذجه — الفاضي معناه «استخدم اللي في الكود»'),
 ('table','crm_wa_sends','','كل رسالة واتساب موظف بعتها من /crm'),
 ('function','crm_scripts_list','','بتغذّي الاسكريبت في شاشة الموظف'),
 ('function','crm_log_wa_send','','بتسجّل الإرسال وبتبعت الإشعار لمحمد')
on conflict do nothing;

-- ─────────────────────────── فحوصات ───────────────────────────
-- مين بعت إيه النهاردة:
--   select sent_at, staff_name, phone, specialty, app, left(message,80)
--     from crm_wa_sends order by sent_at desc limit 20;
--
-- التخصصات اللي لسه مالهاش نموذج:
--   select specialty from crm_scripts where coalesce(demo_slug,'') = '' and active;
--
-- النماذج وصورها:
--   select join_slug, coalesce(logo_url,'')<>'' logo, coalesce(cover_url,'')<>'' cover,
--          jsonb_array_length(coalesce(gallery,'[]'::jsonb)) gal
--     from suppliers where join_slug in (select demo_slug from crm_scripts where demo_slug is not null);
