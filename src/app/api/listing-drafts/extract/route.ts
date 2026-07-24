import { NextRequest, NextResponse } from 'next/server'
import { anthropic, CLAUDE_MODEL, parseJsonResponse } from '@/lib/anthropic'

// ============================================================
// POST /api/listing-drafts/extract — "استيراد ذكي" (Task 20, Jul 24 2026)
// العميل يبعت قائمته بأي شكل (نص مكتوب/ملصوق، أو صورة لقائمة/منيو) والـAI (Claude)
// يطلّع منها أصناف + أسعار JSON منظّمة. السعر الناقص = null عشان الواجهة تسأل عنه
// («المارد يسأل عن الناقص»). مسار معزول تمامًا — بيخدم صفحة الإضافة دلوقتي،
// وينفع للشات/واتساب بعدين من غير أي تغيير.
// ============================================================

export const dynamic = 'force-dynamic'

type ExtractedItem = { name_ar: string; price: number | null; section?: string }

const SYSTEM = `انت مساعد استخراج بيانات لماركت بليس مصري اسمه «مضمونة».
هيتبعتلك قائمة منتجات أو خدمات (نص أو صورة) والمطلوب تطلّع منها JSON منظّم.

قواعد مهمة:
- استخرج كل صنف باسمه بالعربي في name_ar.
- price = رقم بالجنيه المصري لو السعر واضح، أو null لو مش موجود أو مش واضح.
- لو فيه أقسام/تصنيفات في القائمة، حط اسم القسم في section.
- لو فيه حجم أو وحدة (كيلو، لتر، علبة، شريط...) ضمّها لاسم الصنف.
- متخترعش أصناف ولا أسعار من عندك. أي حاجة مش واضحة سيب سعرها null.
- تجاهل العناوين والأرقام اللي مش أصناف (تليفونات، عناوين، تواريخ).

رجّع JSON بس، من غير أي شرح قبله أو بعده، بالشكل ده بالظبط:
{"items":[{"name_ar":"...","price":123,"section":"..."}]}`

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as {
      text?: string
      image_base64?: string
      mimetype?: string
    } | null

    if (!body) return NextResponse.json({ ok: false, error: 'صيغة غير صحيحة' }, { status: 400 })
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ ok: false, error: 'خدمة الاستخراج غير مفعّلة حالياً' }, { status: 503 })
    }

    const content: unknown[] = []
    if (body.image_base64) {
      const mt = (body.mimetype || 'image/jpeg').toLowerCase()
      const media_type = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mt) ? mt : 'image/jpeg'
      content.push({ type: 'image', source: { type: 'base64', media_type, data: body.image_base64 } })
      content.push({ type: 'text', text: 'استخرج الأصناف والأسعار من الصورة دي وطلّعها JSON زي القواعد.' })
    } else if (body.text && body.text.trim()) {
      content.push({ type: 'text', text: `استخرج الأصناف والأسعار من القائمة دي:\n\n${body.text.trim().slice(0, 12000)}` })
    } else {
      return NextResponse.json({ ok: false, error: 'مفيش محتوى نستخرج منه' }, { status: 400 })
    }

    const resp = await anthropic.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 4096,
      temperature: 0,
      system: SYSTEM,
      messages: [{ role: 'user', content: content as never }],
    })

    const textBlock = resp.content.find((b) => b.type === 'text')
    const raw = textBlock && textBlock.type === 'text' ? textBlock.text : ''
    if (!raw) return NextResponse.json({ ok: false, error: 'مقدرناش نقرأ القائمة' }, { status: 422 })

    const parsed = parseJsonResponse<{ items?: ExtractedItem[] }>(raw)
    const rawItems = Array.isArray(parsed?.items) ? parsed.items : []
    const items = rawItems
      .filter((it) => it && typeof it.name_ar === 'string' && it.name_ar.trim().length > 0)
      .slice(0, 300)
      .map((it) => {
        const p = typeof it.price === 'number' ? it.price : Number(it.price)
        return {
          name_ar: String(it.name_ar).trim().slice(0, 120),
          price: Number.isFinite(p) && p > 0 ? p : null,
          section: it.section ? String(it.section).trim().slice(0, 60) : undefined,
        }
      })

    const missing_price = items.filter((it) => it.price == null).length
    return NextResponse.json({ ok: true, items, count: items.length, missing_price })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'حصل خطأ في الاستخراج'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }
}
