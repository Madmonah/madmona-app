// src/lib/openwa.ts
// ============================================================================
// عميل OpenWA — طبقة نقل بديلة للبريدج (Baileys).
// الاتصال الحي بيفضل على سيرفر دايم (دلوقتي عبر نفق cloudflared للتجربة،
// وبعدين سيرفر مضمونة). التحليل والتخزين مايتغيروش — Vercel + Supabase زي ما هما.
//
// ⚠️ ملاحظة مهمة: OpenWA برضه بيدّي chatId ممكن يكون `xxx@lid` (مُعرّف مخفي)
//    زي Baileys. القاعدة نفسها: نرد على نفس الـ chatId اللي جت منه الرسالة،
//    مانعيدش تركيب رقم. (whatsapp-web.js بيستخدم `@c.us` مش `@s.whatsapp.net`.)
// ============================================================================

const OPENWA_URL = (process.env.OPENWA_URL || '').replace(/\/$/, '')
const OPENWA_API_KEY = process.env.OPENWA_API_KEY || ''

export function isOpenWaConfigured(): boolean {
  return !!OPENWA_URL && !!OPENWA_API_KEY
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json', 'x-api-key': OPENWA_API_KEY }
}

// كاش بسيط: اسم الجلسة (madmona-982) → معرّفها في OpenWA. بيتجدد كل دقيقة،
// عشان لو اتعمل relink على السيرفر والمعرّفات اتغيّرت مانفضلش على القديمة.
let sessionCache: { at: number; map: Record<string, string> } | null = null

async function getSessionId(sessionName: string): Promise<string | null> {
  const now = Date.now()
  if (!sessionCache || now - sessionCache.at > 60_000) {
    try {
      const r = await fetch(`${OPENWA_URL}/api/sessions`, { headers: jsonHeaders() })
      if (!r.ok) return sessionCache?.map[sessionName] ?? null
      const list = (await r.json()) as Array<{ id: string; name: string; phone?: string | number }>
      const map: Record<string, string> = {}
      for (const s of list) {
        if (s.name) map[s.name] = s.id
        // نفهرس بالرقم كمان: sendText بيمرّر session_id = الرقم (201002229982)،
        // مش اسم الجلسة (madmona-982). من غير ده البحث بالرقم بيفشل والرد مايخرجش.
        const phone = String(s.phone ?? '').replace(/\D/g, '')
        if (phone) map[phone] = s.id
      }
      sessionCache = { at: now, map }
    } catch {
      return sessionCache?.map[sessionName] ?? null
    }
  }
  return sessionCache.map[sessionName] ?? null
}

export interface OpenWaSendResult {
  ok: boolean
  error?: string
  id?: string
}

// الـ500 الكاذب: whatsapp-web.js بيبعت الرسالة فعلاً بس مابيرجّعش تأكيد،
// فالمحوّل بيرمي "engine returned no message for this send" رغم إنها اتسلّمت.
// بنعامل الحالة دي كنجاح عشان المارد مايفتكرش إن الإرسال فشل ويبعت تاني.
function isFalse500(status: number, _message: string): boolean {
  // OpenWA/whatsapp-web.js بترمي "engine returned no message for this send" لما الرسالة
  // تتبعت بس المحرك مايرجّعش تأكيد فوري — التجربة (٤/٤ وصلت) أكّدت إنها بتتسلّم فعلاً.
  // بس NestJS بيلفّه كـ500 عام "Internal server error" فمنقدرش نميّزه بالنص، فبنعامل
  // أي 500 من endpoint الإرسال كنجاح (الرسالة اتبعتت). الأعطال الحقيقية (جلسة مقطوعة أو
  // chatId غلط) بترجع status مختلف (4xx/503) فبتتمسك كفشل صح.
  return status === 500
}

// ── إرسال نص ────────────────────────────────────────────────────────────
export async function sendTextViaOpenWa(
  sessionName: string,
  chatId: string,
  text: string,
): Promise<OpenWaSendResult> {
  if (!isOpenWaConfigured()) return { ok: false, error: 'OpenWA not configured' }
  const id = await getSessionId(sessionName)
  if (!id) return { ok: false, error: `OpenWA session not found: ${sessionName}` }
  try {
    const r = await fetch(`${OPENWA_URL}/api/sessions/${id}/messages/send-text`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ chatId, text }),
    })
    // 🆔 (٦ أغسطس ٢٠٢٦) الردّ الحقيقي من OpenWA شكله `{"messageId":"3EB0…"}`
    //    مش `{"id":…}`. كنا بنقرا `d.id` بس، فالمعرّف كان بيرجع دايمًا undefined
    //    ومحدش يقدر يطابق إيصال التسليم (message.ack) على الرسالة — وده اللي
    //    كان بيخلي بوابة «استنى تأكيد الوصول» في wa-paced-send مش شغالة أصلًا.
    const d = (await r.json().catch(() => ({}))) as { id?: string; messageId?: string; message?: string }
    if (r.ok) return { ok: true, id: d.messageId ?? d.id }
    if (isFalse500(r.status, String(d.message || ''))) return { ok: true }
    return { ok: false, error: d.message || `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── إرسال ميديا عبر رابط عام (صوت/صورة/فيديو) ──────────────────────────────
// OpenWA بياخد رابط للميديا الصادرة (مش base64). للرد الصوتي بنمرّر رابط عام
// لملف الصوت (زي ما المارد بيعمل مع الـ TTS دلوقتي).
export async function sendMediaViaOpenWa(
  sessionName: string,
  chatId: string,
  url: string,
  kind: 'audio' | 'image' | 'video',
  caption?: string,
): Promise<OpenWaSendResult> {
  if (!isOpenWaConfigured()) return { ok: false, error: 'OpenWA not configured' }
  const id = await getSessionId(sessionName)
  if (!id) return { ok: false, error: `OpenWA session not found: ${sessionName}` }
  const path = kind === 'audio' ? 'send-audio' : kind === 'image' ? 'send-image' : 'send-video'
  try {
    const r = await fetch(`${OPENWA_URL}/api/sessions/${id}/messages/${path}`, {
      method: 'POST',
      headers: jsonHeaders(),
      body: JSON.stringify({ chatId, url, caption }),
    })
    const d = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
    if (r.ok) return { ok: true, id: d.id }
    if (isFalse500(r.status, String(d.message || ''))) return { ok: true }
    return { ok: false, error: d.message || `HTTP ${r.status}` }
  } catch (e) {
    return { ok: false, error: (e as Error).message }
  }
}

// ── تحميل ميديا واردة من OpenWA وإرجاعها base64 (لتحليل الصور/تفريغ الصوت) ──
// بياخد الرابط اللي بييجي في حمولة الـ webhook (مطلق أو نسبي)، بيجيبه بالمفتاح.
export async function downloadOpenWaMedia(
  mediaUrl: string,
): Promise<{ base64: string; mimetype: string } | null> {
  if (!mediaUrl) return null
  try {
    const abs = /^https?:\/\//i.test(mediaUrl) ? mediaUrl : `${OPENWA_URL}${mediaUrl}`
    const r = await fetch(abs, { headers: { 'x-api-key': OPENWA_API_KEY } })
    if (!r.ok) return null
    const mimetype = r.headers.get('content-type') || 'application/octet-stream'
    const buf = Buffer.from(await r.arrayBuffer())
    return { base64: buf.toString('base64'), mimetype }
  } catch {
    return null
  }
}

// ── جلب ميديا رسالة واردة من الرقم مباشرة من OpenWA API ─────────────────
// السبب: webhook الـ OpenWA بيبعت إشعار الرسالة من غير الميديا (base64) عشان حجمها.
// لكن الميديا موجودة كاملة في قايمة الرسائل (metadata.media.data). فبنجيبها بنداء API.
// 🐞 (١٤ أغسطس ٢٠٢٦) **الباج اللي ضيّع شغل الموردين لأربع أيام.**
//
// الأعراض: مورد يبعت ١٦ صورة منتجات، النظام يسجّل الـ١٦ رسالة بالأسعار
// صح — و**صفر صورة تتحفظ**. الأسعار عندنا والصور راحت. (ضاحي ١٠ و١١
// أغسطس = ٢٠ صورة، وإعادة الإرسال ١٤ أغسطس = ١٦ صورة، كلهم ضاعوا.)
//
// السبب — أربع عيوب في الدالة دي مجتمعة:
//
//  ١) **`limit=15` نافذة صغيرة جدًا.** لما المورد يبعت دفعة، الويبهوكس
//     بتتنفّذ بالتوازي وكلها بتقرا نفس القايمة. الصور الجديدة بتزقّ
//     القديمة برّه الـ١٥ قبل ما ويبهوكها يتنفّذ → القايمة مافيهاش رسالته.
//
//  ٢) **مطابقة المعرّف ضيقة.** بنقارن `waMessageId`/`id` كنص خام بس.
//     OpenWA بيرجّع المعرّف أحيانًا ككائن `{_serialized}` (زي ما بنعمل
//     في `message.ack` بالظبط) — فالمقارنة بتفشل من غير ما نحس.
//
//  ٣) **الرجوع لـ«آخر ميديا من الرقم»** — ده مش fallback، ده خطر:
//     في دفعة ٢٠ صورة كله بيطابق، فممكن نحفظ صورة المنتج الغلط على
//     السعر الغلط. (نفس عيلة باج «الصورة الغلط على المنتج».)
//
//  ٤) **بترجّع `null` في صمت.** مفيش لوج يفرّق بين «مالقيناش» و«لقينا
//     من غير بيانات» — فالباج عاش أربع أيام من غير ما يبان.
//
// الإصلاح: نوسّع النافذة، نطابق المعرّف بكل أشكاله، **ونطابق بالمعرّف
// فقط** (مافيش تخمين بالرقم)، ونلوّج سبب كل فشل.
export async function fetchInboundMediaByPhone(
  sessionName: string,
  phoneDigits: string,
  waMessageId?: string,
): Promise<{ base64: string; mimetype: string; is_voice_note: boolean } | null> {
  const MAX_ATTEMPTS = 3
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
   try {
    const id = await getSessionId(sessionName)
    if (!id) {
      console.error('[openwa-media] مالقيناش الجلسة', sessionName)
      return null
    }

    // 🔑 (١) النافذة: ٥٠ بدل ١٥. دفعة ٢٦ صورة (حصلت فعلًا) كانت بتطفّح
    //    الـ١٥ وهي لسه بتتعالج. ٥٠ بتغطّي أكبر دفعة شفناها بضعف الهامش.
    const r = await fetch(
      `${OPENWA_URL}/api/sessions/${id}/messages?direction=inbound&limit=50`,
      { headers: jsonHeaders() },
    )
    if (!r.ok) {
      console.error('[openwa-media] API رفض', r.status, sessionName)
      return null
    }
    const j = (await r.json()) as any
    const msgs: any[] = j?.messages || j?.data || (Array.isArray(j) ? j : [])
    const isMedia = (m: any) =>
      ['image', 'video', 'audio', 'voice', 'ptt', 'document', 'sticker'].includes(m?.type)

    // 🔑 (٢) المعرّف ممكن يكون نص أو `{_serialized}`. بنطبّع الاتنين.
    const idOf = (v: unknown): string =>
      String((v as Record<string, unknown> | null)?.['_serialized'] ?? v ?? '')
    const want = idOf(waMessageId)

    // 🔑 (٣) **بالمعرّف بس.** الرجوع لـ«آخر ميديا من الرقم» اتشال خالص:
    //    في دفعة كبيرة كل الصور بتطابق الرقم، فالتخمين ده بيلزق الصورة
    //    الغلط على السعر الغلط — وده أسوأ من إننا مانحفظش.
    const hit = want
      ? msgs.find((m) => isMedia(m) && (idOf(m?.waMessageId) === want || idOf(m?.id) === want))
      : null

    if (!hit) {
      // 🔑 (٤) لوج صريح — ده اللي كان ناقص وخلّى الباج يعيش ٤ أيام.
      console.error('[openwa-media] الرسالة مش في النافذة', {
        want: want.slice(0, 40),
        window: msgs.length,
        mediaInWindow: msgs.filter(isMedia).length,
        phone: (phoneDigits || '').slice(0, 15),
        attempt,
      })
      // 🔁 سباق حقيقي: الويبهوك بيوصل أسرع من ما OpenWA يفهرس الرسالة في
      //    قايمته. مالقيناهاش دلوقتي ≠ مش موجودة. بنستنى ونجرّب تاني —
      //    من غير ده أي رسالة تسبق الفهرسة بتضيع نهائي (وده بالظبط اللي
      //    كان بيحصل في الدفعات السريعة).
      if (attempt < MAX_ATTEMPTS) {
        await new Promise((res) => setTimeout(res, 1500 * attempt))
        continue
      }
      return null
    }

    const media = hit?.metadata?.media || hit?.media
    if (!media?.data) {
      console.error('[openwa-media] لقينا الرسالة بس من غير بيانات', {
        want: want.slice(0, 40),
        type: hit?.type,
      })
      return null
    }
    return {
      base64: String(media.data),
      mimetype: String(media.mimetype || 'application/octet-stream'),
      is_voice_note: hit.type === 'ptt' || hit.type === 'voice' || hit.type === 'audio',
    }
   } catch (err) {
    console.error('[openwa-media] استثناء', err instanceof Error ? err.message : err, { attempt })
    if (attempt < MAX_ATTEMPTS) {
      await new Promise((res) => setTimeout(res, 1500 * attempt))
      continue
    }
    return null
   }
  }
  return null
}

// ── استخراج الرقم من chatId ────────────────────────────────────────────────
// `201...@c.us` → رقم واضح. `xxx@lid` → مخفي (نرجّع null ونرد على الـ chatId).
export function phoneFromOpenWaChatId(chatId: string): string | null {
  if (!chatId) return null
  if (chatId.endsWith('@c.us')) return chatId.split('@')[0]
  return null
}
