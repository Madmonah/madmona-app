// src/lib/whatsapp.ts
// قناة واتساب مضمونة — خدمة المارد (Baileys على Railway) وبس.
//
// ⛔ Meta Cloud API اتشال خالص (٢٤ يوليو ٢٠٢٦ — بقرار محمد).
//    كان واقف من ١٨ يوليو بكود 190 (توكن منتهي) وماكانش هيرجع، وكان بيفضل
//    موجود كـ«مسار احتياطي» وهمي بيلخبط التشخيص: أي عطل في خدمة المارد كان
//    بيقع على مسار ميت ويرجّع رسالة خطأ من Meta مالهاش علاقة بالسبب الحقيقي.
//
//    القناة الوحيدة دلوقتي = wa-service. لو هي واقعة، الإرسال بيفشل **بوضوح**
//    برسالة تقول كده — وده أحسن من fallback بيبلع السبب.

import { supabase as supabaseAdmin, supabaseUntyped } from './supabase'
import { getNumberConfig } from './wa-number-config'
import { sendTextViaOpenWa, isOpenWaConfigured } from './openwa'

// 🚨 (٢ أغسطس ٢٠٢٦) OpenWA بقى القناة الوحيدة.
//
//    `wa-service` (جسر Baileys) و`wa-web` (whatsapp-web.js) اتمسحوا من
//    رايلواي والفولدرات اتشالت من الريبو. `WA_SERVICE_URL` فاضل هنا
//    كمسار احتياطي **ميت** بيرجع خطأ واضح لو حد ظبّطه بالغلط.
//
//    `WA_SERVICE_SECRET` لسه مستخدم فعلاً — هو التوكن اللي بنتحقق بيه
//    من ويبهوك OpenWA الوارد، مالوش علاقة بالخدمة اللي اتمسحت.
const WA_SERVICE_URL = process.env.WA_SERVICE_URL
const WA_SERVICE_SECRET = process.env.WA_SERVICE_SECRET ?? ''

/** فيه قناة واتساب شغّالة؟ */
export function isWhatsAppConfigured(): boolean {
  return isOpenWaConfigured() || !!WA_SERVICE_URL
}

// ============================================================================
// Types
// ============================================================================

export interface WhatsAppSendResult {
  ok: boolean
  wa_message_id?: string
  error?: string
}

export interface SendTextParams {
  to: string // Phone number with country code, no + (e.g., "201002229982")
  /**
   * الـ JID الأصلي للمحادثة (`xxx@s.whatsapp.net` أو `xxx@lid`).
   * لما يبقى موجود بيتقدّم على `to` — لأن واتساب بيبعت مُعرّف مخفي (LID)
   * بدل الرقم، ومفيش طريقة نرجّع منه رقم حقيقي. الرد لازم يروح لنفس الـ JID.
   */
  jid?: string
  body: string
  conversationId?: string
  agentName?: string
  /**
   * رقم المارد اللي هيخرج منه الرد (`201002229982` مثلًا).
   * لو فاضي، الخدمة بتاخد أول رقم متصل — وده غلط لما يبقى
   * عندنا أكتر من رقم: العميل ممكن يجيله رد من رقم ماكلّمهوش.
   */
  session?: string
  aiGenerated?: boolean
}

export interface SendTemplateParams {
  to: string
  templateName: string
  languageCode?: string
  components?: TemplateComponent[]
  conversationId?: string
  agentName?: string
}

export interface TemplateComponent {
  type: 'header' | 'body' | 'button'
  parameters?: Array<{ type: 'text'; text: string }>
  sub_type?: 'quick_reply' | 'url'
  index?: string
}

// ============================================================================
// Phone normalization
// ============================================================================

/**
 * هل ده مُعرّف مخفي (LID) مش رقم تليفون؟
 *
 * واتساب بيدّي بعض المستخدمين مُعرّف زي `23889212117111` بدل رقمهم.
 * ١٤ خانة فأكتر من غير كود دولة معروف = مش رقم.
 * الإرسال لواحد زي ده بيتقبل من Baileys ويدّي ID والرسالة بتضيع.
 */
export function looksLikeLid(raw: string): boolean {
  const d = (raw || '').replace(/\D/g, '')
  if (d.length < 14) return false
  const knownCodes = ['20', '966', '971', '973', '974', '965', '962', '961', '963', '964', '1', '44', '49', '33', '39', '34', '90', '7', '212', '213', '216', '218', '249', '252', '967', '968', '970', '91', '92', '86']
  return !knownCodes.some((c) => d.startsWith(c) && d.length <= 13)
}

/**
 * Normalize Egyptian phone numbers to WhatsApp format.
 * "01002229982" -> "201002229982"
 * "+201002229982" -> "201002229982"
 * "201002229982" -> "201002229982"
 */
export function normalizePhone(raw: string): string {
  let digits = (raw || '').replace(/\D/g, '')
  if (!digits) return ''
  // Egyptian local number starting with 0
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '20' + digits.slice(1)
  }
  // Already has country code
  if (digits.startsWith('20') && digits.length === 12) {
    return digits
  }
  // Otherwise return as-is (international)
  return digits
}

// ============================================================================
// Send text message
// ============================================================================

export async function sendText(params: SendTextParams): Promise<WhatsAppSendResult> {
  // ⚠️ الـ JID له أولوية على الرقم.
  // واتساب بيبعت مُعرّف مخفي (`xxxx@lid`) بدل الرقم الحقيقي، ومفيش طريقة
  // نرجّع منه رقم. لو حاولنا نعيد التركيب بنبعت لرقم مش موجود — الرسالة
  // بتتقبل وبتاخد ID وبتروح في الفراغ. فلما يبقى عندنا JID، نستخدمه زي ما هو.
  let jid = params.jid?.includes('@') ? params.jid : undefined
  // 🚚 (OpenWA) هدف الرد الأصلي زي ما جه من الـwebhook (@lid أو @c.us) — نمسكه
  //    قبل منطق Baileys اللي بيحوّل jid، عشان الرد على OpenWA يروح للـ chatId الصح.
  const openwaReplyChatId = jid
  let to = normalizePhone(params.to)
  if (!to && !jid) {
    return { ok: false, error: 'Invalid phone number' }
  }

  // 🔑 حل الـ LID لرقم حقيقي (٢١ يوليو ٢٠٢٦):
  // Baileys مابيوصّلش بثقة للـ `xxxx@lid` المجرّد — بيقبل الرسالة ويدّي ID
  // والرسالة تروح في الفراغ (ده سبب إن الردود بتتسجّل «اتبعت» وموبايل العميل
  // مايوصلوش حاجة). لكن واتساب بيشاركنا الرقم الحقيقي وبنخزّنه في `wa_lid_map`،
  // فلو معانا الرقم الحقيقي نبعت عليه بدل الـ LID.
  const lidDigits = jid?.endsWith('@lid')
    ? jid.split('@')[0]
    : looksLikeLid(to)
      ? to
      : null
  // لو اضطرينا نجرّب هوية الرقم كخطة بديلة بعد فشل الإرسال على الـLID
  let lidFallbackJid: string | undefined

  if (lidDigits) {
    const { data: mapped } = await supabaseUntyped
      .from('wa_lid_map')
      .select('phone')
      .eq('lid', lidDigits)
      .maybeSingle()
    const realPhone = (mapped as { phone?: string } | null)?.phone
    if (realPhone) {
      // الرقم الحقيقي مفيد للتسجيل في الداتابيز وحارس «رد بس» — بناخده دايمًا.
      to = normalizePhone(realPhone)

      // ⚠️ ٢٤ يوليو ٢٠٢٦ — بس **ماندهسش** الـJID اللي جت منه الرسالة.
      // كان هنا `jid = `${to}@s.whatsapp.net`` بيستبدل هوية الـLID بهوية الرقم.
      // دول **هويتين Signal مختلفتين لنفس الشخص**: الجلسة المتشفّرة اتبنت على
      // هوية الـLID لما هو كلّمنا، فلما نرد على هوية الرقم موبايله بيستقبل شيفرة
      // بجلسة مايعرفهاش ويعرض «في انتظار الرسالة»، ومايبعتش إيصال تسليم.
      //
      // الدليل من لوج رايل واي (٢١:٠٤:٠٩):
      //   📩 وارد from: 30988725919893 (LID)  →  📤 اتبعت to: 201026222337 (رقم)
      //   Closing session: SessionEntry { pendingPreKey: { preKeyId: 172 } }
      // (`Closing session` + `pendingPreKey` على كل إرسال = جلسة جديدة معلّقة كل مرة)
      //
      // ودي نفس قاعدة رقم ١ المكتوبة فوق: «الرد يروح على نفس الـJID اللي جت منه».
      if (!jid) {
        // مالناش JID أصلاً (إحنا البادئين) — الرقم الحقيقي أحسن من LID مجرّد.
        jid = `${to}@s.whatsapp.net`
      } else if (jid.endsWith('@lid')) {
        // معانا JID حقيقي — نرد عليه، ونسيب هوية الرقم كخطة بديلة لو فشل.
        lidFallbackJid = `${to}@s.whatsapp.net`
      }
    }
  }

  // 🔁 ٢٥ يوليو ٢٠٢٦ — **الاتجاه العكسي** (رقم مجرّد من غير JID).
  // ده مسار كل رسالة إحنا اللي بادئينها: ترحيب تسجيل الدخول، الإشعارات،
  // الكرون، الرد اليدوي. كان بيبعت على `<رقم>@s.whatsapp.net` على طول.
  //
  // القياس (٧ أيام، `whatsapp_messages` × `whatsapp_conversations`):
  //     أرسلنا للـLID  → ٥٤٢ رسالة، ٣١٦ إيصال = ٥٨.٣٪
  //     أرسلنا للرقم   → ٢٥٣ رسالة،   ٩ إيصال =  ٣.٦٪
  //
  // والتجربة المضبوطة (نفس الشخص، نفس الساعة، نفس رقمنا):
  //   201148972411 = LID 255370719170741 (المصدر `phoneNumberShare` من واتساب)
  //     ٢٠:٤٧ → ٢٠:٤٨  ٤ رسايل على **الرقم**  → كلها فضلت `sent`
  //     ٢٠:٥٧ → ٢١:٠٠  ٤ رسايل على **الـLID** → كلها `read` خلال ثانية
  //
  // يعني الـLID هو هويته الحيّة عند واتساب، والرقم هوية ميتة. نبعت على
  // الحيّة، ونسيب الرقم كخطة بديلة لو الإرسال فشل (شبكة الأمان تحت).
  //
  // ⚠️ `.maybeSingle()` بترمي لو فيه أكتر من صف (درس متكرر في الملف ده)،
  //    فبناخد أحدث صف بـ`limit(1)` بدلها.
  if (!jid && to && !looksLikeLid(to)) {
    const { data: lidRows } = await supabaseUntyped
      .from('wa_lid_map')
      .select('lid')
      .eq('phone', to)
      .order('created_at', { ascending: false })
      .limit(1)
    const mappedLid = ((lidRows ?? []) as Array<{ lid?: string }>)[0]?.lid
    if (mappedLid) {
      jid = `${mappedLid}@lid`
      lidFallbackJid = `${to}@s.whatsapp.net`
    }
  }

  // 🧪 (٢٥ يوليو ٢٠٢٦) مفتاح «ابعت على الرقم مش على الـLID» — **لكل رقم لوحده**.
  //
  // الملاحظة اللي وراه: كل رسالة فشلت في التشخيص راحت على هوية `@lid`،
  // وولا مرة جرّب جهاز جديد يبعت على هوية الرقم. والرقم الوحيد اللي بيسلّم
  // (201002229982) جلساته اتفتحت **قبل** تحويل واتساب للـLID ومحفوظة على
  // الديسك. ولوج رايلواي بيوري `pendingPreKey` + `Closing session` على كل
  // إرسال — يعني جلسة تشفير جديدة بتتعلّق كل مرة وماتكملش أبدًا.
  //
  // الفرضية: Baileys ٦.٧.٩ مش قادر يفتح جلسة **جديدة** مع هوية LID.
  //
  // ده بديل آمن لترقية Baileys (اللي فشلت مرتين وضربت الرقمين): بنجرّب على
  // الرقم اللي محدّد في `wa_number_configs.prefer_phone_jid` بس، والباقي
  // زي ما هو. والـLID بيفضل خطة بديلة عن طريق شبكة الأمان تحت.
  // الرجوع = `update wa_number_configs set prefer_phone_jid = false`.
  if (params.session && jid?.endsWith('@lid')) {
    try {
      const cfg = await getNumberConfig(params.session)
      if (cfg.prefer_phone_jid) {
        const phoneJid =
          lidFallbackJid || (to && !looksLikeLid(to) ? `${to}@s.whatsapp.net` : undefined)
        if (phoneJid) {
          console.log('[wa] الرقم متظبط يبعت على هوية الرقم', { session: params.session, was: jid, now: phoneJid })
          lidFallbackJid = jid // الـLID بقى الخطة البديلة
          jid = phoneJid
        }
      }
    } catch { /* قراءة الإعداد ماتوقفش الإرسال أبدًا */ }
  }

  // لو لسه مُعرّف مخفي ومعندناش JID جاهز (رسالة إحنا بادئينها —
  // جماعية، إشعار حجز) ومفيش رقم حقيقي في الماب — ندوّر على الـ JID المحفوظ.
  // من غير الخطوة دي الرسالة هتتبعت لرقم مش موجود وتضيع بصمت.
  if (!jid && looksLikeLid(to)) {
    // الرقم الواحد ممكن يكون عنده أكتر من صف محادثة، فـ.maybeSingle() كان
    // بيرمي خطأ ويرجّع null فالرسالة تفشل بصمت. بنجيب أحدث الصفوف ونختار
    // اللي فيه wa_jid محفوظ.
    const { data: convs } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('metadata')
      .eq('contact_phone', params.to)
      .order('last_message_at', { ascending: false })
      .limit(20)

    const saved = ((convs ?? []) as Array<{ metadata?: { wa_jid?: string } | null }>)
      .map((c) => c?.metadata?.wa_jid)
      .find((j) => typeof j === 'string' && j.includes('@'))
    if (saved) {
      jid = saved
    } else {
      return {
        ok: false,
        error: `مُعرّف مخفي من غير JID محفوظ (${to}) — مش هينفع نبعتله من غير ما يكلّمنا الأول`,
      }
    }
  }

  // ── 🚨 وضع «رد بس» ─────────────────────────────────────────────────────
  // ٢٠ يوليو ٢٠٢٦: واتساب حط بلوك على الرقم — **بدء محادثات جديدة بس**،
  // والرد شغّال عادي. السبب: ٥٠ جروب و٣٥ رسالة استلام في يوم واحد.
  //
  // الحارس ده بيمنع أي رسالة لحد ماكلّمناش قبل كده. الرد على اللي
  // بيكلّمنا مالوش أي قيد.
  //
  // ⚠️ ده مش إجراء مؤقت لليومين دول — ده اللي كان المفروض يكون
  //    موجود من الأول. الرقم بيتوقف من الرسايل الباردة، مش من الردود.
  if (process.env.MARID_REPLY_ONLY === '1') {
    const contactKey = params.to || jid?.split('@')[0] || ''
    const isGroup = jid?.endsWith('@g.us')

    if (!isGroup && contactKey) {
      // ⚠️ الرقم الواحد ممكن يكون ليه أكتر من صف محادثة — لقينا رقم
      //    عنده ١٥ صف. `maybeSingle()` بتفشل مع التكرار وبترجّع فاضي،
      //    فالحارس كان بيمنع الرد على ناس كلّمونا فعلاً.
      //    بناخد كل الصفوف وندوّر في أي واحد فيهم.
      // ⚠️ الرقم بيتخزّن بأكتر من صيغة: `+201067122107` و`201067122107`
      //    و`01067122107`. الحارس كان بيقارن بصيغة واحدة، فكان بيقول
      //    «ماكلّمناش» على ناس كلّمونا فعلاً ويمنع الرد عليهم.
      const digits = contactKey.replace(/\D/g, '')
      const forms = [
        params.to,
        contactKey,
        `+${digits}`,
        digits,
        digits.startsWith('20') ? `0${digits.slice(2)}` : `20${digits.replace(/^0/, '')}`,
      ].filter((v, i, a) => v && a.indexOf(v) === i)

      const { data: convs } = await supabaseUntyped
        .from('whatsapp_conversations')
        .select('id')
        .in('contact_phone', forms)
        .limit(30)

      const ids = ((convs ?? []) as { id: string }[]).map((c) => c.id)
      let heTalkedToUs = false

      if (ids.length) {
        const { data: inbound } = await supabaseUntyped
          .from('whatsapp_messages')
          .select('id')
          .in('conversation_id', ids)
          .eq('direction', 'inbound')
          .limit(1)

        heTalkedToUs = Array.isArray(inbound) && inbound.length > 0
      }

      if (!heTalkedToUs) {
        return {
          ok: false,
          error: `وضع «رد بس» — ${contactKey} ماكلّمناش قبل كده، فمش هنبدأ معاه [صيغ:${forms.join('|')} صفوف:${ids.length}]`,
        }
      }
    }
  }

  // ── اختيار الخدمة حسب الرقم ────────────────────────────────────────────
  // 🚚 (٢٥ يوليو ٢٠٢٦) بقى عندنا خدمتين:
  //   `baileys` → wa-service  (الرقم الأساسي — مربوط من شهور وبيسلّم)
  //   `web`     → wa-web      (whatsapp-web.js — واتساب ويب الرسمي في متصفح)
  //
  // الاختيار من `wa_number_configs.transport`، يعني نقل أي رقم بين الخدمتين
  // = تحديث صف واحد، من غير نشر ومن غير ما الرقم التاني يتهز.
  // أي عطل في قراءة الإعداد → بنقع على الخدمة الأصلية (آمن).
  // 🚨 (٢ أغسطس ٢٠٢٦) OpenWA بقى المسار الوحيد.
  //
  //    `wa-service` (جسر Baileys بتاعنا) كان **بيستقبل ولا يسلّم**: الرد
  //    بيتولّد ويتسجّل عندنا في اللوحة، وBaileys بيدّي wa_message_id،
  //    والعميل مايوصلوش حاجة. اتجرّب بالفعل مع عميل حقيقي واتأكد.
  //    الخدمة اتشالت من رايلواي.
  //
  //    فالقاعدة دلوقتي: **طالما OpenWA متظبط، كل الأرقام تعدّي منه** —
  //    مش بس اللي `transport='openwa'`. رقم جديد اتربط من لوحة OpenWA
  //    ولسه ماتسجّلش عندنا كان هيقع على الخدمة الميتة ويضيع رده في
  //    صمت. الافتراض الآمن هو الخدمة الشغالة، مش الصف الناقص.
  //
  //    ⚠️ ماترجّعش الافتراض لـWA_SERVICE_URL غير لما يبقى فيه جسر
  //       **مثبت إنه بيسلّم** — التسجيل في اللوحة مش دليل تسليم.
  let serviceUrl = WA_SERVICE_URL
  if (params.session && isOpenWaConfigured()) {
    // ماننتظرش قراءة الإعداد تنجح: حتى لو الصف ناقص أو القراءة فشلت،
    // OpenWA هو المقصد. الصف بيتعمل لوحده من /api/cron/wa-sync.
    let transport = 'openwa'
    try {
      transport = (await getNumberConfig(params.session)).transport || 'openwa'
    } catch { /* الصف ناقص أو القراءة فشلت — OpenWA برضه */ }

    // `web` القديم كان بيشاور على خدمة اتمسحت — بنعامله كـopenwa.
    if (transport !== 'baileys') {
      const chatId = openwaReplyChatId || (to && !looksLikeLid(to) ? `${to}@c.us` : undefined)
      if (!chatId) {
        return { ok: false, error: `OpenWA: مفيش chatId للإرسال (to=${to || '—'})` }
      }
      const res = await sendTextViaOpenWa(params.session, chatId, params.body)

      // 📝 (٧ أغسطس ٢٠٢٦ — محمد: «مش شايف الحملة بتبعت لحد») مسار OpenWA كان
      //    بيرجع من غير ما يسجّل الرسالة الصادرة خالص، فكل اللي بيخرج منه
      //    **مالهوش أي أثر** في `whatsapp_messages` — لا في اللوحة ولا في أي
      //    تقرير، ومستحيل تعرف أي رقم بعت إيه. دلوقتي بيتسجّل زي مسار Baileys
      //    بالظبط، بالجلسة ومعرّف الرسالة.
      await logOutboundMessage({
        conversationId: params.conversationId,
        to,
        body: params.body,
        agentName: params.agentName,
        aiGenerated: params.aiGenerated ?? false,
        status: res.ok ? 'sent' : 'failed',
        wa_message_id: res.ok ? res.id : undefined,
        errorMessage: res.ok ? undefined : res.error,
        session: params.session,
      })

      // 🆔 (٦ أغسطس ٢٠٢٦) لازم نمرّر معرّف الرسالة لبرّه. كان بيتبلع هنا
      //    (`{ ok: true }` من غير id)، فكل الصادر بيتسجّل بـwa_message_id فاضي
      //    ويستحيل نطابق عليه إيصال التسليم.
      return res.ok
        ? { ok: true, wa_message_id: res.id }
        : { ok: false, error: res.error }
    }
  }

  // ── الإرسال ────────────────────────────────────────────────────────────
  // الرقم بيفضل شغال على الموبايل، والخدمة متربطة كجهاز مرتبط.
  if (serviceUrl) {
    try {
      // 📞 الرد بيخرج من نفس الرقم اللي العميل كلّمه.
      //    من غير `session` الخدمة بتاخد أول رقم متصل — يعني اللي
      //    كلّم الرقم التاني ممكن يجيله رد من الأول، ويوصله كرسالة
      //    من مجهول. ده نفس نمط البدء البارد اللي بيوقّف الأرقام.
      const postSend = async (useJid: string | undefined) => {
        const r = await fetch(`${serviceUrl.replace(/\/$/, '')}/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-madmona-secret': WA_SERVICE_SECRET,
          },
          body: JSON.stringify({ to, jid: useJid, text: params.body, session: params.session }),
        })
        const d = await r.json().catch(() => ({}))
        return { ok: r.ok && !!d?.ok, data: d, error: d?.error ?? `HTTP ${r.status}` }
      }

      let attempt = await postSend(jid)

      // 🛟 شبكة أمان: لو الرد على هوية الـLID فشل، نجرّب هوية الرقم مرة واحدة.
      //    الخدمة بترجّع ok:false من غير ما تبعت حاجة، فمفيش خطر إرسال مزدوج.
      //    كده أسوأ حالة = نفس سلوك ٢١ يوليو، مش رسالة ضايعة.
      if (!attempt.ok && lidFallbackJid) {
        console.warn('[wa] الرد على الـLID فشل — بنجرّب هوية الرقم', {
          lid: jid, fallback: lidFallbackJid, error: attempt.error,
        })
        attempt = await postSend(lidFallbackJid)
      }

      const data = attempt.data

      if (!attempt.ok) {
        const errMsg = attempt.error
        await logOutboundMessage({
          conversationId: params.conversationId,
          to,
          body: params.body,
          agentName: params.agentName,
          aiGenerated: params.aiGenerated ?? false,
          status: 'failed',
          errorMessage: errMsg,
          session: params.session,
        })
        return { ok: false, error: errMsg }
      }

      await logOutboundMessage({
        conversationId: params.conversationId,
        to,
        body: params.body,
        agentName: params.agentName,
        aiGenerated: params.aiGenerated ?? false,
        status: 'sent',
        wa_message_id: data.wa_message_id,
        session: params.session,
      })
      return { ok: true, wa_message_id: data.wa_message_id }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'unknown'
      return { ok: false, error: `wa-service: ${msg}` }
    }
  }

  // ⛔ مفيش مسار تاني — Cloud API اتشال (٢٤ يوليو ٢٠٢٦).
  //    لو وصلنا هنا يبقى `WA_SERVICE_URL` مش متظبط، ولازم ده يبان بوضوح
  //    بدل ما يتبلع في fallback ميت.
  await logOutboundMessage({
    conversationId: params.conversationId,
    to,
    body: params.body,
    agentName: params.agentName,
    aiGenerated: params.aiGenerated ?? false,
    status: 'failed',
    errorMessage: 'WA_SERVICE_URL مش متظبط',
    session: params.session,
  })
  return {
    ok: false,
    error: 'مفيش قناة إرسال — WA_SERVICE_URL مش متظبط (خدمة المارد هي القناة الوحيدة)',
  }
}

// ============================================================================
// الرقم الصح لأي إرسال **لاحق** (مش رد لحظي)
// ============================================================================
/**
 * الرد اللحظي بياخد الرقم من الرسالة الواردة نفسها (`body.session_id`) — وده سليم.
 * إنما أي إرسال **لاحق** (الرد اليدوي من لوحة الأدمن · رسالة ترحيب · إشعار · كرون)
 * كان بياخده من `whatsapp_conversations.session_id`، وده حقل **متغيّر** بيتكتب فوق
 * بعضه كل رسالة واردة.
 *
 * النتيجة: العميل اللي كلّم رقمين بتاعنا ليه صف محادثة واحد، فالإرسال اللاحق ممكن
 * يخرج من رقم **ماكلّمهوش** — ويوصله كرسالة من مجهول، وده نفس نمط البدء البارد
 * اللي بيوقّف الأرقام.
 *
 * الحل: نحدّد الرقم من **آخر رسالة واردة فعلًا** (العمود الثابت على الرسالة)،
 * ونرجع للحقل القديم بس لو الرسايل القديمة لسه من غير نسبة. (٢٤ يوليو ٢٠٢٦)
 */
export async function resolveSessionForConversation(
  conversationId?: string | null
): Promise<string | undefined> {
  if (!conversationId) return undefined
  try {
    const { data } = await supabaseUntyped
      .from('whatsapp_messages')
      .select('session_id')
      .eq('conversation_id', conversationId)
      .eq('direction', 'inbound')
      .not('session_id', 'is', null)
      .order('created_at', { ascending: false })
      .limit(1)

    const fromMsg = (data as { session_id?: string | null }[] | null)?.[0]?.session_id
    if (fromMsg) return fromMsg

    // fallback: الرسايل القديمة (قبل ٢٤ يوليو) مالهاش نسبة — نستخدم الحقل القديم.
    const { data: conv } = await supabaseUntyped
      .from('whatsapp_conversations')
      .select('session_id')
      .eq('id', conversationId)
      .maybeSingle()
    return (conv as { session_id?: string | null } | null)?.session_id ?? undefined
  } catch {
    return undefined // أي عطل → نسيب الخدمة تختار، زي السلوك القديم
  }
}

// ============================================================================
// قوالب واتساب (Templates) — ⛔ اتشالت مع Cloud API
// ============================================================================
// القوالب المعتمدة حاجة خاصة بـ Meta Cloud API بس؛ Baileys مالوش قوالب —
// أي رسالة عنده نص عادي. ومضمونة أصلاً **مابتبدأش محادثات** (MARID_REPLY_ONLY)،
// وده كان الاستخدام الوحيد للقوالب (أول رسالة بعد ٢٤ ساعة).
//
// سايبين الدالة موجودة عشان الكولرز تفضل تكومپايل، بس بترجّع فشل واضح
// بدل ما تبعت على مسار ميت وترجّع خطأ من Meta مالوش علاقة بالسبب.

export async function sendTemplate(params: SendTemplateParams): Promise<WhatsAppSendResult> {
  return {
    ok: false,
    error: `القوالب اتشالت مع Cloud API (${params.templateName}) — استخدم sendText عبر خدمة المارد`,
  }
}

// ============================================================================
// هويات المارد
// ============================================================================

/**
 * 🧞 (٢٥ يوليو ٢٠٢٦ — محمد): «المارد بتاع شات مضمونة خليه منفصل وسميه
 * المارد الرسمي».
 *
 * كل قناة = مارد مستقل بمساره الخاص، وكلهم بنفس القدرات وبذاكرة واحدة:
 *   • `web`          → **المارد الرسمي** (شات الموقع — القناة المملوكة)
 *   • `2010…` وغيره  → المارد على رقم الواتساب ده
 *
 * `WEB_MARID_SESSION` هي القيمة المخزّنة في `session_id` (ماتتغيّرش — فيه
 * داتا قديمة عليها)، و`WEB_MARID_NAME` هو الاسم اللي بيتعرض ويتسجّل في
 * `agent_name`.
 */
export const WEB_MARID_SESSION = 'web'
export const WEB_MARID_NAME = 'المارد الرسمي'

/** الاسم اللي يتعرض لأي قناة: الويب بياخد اسمه، والباقي رقمه. */
export function maridLabel(sessionId?: string | null): string {
  if (!sessionId) return '—'
  return sessionId === WEB_MARID_SESSION ? WEB_MARID_NAME : sessionId
}

// ============================================================================
// Conversation helpers
// ============================================================================

export async function upsertConversation(args: {
  phone: string
  name?: string
  contactType?: 'supplier_lead' | 'customer_lead' | 'existing_supplier' | 'existing_customer' | 'unknown'
  supplierId?: string
  profileId?: string
  agentName?: string
  /**
   * 🔀 (٢٥ يوليو ٢٠٢٦ — محمد): «كل رقم مارد منفصل خالص عن التاني».
   *
   * رقم المارد اللي المحادثة دي بتحصل عليه. المفتاح بقى
   * **(رقم العميل + رقمنا)** مش رقم العميل لوحده.
   *
   * قبل كده الرقمين كانوا بيكتبوا في نفس الصف و`session_id` بيتكتب فوق
   * بعضه كل رسالة واردة — فالرقم التاني بيرد بحالة كتبها الرقم الأول
   * (الـJID المحفوظ، الرقم اللي بيخرج منه الإرسال اللاحق… إلخ).
   *
   * القدرات واحدة للرقمين — المفصول هو **التوجيه** بس.
   * والذاكرة مشتركة عند القراءة (شوف `getConversationHistory`).
   */
  session?: string
}): Promise<string | null> {
  const phone = normalizePhone(args.phone)
  if (!phone) return null

  const { data, error } = await supabaseAdmin.rpc('whatsapp_upsert_conversation', {
    p_phone: phone,
    p_name: args.name ?? null,
    p_contact_type: args.contactType ?? 'unknown',
    p_supplier_id: args.supplierId ?? null,
    p_profile_id: args.profileId ?? null,
    p_agent_name: args.agentName ?? null,
    p_session_id: args.session ?? null,
  })

  if (error) {
    console.error('upsertConversation error:', error.message)
    return null
  }

  return data as string
}

interface LogOutboundParams {
  conversationId?: string
  to: string
  body: string
  agentName?: string
  aiGenerated: boolean
  status: 'sent' | 'failed'
  wa_message_id?: string
  errorCode?: string
  errorMessage?: string
  messageType?: string
  templateName?: string
  templateParams?: unknown
  /**
   * رقم المارد اللي الرسالة خرجت منه. بيتسجّل **على الرسالة نفسها** —
   * مش بيتقري من whatsapp_conversations.session_id لأن ده حقل متغيّر
   * بيتكتب فوق بعضه كل رسالة واردة، فأول ما العميل يكلّم رقم تاني كل
   * تاريخه القديم بيتنسب للرقم الجديد بأثر رجعي.
   * من غير ده مستحيل نقيس صحة تسليم أي رقم. (٢٤ يوليو ٢٠٢٦)
   */
  session?: string
}

async function logOutboundMessage(params: LogOutboundParams): Promise<void> {
  try {
    let conversationId = params.conversationId
    if (!conversationId) {
      conversationId = (await upsertConversation({
        phone: params.to,
        agentName: params.agentName,
      })) ?? undefined
    }
    if (!conversationId) return

    const now = new Date().toISOString()

    await supabaseAdmin.from('whatsapp_messages').insert({
      conversation_id: conversationId,
      direction: 'outbound',
      wa_message_id: params.wa_message_id ?? null,
      body: params.body,
      message_type: params.messageType ?? 'text',
      template_name: params.templateName ?? null,
      template_params: params.templateParams ?? null,
      status: params.status,
      status_updated_at: now,
      error_code: params.errorCode ?? null,
      error_message: params.errorMessage ?? null,
      ai_generated: params.aiGenerated,
      agent_name: params.agentName ?? null,
      session_id: params.session ?? null,
    } as never)

    if (params.status === 'sent') {
      await supabaseAdmin
        .from('whatsapp_conversations')
        .update({
          last_message_at: now,
          last_message_direction: 'outbound',
          last_outbound_at: now,
          // ملاحظة: message_count بيتولّاه تريجر tg_wa_sync_conversation_counters
          // (COALESCE(message_count,0)+1 على كل إدخال رسالة). كان بيتحط 1 يدويًا
          // هنا فبيصفّر العدّاد مع كل رسالة صادرة — وده كان بيخلّي who_is_this
          // مايعرفش العميل الراجع (بيفلتر > 2). شيلناه.
        } as never)
        .eq('id', conversationId)
    }
  } catch (err) {
    console.warn('logOutboundMessage failed:', err)
  }
}

export async function logInboundMessage(args: {
  conversationId: string
  wa_message_id: string
  body: string
  messageType?: string
  /** رقم المارد اللي الرسالة جت عليه — بيتثبّت على الرسالة (شوف LogOutboundParams.session) */
  session?: string
}): Promise<boolean> {
  const now = new Date().toISOString()

  // ⚠️ القاعدة (طلب محمد ٢٢ يوليو): كل رسالة واردة لازم تتسجّل — حتى لو
  // الرد واحد للدفعة. بنستخدم upsert مش insert لسببين:
  //   ١) الجدول فيه قيد فريد على wa_message_id (whatsapp_messages_wa_message_id_key)،
  //      فأي إعادة تسجيل (تخصيب رسالة بميديا، أو سباق بين نسختين من نفس
  //      الرسالة) بتحدّث نفس الصف بدل ما ترمي unique-violation وتضيّع
  //      الرسالة في صمت.
  //   ٢) بنفحص الخطأ ونرجّع boolean — الإدخال الصامت اللي بيفشل من غير ما
  //      حد يعرف هو بالظبط اللي كان بيضيّع رسايل الدفعات.
  //
  // حقول «آخر رسالة» بيتولّاها تريجر tg_wa_sync_conversation_counters على
  // مستوى الداتابيز (AFTER INSERT، بـ GREATEST عشان مايرجّعش الوقت) — فمش
  // محتاجين نحدّث المحادثة يدويًا هنا. (ON CONFLICT DO UPDATE مش بيعيد
  // تفجير تريجرات الـINSERT، فالتصنيف/المطابقة/العدّادات بتشتغل مرة واحدة.)
  const { error } = await supabaseAdmin.from('whatsapp_messages').upsert(
    {
      conversation_id: args.conversationId,
      direction: 'inbound',
      wa_message_id: args.wa_message_id,
      body: args.body,
      message_type: args.messageType ?? 'text',
      status: 'delivered',
      status_updated_at: now,
      ai_generated: false,
      session_id: args.session ?? null,
    } as never,
    { onConflict: 'wa_message_id' }
  )

  if (error) {
    console.error('[logInboundMessage] فشل تسجيل رسالة واردة:', args.wa_message_id, error.message)
    return false
  }

  return true
}

// ============================================================================
// Conversation history loader (for AI context)
// ============================================================================

export async function getConversationHistory(
  conversationId: string,
  limit = 20
): Promise<Array<{ role: 'user' | 'assistant'; content: string }>> {
  // 🧠 (٢٥ يوليو ٢٠٢٦ — محمد): «كل واحد فيهم يتعامل مع العملاء اللي بيبعتوله،
  //    والذاكرة بتاعتهم تتخزن في مكان واحد».
  //
  //    فالتوجيه مفصول (كل رقم ليه صف محادثة خاص بيه — شوف `upsertConversation`)
  //    إنما **الذاكرة مشتركة**: بنجمع تاريخ العميل من كل أرقامنا في خيط واحد
  //    مرتّب بالوقت. يعني لو العميل كلّم رقم النهاردة ورقم تاني بكرة،
  //    المارد عارف الكلام كله ومش هيخلّيه يعيد نفسه.
  //
  //    ⚠️ بنجيب الصفوف الشقيقة بالرقم، مش بالـ`session_id` — عشان أي رقم
  //    جديد يتضاف بعدين يدخل في نفس الذاكرة تلقائيًا من غير أي تعديل.
  const { data: conv } = await supabaseAdmin
    .from('whatsapp_conversations')
    .select('contact_phone')
    .eq('id', conversationId)
    .maybeSingle()

  const phone = (conv as { contact_phone?: string } | null)?.contact_phone
  let conversationIds: string[] = [conversationId]

  if (phone) {
    const { data: siblings } = await supabaseAdmin
      .from('whatsapp_conversations')
      .select('id')
      .eq('contact_phone', phone)
      .limit(20)
    const ids = ((siblings ?? []) as { id: string }[]).map((c) => c.id).filter(Boolean)
    if (ids.length) conversationIds = ids
  }

  const { data } = await supabaseAdmin
    .from('whatsapp_messages')
    .select('direction, body, created_at')
    .in('conversation_id', conversationIds)
    .order('created_at', { ascending: false })
    .limit(limit)

  type Row = { direction: string; body: string; created_at: string }
  const rows = ((data ?? []) as Row[]).reverse()

  return rows.map((r) => ({
    role: r.direction === 'inbound' ? ('user' as const) : ('assistant' as const),
    content: r.body,
  }))
}
