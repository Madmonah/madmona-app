// ============================================================================
// 👁️ /api/vision/process — قراءة صور واتساب بـGemini Flash
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايزين موديل يقراها من غير الأنثروبيك».
//
// 🎯 ليه Gemini Flash: **مجاني حتى ١٥٠٠ صورة/يوم**، وإحنا بنستقبل
//    ٢٩ صورة في اليوم — يعني صفر تكلفة فعليًا. وعربيته كويسة.
//
// 🔑 محتاج GEMINI_API_KEY في .env.local — من aistudio.google.com
//    ولو مش موجود، المسار بيرجّع رسالة واضحة ومابيكسرش حاجة.
//
// 🔁 بيشتغل على دفعات صغيرة (١٠ صور) عشان مايتعلقش، والكرون بينده
//    عليه كل شوية.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 60

const GEMINI_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent'

/** 📝 البرومبت — وصف عملي للإعلانات مش وصف فني */
const PROMPT = `اوصف الصورة دي بالعربي في سطر أو اتنين، للاستخدام في سوق إلكتروني مصري.

المطلوب:
- لو الصورة عقار: النوع (شقة/فيلا/محل...) والمساحة والدور والتشطيب لو باينين
- لو عربية: الماركة والموديل واللون والحالة
- لو منتج: اسمه ونوعه وحالته
- لو فيها كتابة (سعر · تليفون · اسم مشروع): اكتبها زي ما هي
- لو صورة تفصيلة داخل وحدة (حمام · مطبخ · سلم): ابدأ الوصف بالحاجة نفسها

⛔ ماتخترعش أسعار ولا مساحات مش مكتوبة أو باينة.
⛔ ماتبدأش بـ"الصورة تُظهر" — ابدأ بالوصف على طول.`

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/** 🖼️ بنجيب الصورة ونحوّلها base64 — Gemini بياخدها كده */
async function fetchImageBase64(url: string): Promise<{ data: string; mime: string } | null> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
    if (!r.ok) return null
    const mime = r.headers.get('content-type') || 'image/jpeg'
    if (!mime.startsWith('image/')) return null
    const buf = Buffer.from(await r.arrayBuffer())
    // 🛑 الصور الضخمة بتكلّف وقت من غير فايدة
    if (buf.byteLength > 8 * 1024 * 1024) return null
    return { data: buf.toString('base64'), mime }
  } catch {
    return null
  }
}

async function describeWithGemini(
  key: string, b64: string, mime: string,
): Promise<string | null> {
  // 🔁 الخدمة بترجّع 503 «high demand» أحيانًا — اتأكدت بالتجربة.
  //    تلات محاولات بتباعد بتحلّها؛ الفشل الحقيقي نادر.
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) await new Promise((r) => setTimeout(r, 2500 * attempt))
    try {
      const res = await fetch(`${GEMINI_URL}?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: PROMPT },
              { inline_data: { mime_type: mime, data: b64 } },
            ],
          }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 600 },
        }),
        signal: AbortSignal.timeout(35000),
      })
      // 🔁 ازدحام أو حد المعدل → نعيد
      if (res.status === 503 || res.status === 429) continue
      if (!res.ok) return null
      const j = await res.json() as {
        candidates?: { content?: { parts?: { text?: string }[] } }[]
      }
      const t = j.candidates?.[0]?.content?.parts?.map((p) => p.text).join(' ')
      const clean = t?.trim().replace(/\s+/g, ' ').slice(0, 500)
      if (clean) return clean
    } catch {
      // نكمّل للمحاولة اللي بعدها
    }
  }
  return null
}

export async function POST(req: NextRequest) {
  // 🔐 الكرون بس
  // 🔐 (٢٨/٨) ثلاث طرق: Bearer (اللي Vercel بيبعته) · هيدر مخصص · query
  const cronSecret = process.env.CRON_SECRET
  if (cronSecret) {
    const auth = req.headers.get('authorization') || ''
    const ok =
      auth === `Bearer ${cronSecret}` ||
      req.headers.get('x-cron-secret') === cronSecret ||
      req.nextUrl.searchParams.get('secret') === cronSecret
    if (!ok) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) {
    return NextResponse.json({
      ok: false,
      error: 'مفيش GEMINI_API_KEY',
      hint: 'جيب مفتاح مجاني من aistudio.google.com وحطه في .env.local',
    }, { status: 200 })
  }

  const supa = db()
  const limit = Number(req.nextUrl.searchParams.get('limit') || 10)

  const { data: rows } = await supa
    .from('media_vision_queue')
    .select('id, media_url, attempts')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: false })   // الأحدث أهم
    .limit(Math.min(limit, 25))

  const queue = (rows || []) as { id: string; media_url: string; attempts: number }[]
  if (queue.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'الطابور فاضي' })
  }

  let done = 0, failed = 0
  for (const item of queue) {
    const img = await fetchImageBase64(item.media_url)
    if (!img) {
      await supa.from('media_vision_queue')
        .update({ status: 'failed', attempts: item.attempts + 1, error_text: 'الصورة مش متاحة' })
        .eq('id', item.id)
      failed++
      continue
    }

    const desc = await describeWithGemini(key, img.data, img.mime)
    if (!desc) {
      await supa.from('media_vision_queue')
        .update({ attempts: item.attempts + 1, error_text: 'الموديل مارجعش وصف' })
        .eq('id', item.id)
      failed++
      continue
    }

    // ✍️ الحفظ بيحقن الوصف في الرسالة كمان — فالمارد يقراه فورًا
    await (supa.rpc as unknown as (f: string, p: Record<string, unknown>) => Promise<unknown>)(
      'save_media_description',
      { p_queue_id: item.id, p_description: desc, p_model: 'gemini-3.6-flash' },
    )
    done++
  }

  return NextResponse.json({ ok: true, processed: queue.length, done, failed })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
