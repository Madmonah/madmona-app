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
//
// 🐞 (١٦ أغسطس ٢٠٢٦ — محمد: «الڤويس اللي في شات مضمونة فيه مشكلة»)
//
//    الڤويس مكانش **بيفشل** — كان بيتفرّغ **غلط**، وده أخطر لأن المارد
//    كان بيرد على كلام العميل ماقالهوش. من الداتابيز:
//      «سمعت بذور على شعف مصرق يدي»   (١٦ أغسطس)
//      «عائلين ماتفع مرغور فماثرق يدي» (١٥ أغسطس)
//      «ترجمة نانسي قنقر»              (١٢ أغسطس)
//    و٢٨ رسالة صوتية من الشات، **صفر** منهم اتسجّل كفشل — لأن الكود كان
//    بيعتبر أي نص راجع نجاح.
//
//    السبب: الملف كان بيتبعت باسم `voice.ogg` **دايمًا** مهما كانت صيغته،
//    والمتصفح بيلزق عليه `audio/webm` مهما كان اللي سجّله (الآيفون بيسجّل
//    `audio/mp4`). تلات أسماء متضاربة لنفس الملف → Whisper بيفك تشفير
//    ضوضاء ويطلّع عربي متماسك بس مالوش معنى.
//
// ⚠️ «ترجمة نانسي قنقر» مش صدفة — دي هلوسة معروفة في Whisper لما يسمع
//    سكوت أو ضوضاء: بيطلّع نص تترات أفلام من بيانات تدريبه. لازم تتفلتر،
//    وإلا المارد بيرد على اسم مذيعة.

/** صيغ Whisper المدعومة → الامتداد الصح للملف. */
function extFor(mime: string | undefined): string {
  const m = (mime || '').toLowerCase().split(';')[0].trim()
  const map: Record<string, string> = {
    'audio/webm': 'webm', 'video/webm': 'webm',
    'audio/mp4': 'm4a', 'audio/x-m4a': 'm4a', 'audio/aac': 'm4a', 'video/mp4': 'mp4',
    'audio/ogg': 'ogg', 'audio/opus': 'ogg', 'audio/vorbis': 'ogg',
    'audio/mpeg': 'mp3', 'audio/mp3': 'mp3',
    'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/wave': 'wav',
    'audio/flac': 'flac', 'audio/amr': 'amr',
  }
  return map[m] || 'ogg'
}

/**
 * نصوص Whisper بيطلّعها من السكوت والضوضاء (تترات من بيانات التدريب).
 * لو النص ده رجع، يبقى مافيش كلام أصلاً — وأحسن نقول للعميل يعيد بدل
 * ما نرد على حاجة ماقالهاش.
 */
const HALLUCINATIONS = [
  'ترجمة نانسي قنقر', 'ترجمة نانسي', 'قنقر',
  'اشتركوا في القناة', 'اشترك في القناة', 'لا تنسى الاشتراك',
  'شكرا للمشاهدة', 'شكرًا للمشاهدة', 'شكرا على المشاهدة',
  'أراكم في الحلقة القادمة', 'إلى اللقاء في الحلقة',
  'amara.org', 'subscribe', 'ترجمة وتدقيق',
]

function looksLikeNoise(text: string): boolean {
  const t = text.trim()
  if (t.length < 2) return true
  const low = t.toLowerCase()
  if (HALLUCINATIONS.some((h) => low.includes(h.toLowerCase()))) return true
  // نص من كلمة واحدة مكررة («طيب طيب طيب») = ضوضاء
  const words = t.split(/\s+/)
  if (words.length >= 4 && new Set(words).size === 1) return true
  return false
}

export async function transcribeAudio(m: { data_base64: string; mimetype?: string }): Promise<string | null> {
  const key = process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY
  if (!key) {
    console.warn('[transcribeAudio] مفيش GROQ_API_KEY ولا OPENAI_API_KEY')
    return null
  }
  const isGroq = !!process.env.GROQ_API_KEY
  const url = isGroq
    ? 'https://api.groq.com/openai/v1/audio/transcriptions'
    : 'https://api.openai.com/v1/audio/transcriptions'
  try {
    const form = new FormData()
    const bytes = Buffer.from(m.data_base64, 'base64')
    const mime = m.mimetype || 'audio/ogg'
    // ⚠️ الامتداد لازم يطابق النوع الحقيقي — ده كان أصل البق كله
    form.append('file', new Blob([bytes], { type: mime }), `voice.${extFor(mime)}`)
    // 🎙️ (٢ سبتمبر ٢٠٢٦) محمد: «كل ما أبعت فويس مش بيرد».
    //
    //    القياس على شات الموقع: ٣١ رسالة صوتية، **كلها اتردّ عليها** —
    //    بس الرد كان «مش فاهم، اكتبها». يعني المشكلة مش في الرد ولا في
    //    وصول الملف (بيوصل ١٠٠٪ من المتصفح) — **التفريغ نفسه بيطلّع
    //    كلام مالوش معنى**: «هايز عرف انت ساقال ثوتو ألمي ساقال».
    //
    //    السبب: whisper-large-v3-**turbo** متعمَّل للسرعة، ودقته في
    //    اللغات غير الإنجليزية (والعامية المصرية خصوصًا) أقل بوضوح من
    //    النسخة الكاملة. large-v3 أبطأ شوية وأغلى شوية على Groq
    //    (~٠.١١١$ مقابل ٠.٠٤$ للساعة صوت) — وبحجمنا الحالي (~٣٠ رسالة
    //    في الشهر، ثواني للواحدة) الفرق كسور القرش.
    //    قابل للتغيير من غير نشر: WHISPER_MODEL.
    form.append('model', isGroq ? (process.env.WHISPER_MODEL || 'whisper-large-v3') : 'whisper-1')
    form.append('language', 'ar')
    // صفر عشوائية: الهلوسة بتزيد مع الحرارة العالية
    form.append('temperature', '0')
    // 🔤 البرومبت هنا **تلميح مفردات** مش وصف مهمة. الجملة الطويلة
    //    القديمة كانت بتسحب Whisper ناحية كلمات المنصة وتزوّد الانحراف.
    //    أسماء بس، من غير سياق يوجّه المعنى.
    form.append('prompt', 'مضمونة، إعلان، عقار، شقة، فيلا، عربية، حجز، مطعم، مقدم، تقسيط.')

    const res = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${key}` }, body: form })
    if (!res.ok) {
      // كان `return null` صامت — فمكانش فيه أي أثر لما يفشل
      console.error('[transcribeAudio] فشل', res.status, (await res.text()).slice(0, 300), 'mime=', mime)
      return null
    }
    const text = ((await res.json())?.text as string) || ''
    if (looksLikeNoise(text)) {
      console.warn('[transcribeAudio] النص المرجّع ضوضاء/هلوسة — اترفض:', text.slice(0, 120), 'mime=', mime)
      return null
    }
    return text.trim() || null
  } catch (e) {
    console.error('[transcribeAudio] استثناء', (e as Error)?.message)
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
    // ⚠️ لما التفريغ يفشل، المارد لازم **يقول للعميل** مش يخمّن. قبل كده
    //    كان بيوصله نص مهلوس فيرد عليه جد.
    textHint = t || '[رسالة صوتية مش قادر أسمعها كويس — اعتذرله واطلب منه يبعتها تاني أو يكتبها]'
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
