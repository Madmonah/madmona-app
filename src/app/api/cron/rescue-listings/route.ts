// 🛟 شبكة أمان الإعلانات الضايعة — /api/cron/rescue-listings
// ============================================================================
// (٢٤ أغسطس ٢٦) محمد وافق على الحل الجذري لمشكلة «الإعلانات اللي بتتبعت
// للمارد مش بتضاف»: أقل من ٢٪ من الصور الواردة كانت بتتحول لإعلانات،
// لأن المارد بيرد بكلام حلو من غير ما ينادي create_listing_draft.
//
// الشبكة دي بتلقط اللي فلت: محادثة فيها صور واردة خلال آخر ٢٤ ساعة
// **ومفيش** مسودة إعلان اتعملت لصاحبها → نداء هايكو واحد صغير يقرا
// المحادثة (الصور متفرّغة نصيًا من enrichMediaTranscript) ويستخرج
// الإعلان لو فيه إعلان فعلًا → مسودة في instant_listing_drafts بحالة
// 'new' — نفس المسار اللي كرون publish-drafts بينشر منه. مفيش مسار نشر
// موازي.
//
// ⛔ القواعد: السعر يتسجّل بس لو مكتوب صراحةً في كلام العميل — ممنوع
//    اختراع أرقام. ولو المحادثة مش عرض بيع أصلًا (استفسار عميل مثلًا)
//    بنعدّي من غير ما نعمل حاجة ونعلّم عليها عشان مانرجعلهاش.
//
// التشغيل: orchestrator job «rescue-missed-listings» بينده هنا بسرّ
// السيرفر (نفس أسلوب باقي الكرونات). ٥ محادثات كحد أقصى في اللفة —
// حرص في التكلفة.
// ============================================================================
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { isAdminRequest } from '@/lib/adminGate'
import { anthropic } from '@/lib/anthropic'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

const BATCH = 5

const db = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

type Extraction = {
  is_listing: boolean
  title?: string
  description?: string
  category_hint?: string
  price_egp?: number | null
  image_urls?: string[]
}

export async function POST(req: NextRequest) {
  if (!(await isAdminRequest(req))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  // ١) المرشحين: محادثات فيها صور واردة آخر ٢٤ ساعة، مالهاش مسودة حديثة،
  //    وماتفحصتش آخر ٢٤ ساعة (علامة rescue_checked_at في metadata)
  const { data: candidates, error } = await db.rpc('rescue_candidates' as never, { p_limit: BATCH } as never)
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })

  const rows = (candidates || []) as Array<{ conversation_id: string; contact_phone: string; contact_name: string | null }>
  const results: Array<Record<string, unknown>> = []

  for (const c of rows) {
    // علّم إننا فحصنا — قبل أي حاجة، عشان الفشل مايخلّيناش نلف على نفس المحادثة
    await db.rpc('wa_meta_merge' as never, {
      p_conv: c.conversation_id,
      p_patch: { rescue_checked_at: new Date().toISOString() },
    } as never).then(() => {}, () => {})

    // ٢) هات آخر ٣٠ رسالة (فيها تفريغ الصور + روابطها)
    const { data: msgs } = await db
      .from('whatsapp_messages')
      .select('direction, body, created_at')
      .eq('conversation_id', c.conversation_id)
      .order('created_at', { ascending: false })
      .limit(30)
    const convo = ((msgs || []) as Array<{ direction: string; body: string }>).reverse()
      .map((m) => `${m.direction === 'inbound' ? 'العميل' : 'مضمونة'}: ${(m.body || '').slice(0, 400)}`)
      .join('\n')
    if (!convo.trim()) { results.push({ conv: c.conversation_id, skip: 'empty' }); continue }

    // روابط الصور من سجل الرسايل نفسه
    const urls = Array.from(new Set(
      (convo.match(/https?:\/\/\S+/g) || []).filter((u) => /supabase|storage|cloudinary/i.test(u)),
    )).slice(0, 8)

    // ٣) استخراج بهايكو — رخيص ومقيّد: مفيش اختراع أسعار
    let ex: Extraction | null = null
    try {
      const res = await anthropic.messages.create({
        model: 'claude-haiku-4-5',
        max_tokens: 400,
        system:
          'انت بتفحص محادثة واتساب لمنصة مضمونة. لو العميل بيعرض حاجة للبيع/الإيجار ' +
          '(شقة، عربية، منتج، خدمة…) رجّع JSON بس من غير أي كلام: ' +
          '{"is_listing":true,"title":"...","description":"...","category_hint":"...","price_egp":رقم أو null} ' +
          '⛔ price_egp لازم يكون رقم مكتوب صراحةً في كلام العميل — لو مش مكتوب حط null. ' +
          'ممنوع تخترع أي معلومة مش في المحادثة. ' +
          'لو المحادثة مش عرض بيع (استفسار، شكوى، كلام عام) رجّع {"is_listing":false}.',
        messages: [{ role: 'user', content: convo.slice(0, 6000) }],
      })
      const t = res.content.find((b) => b.type === 'text')
      const raw = t && t.type === 'text' ? t.text : ''
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) ex = JSON.parse(m[0]) as Extraction
    } catch { /* استخراج فشل = سيبها للمرة الجاية (العلامة هتمنع اللف بس ٢٤ س) */ }

    if (!ex || !ex.is_listing || !ex.title) {
      results.push({ conv: c.conversation_id, skip: 'not_a_listing' })
      continue
    }

    // ٤) مسودة في نفس مسار النشر الموجود — status 'new' عشان الكرون يلقطها
    const { data: draft, error: dErr } = await db
      .from('instant_listing_drafts')
      .insert({
        contact_phone: c.contact_phone,
        contact_name: c.contact_name,
        conversation_id: c.conversation_id,
        title: String(ex.title).slice(0, 120),
        description: ex.description ? String(ex.description).slice(0, 1500) : null,
        category_slug: null, // بيتحسم وقت النشر بنفس منطق المطابقة الموجود
        price_egp: typeof ex.price_egp === 'number' ? ex.price_egp : null,
        image_urls: urls,
        source_text: 'شبكة أمان — التقاط تلقائي من واتساب',
        status: 'new',
      } as never)
      .select('id')
      .maybeSingle()

    results.push(dErr
      ? { conv: c.conversation_id, error: dErr.message }
      : { conv: c.conversation_id, draft: (draft as { id: string } | null)?.id, images: urls.length })
  }

  return NextResponse.json({ ok: true, checked: rows.length, results })
}
