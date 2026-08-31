// ============================================================================
// 🌍 /api/i18n/translate — ترجمة الإعلانات لخمس لغات
//
// (٢٨ أغسطس ٢٠٢٦) محمد سأل: «هل الإعلانات الجديدة بتترجم للغات اللي
// اتفقنا عليها؟»
//
// 🔍 الفحص: ٤٣١ من ٤٤٥ إعلان مترجمين — بس **١٤ إعلان i18n بتاعهم
//    فاضي تمامًا**، منهم الـ٩ اللي رفعتهم النهاردة. ومفيش كرون
//    ترجمة في vercel.json خالص، فالمتراكم بيفضل متراكم.
//
// 🌐 اللغات: إنجليزي · صيني · روسي · ياباني · أوكراني
//    (نفس اللغات الموجودة في الإعلانات القديمة)
//
// 💰 بيستخدم Gemini — مجاني، فالترجمة مابقتش مربوطة برصيد الأنثروبيك.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { callGemini } from '@/lib/ai-provider'

export const runtime = 'nodejs'
export const maxDuration = 60

const LANGS = { en: 'English', zh: 'Chinese', ru: 'Russian', ja: 'Japanese', uk: 'Ukrainian' }

const PROMPT = `أنت مترجم محترف لسوق إلكتروني مصري.

ترجم العنوان والوصف للغات دي: English, Chinese, Russian, Japanese, Ukrainian.

قواعد:
- خلّي الترجمة طبيعية ومناسبة لإعلان تجاري، مش ترجمة حرفية
- الأسعار والأرقام والمساحات تفضل زي ما هي
- أسماء المناطق والمشاريع تتكتب بالحروف اللاتينية (transliteration)
- لو الوصف فيه تفاصيل سداد (مقدم · أقساط) ترجمها بدقة

رجّع JSON بس من غير أي كلام قبله أو بعده، بالشكل ده بالظبط:
{"en":{"title":"...","description":"..."},"zh":{...},"ru":{...},"ja":{...},"uk":{...}}`

function db() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

/** 🧹 Gemini بيلف الـJSON في ```json أحيانًا */
function parseJson(raw: string): Record<string, unknown> | null {
  try {
    const clean = raw.replace(/```json\s*|```/g, '').trim()
    const start = clean.indexOf('{')
    const end = clean.lastIndexOf('}')
    if (start < 0 || end < 0) return null
    return JSON.parse(clean.slice(start, end + 1))
  } catch {
    return null
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-cron-secret') || req.nextUrl.searchParams.get('secret')
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }
  if (!process.env.GEMINI_API_KEY) {
    return NextResponse.json({ ok: false, error: 'مفيش GEMINI_API_KEY' })
  }

  const supa = db()
  const limit = Math.min(Number(req.nextUrl.searchParams.get('limit') || 5), 15)

  const { data: rows } = await supa
    .from('listing_translation_queue')
    .select('id, listing_id, attempts')
    .eq('status', 'pending')
    .lt('attempts', 3)
    .order('created_at', { ascending: false })
    .limit(limit)

  const queue = (rows || []) as { id: string; listing_id: string; attempts: number }[]
  if (queue.length === 0) {
    return NextResponse.json({ ok: true, processed: 0, message: 'الطابور فاضي' })
  }

  let done = 0, failed = 0
  for (const item of queue) {
    const { data: l } = await supa
      .from('listings')
      .select('id, title, description')
      .eq('id', item.listing_id)
      .single()

    const listing = l as { title?: string; description?: string } | null
    if (!listing?.title) {
      await supa.from('listing_translation_queue')
        .update({ status: 'failed', attempts: item.attempts + 1, error_text: 'الإعلان مش موجود' })
        .eq('id', item.id)
      failed++
      continue
    }

    try {
      const raw = await callGemini({
        systemPrompt: PROMPT,
        userMessage: `العنوان: ${listing.title}\n\nالوصف: ${(listing.description || '').slice(0, 1500)}`,
        maxTokens: 3000,
        temperature: 0.3,
      })
      const parsed = parseJson(raw)

      // ✅ لازم على الأقل الإنجليزي — غير كده يبقى الرد مش سليم
      const hasEn = parsed && typeof parsed.en === 'object' && parsed.en !== null
      if (!hasEn) {
        await supa.from('listing_translation_queue')
          .update({ attempts: item.attempts + 1, error_text: 'رد مش صالح' })
          .eq('id', item.id)
        failed++
        continue
      }

      // 🧹 نسيب اللغات المعروفة بس
      const clean: Record<string, unknown> = {}
      for (const k of Object.keys(LANGS)) {
        if (parsed![k]) clean[k] = parsed![k]
      }

      await (supa.rpc as unknown as (f: string, p: Record<string, unknown>) => Promise<unknown>)(
        'save_listing_translation',
        { p_listing_id: item.listing_id, p_i18n: clean },
      )
      done++
    } catch (e) {
      await supa.from('listing_translation_queue')
        .update({
          attempts: item.attempts + 1,
          error_text: e instanceof Error ? e.message.slice(0, 200) : 'خطأ',
        })
        .eq('id', item.id)
      failed++
    }
  }

  return NextResponse.json({ ok: true, processed: queue.length, done, failed })
}

export async function GET(req: NextRequest) {
  return POST(req)
}
