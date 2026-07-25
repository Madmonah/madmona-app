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
      const list = (await r.json()) as Array<{ id: string; name: string }>
      const map: Record<string, string> = {}
      for (const s of list) map[s.name] = s.id
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
function isFalse500(status: number, message: string): boolean {
  return status === 500 && /engine returned no message|no message for this send/i.test(message)
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
    const d = (await r.json().catch(() => ({}))) as { id?: string; message?: string }
    if (r.ok) return { ok: true, id: d.id }
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

// ── استخراج الرقم من chatId ────────────────────────────────────────────────
// `201...@c.us` → رقم واضح. `xxx@lid` → مخفي (نرجّع null ونرد على الـ chatId).
export function phoneFromOpenWaChatId(chatId: string): string | null {
  if (!chatId) return null
  if (chatId.endsWith('@c.us')) return chatId.split('@')[0]
  return null
}
