// ميديا المارد — حفظ في الستوريدج + تفريغ الصوت + تجهيز بلوكات لـ Claude.
// نفس منطق مسار الواتساب، متاح لأي قناة (الشات).
import { supabaseUntyped } from '@/lib/supabase'

export type MediaInput = {
  type: 'image' | 'audio' | 'video' | 'document'
  mimetype: string
  data_base64: string
  filename?: string | null
}

// ── تفريغ الصوت (Claude مابيسمعش — Whisper عبر Groq/OpenAI) ──────────────
export async function transcribeAudio(m: { data_base64: string; mimetype?: string }): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!key) return null
  const isGroq = !!process.env.GROQ_API_KEY
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions'
  try {
    const form = new FormData()
    const bytes = Buffer.from(m.data_base64, 'base64')
    form.append('file', new Blob([bytes], { type: m.mimetype || 'audio/ogg' }), 'voice.ogg')
    form.append('model', isGroq ? 'whisper-large-v3-turbo' : 'whisper-1')
    form.append('language', 'ar')
    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
    if (!res.ok) return null
    return ((await res.json())?.text as string) || null
  } catch {
    return null
  }
}

// ── حفظ الميديا في الستوريدج ─────────────────────────────────────────────
// الصور → content-images · الفيديو والباقي → project-media
export async function saveMedia(m: MediaInput, phone: string): Promise<string | null> {
  try {
    const bucket = m.type === 'image' ? 'content-images' : 'project-media'
    const ext =
      (m.filename?.split('.').pop() || '').toLowerCase() ||
      (m.mimetype.split('/')[1] || 'bin').split(';')[0]
    const safePhone = (phone || 'web').replace(/\D/g, '') || 'web'
    const path = `chat/${safePhone}/${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`
    const { error } = await supabaseUntyped.storage
      .from(bucket)
      .upload(path, Buffer.from(m.data_base64, 'base64'), {
        contentType: m.mimetype || 'application/octet-stream',
        upsert: false,
      })
    if (error) return null
    const { data } = supabaseUntyped.storage.from(bucket).getPublicUrl(path)
    return data?.publicUrl ?? null
  } catch {
    return null
  }
}

// ── تجهيز ميديا واردة للمارد ──────────────────────────────────────────────
// بيرجّع: بلوكات Claude (صور/PDF)، الرابط المحفوظ، وتلميح نصي.
export async function processIncomingMedia(
  m: MediaInput,
  phone: string
): Promise<{ blocks: Array<Record<string, unknown>>; savedUrl: string | null; textHint: string }> {
  const savedUrl = await saveMedia(m, phone)
  const blocks: Array<Record<string, unknown>> = []
  let textHint = ''

  if (m.type === 'audio') {
    const t = await transcribeAudio(m)
    textHint = t || '[رسالة صوتية — مش قادر أفرّغها دلوقتي]'
  } else if (m.type === 'image' && m.mimetype.startsWith('image/')) {
    blocks.push({ type: 'image', source: { type: 'base64', media_type: m.mimetype, data: m.data_base64 } })
    textHint = 'العميل بعت الصورة دي — شوفها ورد عليه.'
  } else if (m.mimetype === 'application/pdf') {
    blocks.push({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: m.data_base64 } })
    textHint = 'العميل بعت الملف ده — اقراه ورد عليه.'
  } else if (m.type === 'video') {
    textHint = `العميل بعت فيديو${savedUrl ? ` (اتحفظ: ${savedUrl})` : ''} — مش قادر أشوفه، اسأله يوصفلك اللي فيه.`
  } else {
    textHint = `العميل بعت ملف${m.filename ? ` (${m.filename})` : ''}.`
  }

  return { blocks, savedUrl, textHint }
}
