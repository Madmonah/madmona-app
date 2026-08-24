// 🧞 مخ المارد — **المصدر الوحيد** لتعليمات وأدوات المارد في كل القنوات.
//
// ⚠️ (٢٥ يوليو ٢٠٢٦ — محمد: «راجع المسارات وراجع التعليمات بتاعة المارد
//    وطبّقها على الكل، ومش عايز تداخل يوقف النظام بأي شكل»)
//
//    كان فيه **نسختين** من الدالة دي: واحدة هنا للشات، وواحدة متكرّرة جوه
//    `api/whatsapp/baileys/route.ts` للواتساب. والنسختين اتفرّقوا فعلاً —
//    نسخة الشات كانت **أضعف**: ناقصة `get_referral_code` و
//    `record_job_application`، وناقصة أهم سطر («اقرا التاريخ وكمّل من حيث
//    انتهيتوا») وتفاصيل `manage_order`/`manage_meeting`/`record_unmet_demand`.
//    يعني «المارد الرسمي» على الموقع كان بيرد أقل كفاءة من مارد الواتساب،
//    ومحدش واخد باله.
//
//    دلوقتي **نسخة واحدة**: أي مارد — قديم أو جديد أو مارد المنصة نفسها —
//    بينادي من هنا وياخد نفس التعليمات ونفس الأدوات بالظبط. أي تعليمة
//    جديدة تتكتب هنا **مرة واحدة** وتسري على الكل فورًا.
import { anthropic, CLAUDE_MODEL } from '@/lib/anthropic'
import { logAiUsage } from '@/lib/ai-usage'
import { supabaseUntyped as db } from '@/lib/supabase'

/* 💰 (٢٤ أغسطس ٢٦) محمد: «عايز ردود من المارد بس مش عايز الرسالة تكلفني كل ده».

   الردود على واتساب هايكو كفاية عليها — رد قصير على سؤال العميل مش
   تحليل معقّد. الفرق مع سونيت:
     • الإدخال: $1  vs $3   لكل مليون توكن  (٣× أرخص)
     • الإخراج: $5  vs $15   لكل مليون توكن  (٣× أرخص)
   متوسط تكلفة الرد بتنزل ~٦٥٪ من غير ما نلغي الفهم.

   الموديل بيتحدد من `whatsapp_config.marid_model`. مش موجود = يرجع
   لـSonnet زي ما كان. بيتقرا مرة كل ٥ دقايق (كاش) عشان مانحمّلش
   الداتابيز على كل رد.

   من /admin/site-settings ← marid_model:
     • 'claude-haiku-4-5'  → الأرخص (المفروض دلوقتي)
     • 'claude-sonnet-4-5' → أذكى بس ٣× أغلى
     • فاضي/غير موجود      → سونيت (السلوك القديم) */
let _cachedModel: { value: string; at: number } | null = null
async function getMaridModel(): Promise<string> {
  if (_cachedModel && Date.now() - _cachedModel.at < 5 * 60_000) return _cachedModel.value
  try {
    const { data } = await db
      .from('whatsapp_config').select('value').eq('key', 'marid_model').maybeSingle()
    const v = ((data as { value?: string } | null)?.value || '').trim()
    const chosen = v || CLAUDE_MODEL
    _cachedModel = { value: chosen, at: Date.now() }
    return chosen
  } catch { return CLAUDE_MODEL }
}
import { MARID_TOOLS, runMaridTool, MADMONA_LINKS } from '@/lib/marid-tools'
import { ADMIN_TOOLS, runAdminTool, ADMIN_PROMPT } from '@/lib/marid-admin'
import { filterEnabledTools, getDisabledMaridTools, maridDisabledToolsPrompt } from '@/lib/marid-tool-settings'

// 🛡️ (١٩ أغسطس ٢٠٢٦ — محمد: «فيه اعلانات اتبعتت للمارد وبرضو مش شغال»)
//
//    اتأكّد فعليًا (رقم ١٥٥١، ١٩ أغسطس): بايع بعت شقة كاملة بالصور، والمارد
//    رد «سجّلت الإعلان: ...» ولينك — ومحدش من الأداتين اللي بتسجّل فعليًا
//    (create_listing_draft → instant_listing_drafts، أو create_project →
//    property_market_items) اتنادى خالص. اللينك نفسه مُختلَق. العميل اطمن
//    إن إعلانه هينزل وهو أصلاً مش موجود في أي جدول.
//
//    ده نفس عيب «الكلام مش تسجيل» اللي محمد بلّغ عنه يوم ١٨ أغسطس (عربيات) —
//    ده كان حله وقتها تعليمة في البرومبت بس (marid-brain وقتها)، وده أثبت
//    إنه مش كافي: النموذج بيرجع يكسرها تاني (هنا مع عقارات، مش عربيات).
//    تعليمة برومبت لوحدها بتتنسى تحت ضغط — لازم حارس في الكود يتأكد فعليًا.
//
//    الحل: نتتبّع هل نداء ناجح لـcreate_listing_draft/create_project حصل
//    فعلًا في المحادثة دي (listingPersisted). لو الرد بيوعد بتسجيل من غير
//    ما يحصل نداء ناجح: أول محاولة نرجّع الكلام للمارد ونجبره ينادي الأداة
//    فعلًا قبل ما يرد (لسه فيه لفّات فاضية)؛ لو خلصت اللفّات، نبدّل الرد
//    برسالة صادقة بدل الوعد الكاذب ونـنبّه محمد.
// ملحوظة: بيتفحص كلام مارد (مش كلام العميل)، فالتوسّع في الالتقاط (false positive
// = محاولة إضافية بدل ما مارد يتلخبط) أرخص بكتير من تفويت وعد فعلي (false negative
// = لينك وهمي بيوصل للعميل). لسه بيغطي الصيغ الماضية + دلوقتي بيغطي أي وعد مستقبلي
// بجذر "سجل"/"نزل" بأي بادئة (ه/ح) وأي لاحقة ضمير (ها/ه/هم/ت).
const LISTING_CONFIRM_VERB_RE = /سج[ّ]?لت|اتسج[ّ]?ل|تم\s*التسجيل|نزل\s*رسمي|هينزل|[هح]سج[ّ]?ل(?:ها|ه|هم|ت)?|[هح]نزل(?:ها|ه|هم)?|حانزل|حجزت|اتحجز|هحجز(?:لك|ها|له)?|حجزنالك/
// بدون "ال" في أول الكلمة عشان يغطي أي بادئة/حرف جر ملتصق (الإعلان/اعلانك/للعقار/
// بالعقار/...) من غير ما يبقى محتاج نسخة لكل حالة — الجذر بس هو اللي بيتلزّم.
// (١٩ أغسطس ٢٠٢٦) ضفنا ميعاد/حجز — نفس فخ الوعد الكاذب ممكن يحصل مع
// حجز ميعاد (manage_meeting) زي ما حصل مع الإعلانات بالظبط: مارد يقول
// «اتحجز ✅» من غير ما book_meeting يتنادى فعلًا.
const LISTING_CONFIRM_NOUN_RE = /علان|مشروع|بورصة|ماركت\s*بليس|وحدة|عقار|ميعاد|الحجز/
function looksLikeFakeListingConfirmation(text: string): boolean {
  return LISTING_CONFIRM_VERB_RE.test(text) && LISTING_CONFIRM_NOUN_RE.test(text)
}
// (١٩ أغسطس ٢٠٢٦) الحارس بقى يغطي حجز الميعاد كمان — الرسالة/التصحيح/التنبيه
// لازم يفرّقوا بين النوعين عشان الرد الصادق يبقى منطقي (مايتكلّمش عن «صور
// الإعلان» لعميل بيحاول يحجز ميعاد وبالعكس).
const MEETING_CLAIM_RE = /ميعاد|الحجز/
function buildGuardCorrection(isMeeting: boolean, listingOff = false): string {
  if (!isMeeting && listingOff) {
    // 🔌 أداة التسجيل مقفولة — فالتصحيح مايقدرش يقوله «نادِ الأداة».
    return (
      '⚠️ نظام (مش من العميل): في ردّك اللي فات أكّدت للعميل إنك سجّلت الإعلان — ' +
      'وإنت **مش بتسجّل إعلانات خالص**. أداة التسجيل مقفولة، والإضافة بقت من ' +
      'صاحب الإعلان نفسه. صحّح ردّك: قوله يضيف إعلانه بنفسه من ' +
      `${MADMONA_LINKS.اضافة_اعلان} (ولو مامعاهوش حساب مورد: ${MADMONA_LINKS.تسجيل_مورد_جديد})، ` +
      'واعرض عليه إن حد من فريق مضمونة يتصل بيه يساعده. ' +
      'من غير أي وعد بتسجيل ومن غير ما تطلب منه بيانات عشان تسجّلها إنت.'
    )
  }
  if (isMeeting) {
    return (
      '⚠️ نظام (مش من العميل): في ردّك اللي فات أكّدت للعميل إنك حجزت الميعاد، ' +
      'لكن مفيش نداء ناجح لـmanage_meeting (action: book) حصل فعليًا في المحادثة دي. ' +
      'ممنوع تأكيد حجز من غير نداء فعلي للأداة في نفس الرد. ' +
      'لو عندك التاريخ والوقت من كلام العميل فوق، نادِ manage_meeting فعليًا دلوقتي ' +
      'واستخدم اللي هيرجعلك منها في ردّك. لو لسه ناقص، اسأل العميل عن الميعاد الصح.'
    )
  }
  return (
    '⚠️ نظام (مش من العميل): في ردّك اللي فات أكّدت للعميل إنك سجّلت الإعلان/المشروع، ' +
    'لكن مفيش نداء ناجح لـcreate_listing_draft ولا create_project حصل فعليًا في المحادثة دي. ' +
    'اللينك اللي بعتّه غير حقيقي. ممنوع تأكيد تسجيل من غير نداء فعلي لنفس الأداة في نفس الرد. ' +
    'لو عندك بيانات كافية من كلام العميل فوق (العنوان/الوصف/السعر/صورة واحدة على الأقل)، ' +
    'نادِ الأداة الصح فعليًا دلوقتي واستخدم اللي هيرجعلك منها في ردّك. ' +
    'لو لسه ناقص بيانات أساسية، قول للعميل بالظبط الناقص إيه — من غير أي وعد بتسجيل لسه ماحصلش.'
  )
}
function buildHonestFallback(isMeeting: boolean, listingOff = false): string {
  if (!isMeeting && listingOff) {
    return (
      'الإضافة بقت من عندك مباشرة عشان تتحكّم في التفاصيل والصور بنفسك 🙏\n' +
      `ضيف إعلانك من هنا: ${MADMONA_LINKS.اضافة_اعلان}\n` +
      `ولو لسه مامعاكش حساب مورد: ${MADMONA_LINKS.تسجيل_مورد_جديد}\n` +
      'ولو حابب حد من فريق مضمونة يساعدك في الإضافة، قوللي وأنا أخلّي حد يتصل بيك.'
    )
  }
  return isMeeting
    ? 'قربنا نخلص! بس محتاج أتأكد من تاريخ ووقت الميعاد بالظبط عشان أحجزه فعليًا وأأكّدلك — قولّيلي تاني وأنا أظبطه على طول 🙏'
    : 'قربنا نخلص! بس محتاج آخر تفاصيل الإعلان (السعر والصور) عشان أسجّله فعليًا وأبعتلك تأكيد — ابعتهملي وأنا أظبطه على طول 🙏'
}
function fireListingGuardAlert(phone: string, text: string): void {
  const isMeeting = MEETING_CLAIM_RE.test(text)
  console.error('[marid-guard] رد فيه تأكيد تسجيل/حجز من غير نداء أداة ناجح', {
    phone, isMeeting, text: text.slice(0, 200),
  })
  void db
    .rpc('fire_admin_alert', {
      p_title: isMeeting
        ? 'المارد أكّد حجز ميعاد من غير ما يحجزه فعليًا'
        : 'المارد أكّد تسجيل إعلان من غير ما يسجّله فعليًا',
      p_body: `الرقم: ${phone}\n\nنص الرد اللي كان هيتبعت:\n${text.slice(0, 300)}`,
      p_url: '/admin/marid-monitor',
      p_severity: 'warning',
      p_source: 'marid-guard',
    })
    .then(
      () => {},
      () => {},
    )
}

// 📎 ملاحظة الملف اللي العميل بعته. النص الأصلي (لما تسجيل الإعلانات
//    شغّال) اتساب بالحرف؛ الفرع التاني بيشتغل لما `create_listing_draft`
//    تكون مقفولة من `/admin/marid` — ساعتها التعليمة اللي بتقول «مرّر
//    الرابط في image_urls» و«نادِ add_menu_items» بقت تعليمة لأداة مش
//    موجودة، وسيبانها كانت هتخلّي المارد يوعد بتسجيل مش هيحصل.
function mediaNote(url: string, listingOff: boolean): string {
  if (listingOff) {
    return `\n📎 الملف اللي بعته اتحفظ هنا:\n${url}\n` +
      'اقراه واستعمله في كلامك مع العميل (لو منيو أو قايمة أسعار، تقدر ترد على أسئلته منها).\n' +
      '⛔ إنت مش بتسجّل إعلانات ولا أصناف منيو — ماتقولش إنك هتحوّل الملف ده لإعلان.\n' +
      'لو الملف ده لإعلان عايز ينزل: قوله يضيفه بنفسه ويرفع الصور من ' +
      `${MADMONA_LINKS.اضافة_اعلان} — الصور بتترفع من هناك مباشرة.\n`
  }
  return `\n📎 الملف اللي بعته اتحفظ هنا:\n${url}\nلو هتسجّل إعلان أو مشروع، مرّر الرابط ده في image_urls كصورة.\n\n🧾 لو الصورة فيها منيو أو قائمة أسعار: اقرا كل صنف وسعره من الصورة نفسها (إنت شايفها). (قاعدة ١٩ أغسطس — بتشيل قاعدة ١٨ أغسطس اللي كانت بتحط الأصناف في الوصف): المطعم/النشاط ده **create_listing_draft واحد** باسمه بوصف عام مختصر (بدون أصناف/أسعار)، وبعدين نادِ **add_menu_items** بالـlisting_id اللي رجعلك وحط كل صنف من الصورة كعنصر منفصل بسعره — ده اللي بيظهر فعليًا كمنيو على صفحة المطعم. ⛔ ماتحطش الأصناف والأسعار في الـdescription — قاعدة ١٨ أغسطس دي كانت بتسيب المنيو فاضي فعليًا لأن محدش كان بيحوّل الوصف لمنيو يدوي بعد كده. ⛔ برضه مش نداء create_listing_draft لكل صنف (ده اللي خلّى رقاق المدق يظهر ٣٤ مرة) — إعلان واحد للمطعم + add_menu_items للأصناف. الأسعار اللي في الصورة هي المصدر، متخترعش.\n`
}

// المارد بيقدر يسأل الداتابيز قبل ما يرد: يبحث في الكتالوج، يشوف المتكلّم
// مين، يجيب حجوزاته، يسجّل إعلان. بندوّر الحلقة لحد ما يخلص أدوات.
export async function callMaridWithTools(opts: {
  systemPrompt: string
  userMessage: string
  mediaBlocks?: Array<Record<string, unknown>>
  senderPhone: string
  senderName: string | null
  savedMediaUrl?: string | null
  admin?: boolean
  // 📊 للقياس بس — اختياريين، ولو مابعتّهمش مفيش أي فرق في السلوك
  channel?: string | null
  conversationId?: string | null
}): Promise<string> {
  const mediaBlocks = opts.mediaBlocks ?? []
  const MAX_TURNS = opts.admin ? 6 : 4
  // 🔌 (٢٤ أغسطس ٢٠٢٦) الأدوات المطفية من `/admin/marid` مابتوصلش لكلود
  //    أصلًا — ده الحارس الأول من التلاتة (شوف `marid-tool-settings.ts`).
  const tools = await filterEnabledTools(
    opts.admin ? [...MARID_TOOLS, ...ADMIN_TOOLS] : MARID_TOOLS,
  )
  // بيتقري مرة واحدة هنا ويتستعمل في حارس الوعد الكاذب تحت: لو أداة تسجيل
  // الإعلان مقفولة، «هسجّله» مابقاش خطأ يتصحّح بنداء الأداة — بقى وعد ممنوع
  // أصلًا، والتصحيح الصح هو إن العميل يضيف بنفسه.
  const listingToolOff = (await getDisabledMaridTools()).has('create_listing_draft')

  // 🪪 كارت المتكلّم (٣ أغسطس ٢٠٢٦) — بدل ما المارد ينادي who_is_this كأداة
  //    في كل رسالة (نداء كامل لكلود = ٢٢ ألف توكن عشان ١٥٠ توكن معلومة)،
  //    بنقراه من الداتابيز هنا في استعلام واحد (~20ms) ونحقنه في البرومبت.
  //    الجدول marid_contact_card بيتعبّى أوتوماتيك بتريجرات — زي asset_owners.
  //    لو الاستعلام وقع، بنكمّل من غيره والمارد هيرجع ينادي الأداة زي الأول.
  let contactBlock = ''
  try {
    const { data } = await db.rpc('marid_contact_block', {
      p_phone: opts.senderPhone,
      p_name: opts.senderName,
    })
    if (typeof data === 'string' && data.trim()) contactBlock = data
    else console.warn('[marid] الكارت رجع فاضي — هنرجع لـ who_is_this')
  } catch (e) {
    console.warn('[marid] كارت المتكلّم مش متاح — بنكمّل بالأداة:', e instanceof Error ? e.message : String(e))
  }

  // ⚠️ (٣ أغسطس ٢٠٢٦) لو الكارت فشل لأي سبب، **لازم** ترجع تعليمة who_is_this.
  //    من غير ده بيحصل أوحش سيناريو: لا كارت ولا أداة — فالمارد يتعامل مع كل
  //    عميل قديم كأنه أول مرة. النسخة اللي قبل دي كانت بتقول «ماتنادّيش
  //    who_is_this» حتى لما الكارت فاضي.

  // 🔌 القسم ده بيتحطّ في **آخر** البرومبت الثابت عن قصد: عشان يجي بعد كل
  //    تعليمة قديمة بتأمر بنداء أداة مقفولة (وفيه ١٥ تعليمة زي دي في
  //    `customer-concierge.ts` لوحدها + بلوك الميديا وبلوك «عندك أدوات» اللي
  //    تحت في نفس الملف ده)، والأخير هو اللي بيتنفّذ. عشان كده بيتلزق في
  //    **آخر البرومبت كله** مش آخر الجزء المكاش — تمنه ~٣٠٠ توكن مش مكاشين
  //    وده أرخص بكتير من إن تعليمة قديمة تكسب عليه.
  const disabledSection = await maridDisabledToolsPrompt()
  const systemRaw = `${opts.systemPrompt}${opts.admin ? ADMIN_PROMPT : ''}<<<CACHE_SPLIT>>>

═══════════════════════════════════════════════════════════
النهاردة
═══════════════════════════════════════════════════════════
${new Date().toLocaleString('ar-EG', {
  timeZone: 'Africa/Cairo',
  dateStyle: 'full',
  timeStyle: 'short',
})}
(بتوقيت القاهرة · ISO: ${new Date().toISOString()})

⛔ ماتسألش العميل عن التاريخ أو الساعة — إنت عارفهم.
«بكرة» و«بعد بكرة» و«الأسبوع الجاي» احسبهم بنفسك من التاريخ ده.

⛔ التاريخ اللي فوق **لمعرفتك بس** — ماتقارنهوش بوقت رسالة العميل ولا بأي
رسالة قديمة في المحادثة، وماتستنتجش منه إن فيه تأخير حصل.
ممنوع تعتذر عن التأخير خالص: لا «آسف على التأخير» ولا «آسفين جدًا على
التأخير في الرد» ولا «معلش على التأخير» ولا أي صيغة تلفت نظر العميل لوقت
الرد. ابدأ الرد بالمفيد على طول.
(٣٠ يوليو ٢٠٢٦: الاعتذار ده كان طالع في ١٩٪ من ردود المارد — العميل مكانش
شاكي من حاجة، والمارد هو اللي بيفتح الموضوع ويورّي إن فيه مشكلة.)

═══════════════════════════════════════════════════════════
معلومات المتكلّم دلوقتي
═══════════════════════════════════════════════════════════
${contactBlock || `رقمه: ${opts.senderPhone}${opts.senderName ? `\nاسمه: ${opts.senderName}` : ''}`}

استخدم الرقم ده مباشرة في الأدوات — ماتسألهوش عليه.
${opts.savedMediaUrl ? mediaNote(opts.savedMediaUrl, listingToolOff) : ''}

═══════════════════════════════════════════════════════════
عندك أدوات — استخدمها
═══════════════════════════════════════════════════════════
• أي سؤال عن حاجة معينة → search_catalog قبل ما ترد
• «عندكم إيه؟» → list_categories
${contactBlock
  ? `• **بيانات المتكلّم فوق جاهزة — ماتنادّيش who_is_this عليها.**
  اقرا كارت المتكلّم كويس وكمّل من حيث انتهيتوا. الناس بتزعل جدًا لما تسأل
  عن حاجة شرحوها قبل كده، وبتزعل أكتر لما تعامل عميل قديم كأنه أول مرة.
  نادِ who_is_this **بس** في حالتين: الكارت قال «مُعرّف مخفي ومفيش ربط»،
  أو الكلام مش متطابق مع الكارت وعايز تتأكد.`
  : `• **أول حاجة دايمًا: who_is_this** — ابعتله الرقم *والاسم*.
  لو رجّعلك تاريخ سابق، اقراه كويس وكمّل من حيث انتهيتوا.
  الناس بتزعل جدًا لما تسأل عن حاجة شرحوها قبل كده.`}
• «فين حجزي؟» → get_my_orders
• عايز يضيف منتج/خدمة → اجمع البيانات، **نادِ list_categories الأول لو مش متأكد من التصنيف
  الصح**، وبعدين create_listing_draft بالـslug الحقيقي اللي رجعلك.
  ⛔ ممنوع تخترع category_slug من دماغك (زي "restaurants" أو "real-estate") —
  لو مش لاقي تصنيف مناسب في list_categories سيب category_slug فاضي والأداة
  هتتصرف صح (تدوّر بالمعنى وتعمل تصنيف جديد لو محتاج، مش تحط حاجة عشوائية).
  ⛔⛔ **الكلام مش تسجيل — الأداة هي التسجيل.** ممنوع منعًا باتًا تقول
  «سجّلت» أو «هسجّل» أو «اتسجل ✅» أو «الفريق هيجهّز» من غير ما تكون ناديت
  create_listing_draft **فعلًا في نفس الرد**. (١٨ أغسطس: معرض بعت ٦ عربيات
  بصور وأسعار، والرد كان «سجّلتلك ✅» من غير ولا نداء واحد للأداة — ضاع يوم كامل.)
  لو التاجر بعت أكتر من منتج/عربية: نادِ create_listing_draft لكل واحدة
  (واحدة واحدة) في نفس اللفة قبل ما تأكّد. ولو صحّح الأسعار بعد لخبطة،
  دي بالذات لحظة النداء — سجّل بالأسعار المؤكدة فورًا قبل أي رد.
  ⛔ استثناء **مطعم بعت منيو كامل** (نص أو صورة، أصناف كتير بأسعارها):
  مش زي التاجر اللي عنده منتجات منفصلة. ده create_listing_draft **واحد**
  باسم المطعم ووصف عام مختصر (بدون أصناف/أسعار في الوصف)، وبعدين
  add_menu_items للأصناف كلها بالـlisting_id اللي رجعلك. (١٩ أغسطس: قواعد
  قديمة كانت بتحط المنيو كامل في الوصف فيفضل المنيو فاضي فعليًا على
  الموقع — دلوقتي فيه أداة مخصصة، استخدمها دايمًا لأي منيو مطعم.)
• أي سؤال عن **سعر الذهب** (عيار 24/21/18) أو **الدولار/اليورو/الاسترليني/الريال** → get_financial_prices
  الأسعار لحظية على الموقع — ماتقولش «مش متاح» وماتخترعش سعر، نادِ الأداة.
• عايز يشتغل معانا أو بعت سيرة ذاتية → record_job_application
• أي كلام عن **أوردر** (قبول/رفض/إلغاء/استفسار) → manage_order
  الأداة بتتأكد من الصلاحية بنفسها. ماتأكّدش على حاجة قبل ما ترجّع ok.
• أي كلام عن **ميعاد** (حجز/إلغاء/استفسار) → manage_meeting
  ⛔ ممنوع تقول ميعاد من دماغك ولا توعد بحاجة مش مسجّلة
• **search_catalog مارجّعش حاجة مناسبة** → نادِ record_unmet_demand
  **فورًا وقبل ما ترد**. ماتستأذنش وماتقولش «تحب أسجّلهولك؟» —
  سجّله وبعدين قول للعميل إنك سجّلته وهترجعله.
  الطلب اللي مايتسجّلش بيضيع للأبد.
• أي سؤال عن **سعر عقار/شقة/فيلا/محل** في منطقة (العاصمة/التجمع/الساحل/أكتوبر...) → get_property_prices
  ابعت اسم المنطقة لو حدّدها. ماتخترعش سعر عقار — الأداة بترجّع أسعار بورصة مضمونة الحقيقية.

⚠️ ممنوع تخترع إعلان أو سعر أو لينك. لو الأداة مارجعتش حاجة،
قول للعميل بصراحة إن ده مش متاح — ده أحسن ألف مرة من معلومة غلط.

الروابط الرسمية:
${Object.entries(MADMONA_LINKS)
  .map(([k, v]) => `  ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}${disabledSection}`

  // 💰 Prompt caching (28 Jul 2026) — نكاش الجزء الثابت (البرومبت + تعريفات الأدوات).
  // حلقة الأدوات بتنادي Claude لحد ٤ مرات لكل رسالة بنفس الـsystem+tools — فالكاش
  // بيتقري ٣ مرات جوّه الرسالة الواحدة (توفير مضمون مهما كان معدّل الرسايل). دمج
  // الجزئين بيرجّع البرومبت الأصلي بالحرف (العلامة بتتشال) فسلوك المارد زيّه بالظبط.
  const _sp = systemRaw.split('<<<CACHE_SPLIT>>>')
  const system: Array<Record<string, unknown>> =
    _sp.length === 2
      ? [
          // ⏱️ (٣ أغسطس ٢٠٢٦) TTL ساعة بدل ٥ دقايق. البادئة (الأدوات + البرومبت)
          //    ~٢٢ ألف توكن، وكتابتها من أول وجديد أغلى ١٢٫٥ مرة من قراءتها.
          //    بـ٥ دقايق كانت بتموت بين العناقيد فبندفع كتابة جديدة كل شوية.
          //    القراءة نفسها بتجدّد الـTTL ببلاش — فالمحادثة النشطة بتفضل دافية.
          { type: 'text', text: _sp[0], cache_control: { type: 'ephemeral', ttl: '1h' } },
          { type: 'text', text: _sp[1] },
        ]
      : [{ type: 'text', text: _sp.join('') }]

  const messages: Array<{ role: 'user' | 'assistant'; content: unknown }> = [
    {
      role: 'user',
      content:
        mediaBlocks.length > 0
          ? [...mediaBlocks, { type: 'text', text: opts.userMessage }]
          : opts.userMessage,
    },
  ]

  let droppedMedia = false
  // 🛡️ شوف تعليق «الكلام مش تسجيل» فوق الملف — بتتسجّل true بس لما نداء
  // create_listing_draft أو create_project يرجع ok:true فعليًا.
  let listingPersisted = false

  for (let turn = 0; turn < MAX_TURNS; turn++) {
    let res
    const _t0 = Date.now()
    try {
      res = await anthropic.messages.create({
        model: await getMaridModel(),
        // 💸 (١٦ أغسطس ٢٠٢٦ — محمد: «تكلفة المارد عالية شوية»)
        //
        //    الإخراج أغلى توكن عندنا ($15/مليون مقابل $3 للإدخال و$0.30
        //    للكاش). كان ٢٠٤٨، وفعلاً اتوصل للسقف: رد واحد يوم ١٦ أغسطس
        //    طلع ٢٠٤٨ توكن كامل — ده مش رد واتساب، ده مقال.
        //
        //    ١٢٠٠ توكن ≈ ٦٠٠+ كلمة عربي، أكتر من كفاية لرد واتساب
        //    (متوسط الرد الحالي ٣٦٧ توكن)، وبيقفل الباب على الردود
        //    اللي بتخرج عن السيطرة.
        //
        // ⚠️ مانزلناش أكتر من كده عن قصد: أدوار استخدام الأدوات بتحتاج
        //    مساحة للـinputs، وقصّها بيكسر النداء مش بس يقصّر الرد.
        max_tokens: 1200,
        system: system as never,
        tools: tools as never,
        messages: messages as never,
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const isMediaIssue = /image|document|media|Could not process/i.test(msg)
      if (isMediaIssue && !droppedMedia && mediaBlocks.length > 0) {
        console.warn('[marid] الميديا مش مقروءة — بنكمّل من غيرها:', msg.slice(0, 120))
        droppedMedia = true
        messages[0] = {
          role: 'user',
          content:
            `${opts.userMessage}\n\n(العميل بعت ملف مش قادر أفتحه — ` +
            `قوله كده بصراحة واطلب منه يبعت التفاصيل مكتوبة.)`,
        }
        continue
      }
      throw err
    }

    // 📊 قياس بس — fire-and-forget، مايأخّرش الرد ولا بيقدر يكسره
    logAiUsage({
      agentName: 'المارد',
      channel: opts.channel ?? null,
      conversationId: opts.conversationId ?? null,
      model: await getMaridModel(),
      turn,
      cacheTtl: '1h',
      latencyMs: Date.now() - _t0,
      usage: res.usage as never,
    })

    const toolUses = res.content.filter((c) => c.type === 'tool_use')

    if (!toolUses.length) {
      const textPart = res.content.find((c) => c.type === 'text')
      const finalText = textPart && textPart.type === 'text' ? textPart.text : ''

      if (!listingPersisted && looksLikeFakeListingConfirmation(finalText)) {
        const isMeeting = MEETING_CLAIM_RE.test(finalText)
        // لسه فيه لفّات فاضية — نرجّعله يصحّح بنفسه وينادي الأداة فعلًا.
        if (turn < MAX_TURNS - 1) {
          messages.push({ role: 'assistant', content: res.content })
          messages.push({ role: 'user', content: buildGuardCorrection(isMeeting, listingToolOff) })
          continue
        }
        // خلصت اللفّات — مانبعتش وعد كاذب. رد صادق + تنبيه لمحمد.
        fireListingGuardAlert(opts.senderPhone, finalText)
        return buildHonestFallback(isMeeting, listingToolOff)
      }

      return finalText
    }

    messages.push({ role: 'assistant', content: res.content })

    const results = []
    for (const tu of toolUses) {
      if (tu.type !== 'tool_use') continue
      const isAdminTool = ADMIN_TOOLS.some((t) => t.name === tu.name)

      // 📸 ضمان حفظ صورة العميل في مسودة الإعلان (حتى لو المارد نسي يمرّرها)
      //    عشان الإعلان ينزل الماركتبليس مش يعلق بلا صورة.
      let toolInput = tu.input as Record<string, unknown>
      if (tu.name === 'create_listing_draft' && opts.savedMediaUrl) {
        const existing = Array.isArray(toolInput.image_urls) ? (toolInput.image_urls as string[]) : []
        if (!existing.length) toolInput = { ...toolInput, image_urls: [opts.savedMediaUrl] }
      }

      const out = isAdminTool
        ? await runAdminTool(tu.name, toolInput)
        : await runMaridTool(tu.name, toolInput)
      console.log('[marid-tool]', tu.name, JSON.stringify(out).slice(0, 160))
      // manage_meeting اتضاف (١٩ أغسطس) — نفس حماية الإعلانات بالظبط بس
      // لحجز الميعاد. ok:true من الأداة دي معناها book_meeting/cancel_meeting
      // اتنادت فعلًا في الداتابيز، مش مجرّد كلام.
      if (
        (tu.name === 'create_listing_draft' || tu.name === 'create_project' || tu.name === 'manage_meeting') &&
        (out as { ok?: boolean })?.ok === true
      ) {
        listingPersisted = true
      }
      results.push({
        type: 'tool_result',
        tool_use_id: tu.id,
        content: JSON.stringify(out),
      })
    }
    messages.push({ role: 'user', content: results })
  }

  // خلصت اللفّات ولسه بيطلب أدوات — نطلب رد نهائي من غير أدوات
  //
  // 🐛 إصلاح (٣ أغسطس ٢٠٢٦): كان مكتوب `system: \`${system}\n\n…\``
  //    و `system` مصفوفة كائنات — فالـ template literal كان بيحوّلها للنص
  //    الحرفي "[object Object],[object Object]". يعني النداء الأخير ده كان
  //    بيروح لكلود **من غير برومبت المارد خالص**: لا شخصية، لا روابط، ولا
  //    قاعدة «ماتخترعش سعر ولا إعلان». وده بيحصل تحديدًا في المحادثات
  //    الطويلة اللي استهلكت كل اللفّات — أكتر وقت العميل محتاج فيه رد مضبوط.
  //
  //    بنبعت البلوكات زي ما هي + التعليمة كبلوك أخير. وبنشيل cache_control
  //    لأن النداء ده من غير أدوات فبادئته مختلفة عن المكاشة أصلاً — كتابة
  //    كاش هنا هتتدفع وماحدش هيقراها.
  const finalSystem = system.map((b) => ({ type: 'text', text: b.text }))
  finalSystem.push({ type: 'text', text: 'خلاص كفاية أدوات — رد على العميل دلوقتي باللي عندك.' })

  const _tf = Date.now()
  const final = await anthropic.messages.create({
    model: await getMaridModel(),
    max_tokens: 1024,
    system: finalSystem as never,
    messages: messages as never,
  })

  logAiUsage({
    agentName: 'المارد',
    channel: opts.channel ?? null,
    conversationId: opts.conversationId ?? null,
    model: await getMaridModel(),
    turn: MAX_TURNS,
    isFinal: true,
    cacheTtl: '1h',
    latencyMs: Date.now() - _tf,
    usage: final.usage as never,
  })

  const t = final.content.find((c) => c.type === 'text')
  const finalText = t && t.type === 'text' ? t.text : ''

  // هنا مفيش تولز أصلًا (النداء الأخير من غير tools) — مقدرش أرجّعه ينادي
  // الأداة تاني. لو لسه بيوعد بتسجيل من غير ما حصل، رد صادق بدل الكدب.
  if (!listingPersisted && looksLikeFakeListingConfirmation(finalText)) {
    fireListingGuardAlert(opts.senderPhone, finalText)
    return buildHonestFallback(MEETING_CLAIM_RE.test(finalText))
  }

  return finalText
}
