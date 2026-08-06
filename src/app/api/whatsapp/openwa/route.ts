// src/app/api/whatsapp/openwa/route.ts
// ============================================================================
// نقطة استقبال OpenWA — بتاخد webhook الرسائل الواردة من جسر OpenWA،
// بتترجمها لنفس صيغة حمولة Baileys اللي المخ (route baileys) بيفهمها،
// وبتحوّلها له. كده المخ بحراسه كله (منع تكرار، claim، إيقاف، loop، تفريغ
// الصوت، رؤية الصور، تخزين الميديا) بيتعاد استخدامه ١٠٠٪ من غير تكرار.
//
// الرد بيخرج عن طريق sendText → فرع openwa (لأن session_id هيكون رقم عليه
// transport='openwa')، فبيروح لنفس الـ chatId اللي جت منه الرسالة.
//
// 🔒 أمان: النقطة دي مكشوفة على النت. بنتحقق من توكن في الـURL (?token=)
//    عشان محدش يقدر يزوّر رسائل واردة ويشغّل المارد. التوكن = WA_SERVICE_SECRET.
// ============================================================================

import { NextRequest, NextResponse } from 'next/server'
import { downloadOpenWaMedia, fetchInboundMediaByPhone } from '@/lib/openwa'
import { supabaseUntyped } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

const SECRET = process.env.WA_SERVICE_SECRET ?? ''

// نوع الحمولة اللي بتيجي من OpenWA (data جوّاها فيها بيانات الرسالة).
interface OpenWaWebhook {
  event?: string
  timestamp?: number
  data?: Record<string, unknown>
}

// رقمنا المستقبِل (session_id في wa_number_configs) من data.to.
function receivingNumber(data: Record<string, unknown>): string | null {
  for (const key of ['to', 'sessionPhone', 'me']) {
    const digits = String(data[key] ?? '').replace(/\D/g, '')
    if (/^20\d{10}$/.test(digits)) return digits
  }
  return null
}

export async function POST(req: NextRequest) {
  // 🔒 توقيع
  if (SECRET) {
    const token = req.nextUrl.searchParams.get('token')
    if (token !== SECRET) {
      return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
    }
  }

  let payload: OpenWaWebhook
  try {
    payload = (await req.json()) as OpenWaWebhook
  } catch {
    return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 })
  }

  const event = payload.event
  const data = payload.data ?? {}

  // 🪵 أول تشخيص: نطبع شكل الحمولة كاملة عشان نتأكد من أسماء الحقول
  //    (الميديا/الرقم المستقبِل) على أول رسايل حقيقية. نشيله بعد التثبيت.
  console.log('[openwa-relay] وارد', JSON.stringify({ event, keys: Object.keys(data), data }).slice(0, 2000))

  // ✅ (٦ أغسطس ٢٠٢٦) إيصالات التسليم — `message.ack`
  //    قبل كده كنا بنرمي كل حدث مش `message.received`، فمكانش عندنا **أي**
  //    إثبات إن الرسالة الصادرة وصلت فعلًا (كل الصادر بيفضل `sent` للأبد).
  //    مستويات الـack في whatsapp-web.js: 1 = وصلت السيرفر · 2 = اتسلّمت
  //    للجهاز · 3 = اتقريت. بنسجّلها على `whatsapp_messages.wa_message_id`
  //    عشان الإرسال المتدرّج (wa-paced-send) يقدر يستنى تأكيد وصول حقيقي.
  if (event === 'message.ack') {
    const waId = String(
      (data.id as Record<string, unknown> | undefined)?._serialized ?? data.id ?? data.messageId ?? ''
    )
    const ack = Number(data.ack ?? data.ackLevel ?? 0)
    if (waId && ack >= 2) {
      const status = ack >= 3 ? 'read' : 'delivered'
      const now = new Date().toISOString()
      // سجل الرسالة نفسه (لو اتسجّل)
      await supabaseUntyped
        .from('whatsapp_messages')
        .update({ status, status_updated_at: now })
        .eq('wa_message_id', waId)
      // ✅ والأهم: صف الحملة — ده اللي `wa-paced-send` بيعتمد عليه كبوابة،
      //    عشان مايكونش معتمد على إن الصادر اتسجّل في whatsapp_messages أصلًا.
      await supabaseUntyped
        .from('whatsapp_campaign_messages')
        .update({ status, delivered_at: now, ...(ack >= 3 ? { read_at: now } : {}) })
        .eq('whatsapp_msg_id', waId)
        .in('status', ['sent', 'delivered'])
    }
    return NextResponse.json({ ok: true, event, ack, recorded: !!waId && ack >= 2 })
  }

  // الوارد بس
  if (event && event !== 'message.received') {
    return NextResponse.json({ ok: true, skipped: 'not_received', event })
  }
  const direction = String(data.direction ?? '')
  if (direction && direction !== 'incoming') {
    return NextResponse.json({ ok: true, skipped: 'not_incoming', direction })
  }

  // 🛡️ (31 يوليو 2026 — محمد اشتكى من ردّين على كل رسالة) whatsapp-web.js
  // بيعمل self-echo أحيانًا: الرسالة اللي *إحنا* بعتناها بترجع كـwebhook تاني
  // (خصوصًا مع أجهزة مرتبطة/مزامنة). لو مفيش فحص fromMe، المخ بيشوف ردّه هو
  // كأنه رسالة عميل جديدة ويرد عليها تاني — فيطلع ردّين. direction وحدها
  // (فوق) مش كفاية لأنها ممكن تيجي فاضية/مش موجودة في الحمولة.
  const fromMe = data.fromMe === true || data.from_me === true || data.isMe === true
  if (fromMe) {
    return NextResponse.json({ ok: true, skipped: 'from_me' })
  }
  const chatId = String(data.chatId ?? data.from ?? '')
  const fromRaw = String(data.from ?? data.author ?? chatId)
  const isLid = chatId.endsWith('@lid') || fromRaw.endsWith('@lid')
  const rawType = String(data.type ?? 'text')
  // ptt = رسالة صوتية؛ نوحّدها audio زي ما المخ بيفهم.
  const type = (rawType === 'ptt' || rawType === 'voice') ? 'audio' : rawType === 'chat' ? 'text' : rawType
  const body = typeof data.body === 'string' ? (data.body as string) : ''
  const waMessageId = String(data.waMessageId ?? data.id ?? '')
  const name = (data.chatName as string) || (data.author as string) || undefined

  const sessionId = receivingNumber(data)
  if (!sessionId) {
    console.error('[openwa-relay] مش عارف الرقم المستقبِل', { to: data.to, sessionId: data.sessionId })
    return NextResponse.json({ ok: false, error: 'unknown receiving number', to: data.to ?? null })
  }

  const fromDigits = fromRaw.replace(/@.*/, '').replace(/\D/g, '')

  // ── ميديا → base64 (لو ميديا) ────────────────────────────────────────
  // OpenWA بيدّي رابط للميديا في الحمولة. أسماء الحقول المحتملة بنجرّبها،
  // والتشخيص فوق بيوري الاسم الحقيقي على أول رسالة ميديا فنظبّطه لو لزم.
  let media:
    | { mimetype: string; is_voice_note: boolean; data_base64: string; seconds?: number }
    | undefined
  const isMediaType = ['image', 'video', 'audio', 'voice', 'ptt', 'document', 'sticker'].includes(type)
  if (isMediaType) {
    const meta = (data.metadata as Record<string, unknown>) ?? {}
    const mediaUrl =
      (data.mediaUrl as string) ||
      ((data.media as Record<string, unknown>)?.url as string) ||
      (meta.mediaUrl as string) ||
      (meta.url as string) ||
      ''
    // Awwalan: OpenWA byeb3at el media inline base64 (media.data) mesh rabet.
    const mediaObj = (data.media as Record<string, unknown>) ?? (meta.media as Record<string, unknown>) ?? {}
    const inlineB64 = (mediaObj?.data as string) || ''
    const inlineMime = (mediaObj?.mimetype as string) || ''
    if (inlineB64) {
      const seconds = Number(data.duration ?? meta.duration ?? 0) || undefined
      media = {
        mimetype: String(inlineMime || 'application/octet-stream'),
        is_voice_note: rawType === 'ptt' || type === 'audio',
        data_base64: String(inlineB64),
        seconds,
      }
    } else if (mediaUrl) {
      const dl = await downloadOpenWaMedia(String(mediaUrl))
      if (dl) {
        const seconds = Number(data.duration ?? meta.duration ?? 0) || undefined
        media = {
          mimetype: dl.mimetype,
          is_voice_note: rawType === 'ptt' || type === 'audio',
          data_base64: dl.base64,
          seconds,
        }
      } else {
        console.error('[openwa-relay] فشل تحميل الميديا', { mediaUrl: String(mediaUrl).slice(0, 120) })
      }
    } else {
      // el webhook mfihosh el media. bengibha men OpenWA API mobasharatan.
      const fetched = await fetchInboundMediaByPhone(sessionId, fromDigits, waMessageId)
      if (fetched) {
        const seconds = Number(data.duration ?? meta.duration ?? 0) || undefined
        media = {
          mimetype: fetched.mimetype,
          is_voice_note: fetched.is_voice_note || rawType === 'ptt' || type === 'audio',
          data_base64: fetched.base64,
          seconds,
        }
      } else {
        console.error('[openwa-relay] media API failed', { type, metaKeys: Object.keys(meta) })
      }
    }
  }

  // ── صيغة baileys ─────────────────────────────────────────────────────
  const brainPayload = {
    from: fromDigits || chatId,
    type,
    text: body,
    reply_jid: chatId, // ← OpenWA chatId؛ فرع openwa في sendText بيستخدمه للرد
    session_id: sessionId, // ← رقمنا المستقبِل (عليه transport='openwa')
    name,
    message_id: waMessageId,
    is_lid: isLid,
    ...(media ? { media } : {}),
  }

  // ── رقم جديد اتربط من لوحة OpenWA؟ نسجّله فورًا ──────────────────────
  //
  // الكرون بيمسح كل ١٠ دقايق، بس رسالة من رقم لسه متربط مايصحّش تستنى
  // ١٠ دقايق. أول رسالة من جلسة مش متسجّلة بتعمل المزامنة على طول،
  // فالرقم بيشتغل من أول رسالة.
  //
  // ⚠️ مابنستناش النتيجة ومابنوقفش التحويل عليها — المزامنة حاجة
  //    مساعدة، والرد للعميل أهم منها.
  if (sessionId) {
    void ensureNumberRegistered(sessionId)
  }

  // ── تحويل للمخ (نفس الديبلوي) ────────────────────────────────────────
  const brainUrl = `${req.nextUrl.origin}/api/whatsapp/baileys`
  try {
    const r = await fetch(brainUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-madmona-secret': SECRET },
      body: JSON.stringify(brainPayload),
    })
    const d = (await r.json().catch(() => ({}))) as Record<string, unknown>
    console.log('[openwa-relay] المخ رد', { status: r.status, ...d })
    return NextResponse.json({ ok: r.ok, forwarded: true, brain: d })
  } catch (e) {
    console.error('[openwa-relay] فشل التحويل للمخ', (e as Error).message)
    return NextResponse.json({ ok: false, error: (e as Error).message })
  }
}

// ── تسجيل رقم جديد أول مرة نشوفه ────────────────────────────────────────
//
// كاش في الذاكرة عشان مانضربش الداتابيز مع كل رسالة. الكاش بيضيع مع كل
// نشر جديد وده مقصود — أول رسالة بعد النشر بتتأكد إن الصف لسه موجود.
const seenSessions = new Set<string>()

async function ensureNumberRegistered(sessionId: string): Promise<void> {
  if (seenSessions.has(sessionId)) return
  seenSessions.add(sessionId)
  try {
    const { data } = await supabaseUntyped
      .from('wa_number_configs')
      .select('session_id')
      .eq('session_id', sessionId)
      .maybeSingle()
    if (data) return

    console.log('[openwa-relay] رقم جديد من اللوحة — بنزامن', sessionId)
    const { syncOpenWaNumbers } = await import('@/app/api/cron/wa-sync/route')
    const r = await syncOpenWaNumbers()
    console.log('[openwa-relay] المزامنة خلصت', {
      added: r.numbers_added,
      hooks: r.webhooks_added,
      err: r.error,
    })
  } catch (e) {
    // فشل المزامنة مايقفش الرسالة — الكرون هيمسك الرقم بعد شوية
    console.error('[openwa-relay] فشلت مزامنة رقم جديد', (e as Error).message)
    seenSessions.delete(sessionId) // نجرّب تاني مع الرسالة الجاية
  }
}

// فحص صحة بسيط (GET) — يسهّل التأكد إن النقطة منشورة.
export async function GET() {
  return NextResponse.json({ ok: true, service: 'openwa-relay', configured: !!SECRET })
}
