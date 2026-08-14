// ============================================================================
// /api/verify-call/incoming  —  الويبهوك اللي التليفون بينده عليه
//
// التليفون (MacroDroid/Tasker) أو مزوّد VoIP بينده هنا أول ما مكالمة تيجي،
// وبيبعت رقم المتصل. إحنا بنطابقه بأي طلب تحقق معلّق لنفس الرقم.
//
// ⚠️ **دي نقطة الأمان كلها.** أي حد يقدر ينده هنا يقدر يوثّق أي رقم لأي حساب.
//    عشان كده السرّ إجباري ومفيش مسار بيعدي من غيره.
//
// مصمّمة مجرّدة عن المصدر: `source` بيقول مين نده — تليفون ولا مزوّد.
// التبديل بعدين = تغيير مين بينده، من غير ما نلمس الكود.
//
// الاستدعاء:
//   POST /api/verify-call/incoming
//   Header: x-madmona-secret: <CALL_VERIFY_SECRET>
//   Body:   { "caller": "+201012345678", "source": "phone-1" }
//   (وبيقبل GET بـ?caller=&source= كمان عشان أدوات الأتمتة اللي بتصعّب الـPOST)
// ============================================================================
import { NextResponse } from 'next/server'
import { supabase as supabaseAdmin } from '@/lib/supabase'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 15

function authorized(request: Request, url: URL): boolean {
  const secret = process.env.CALL_VERIFY_SECRET
  // ⛔ من غير سرّ متظبط الراوت مقفول تماماً — مش مفتوح
  if (!secret) return false
  const given =
    request.headers.get('x-madmona-secret') ||
    (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '') ||
    url.searchParams.get('secret') ||
    ''
  // مقارنة بطول ثابت مش ضرورية هنا (السرّ مش بيتخمّن بالمحاولة عن بعد على فيرسل)
  return given.length > 0 && given === secret
}

async function handle(caller: string, source: string | null) {
  if (!caller) return NextResponse.json({ ok: false, error: 'no_caller' }, { status: 400 })

  // @ts-ignore rpc not in generated types
  const { data, error } = await supabaseAdmin.rpc('match_incoming_call', {
    p_caller: caller,
    p_source: source ?? undefined,
  })

  if (error) {
    console.error('[verify-call/incoming] فشل المطابقة', error)
    return NextResponse.json({ ok: false, error: 'match_failed' }, { status: 500 })
  }

  // matched=null يعني وصلت بس مفيش طلب معلّق للرقم ده (أو الرقم مخفي).
  // بنرجّع 200 برضه — المكالمة اتسجلت، والتليفون مش محتاج يعيد المحاولة.
  return NextResponse.json({ ok: true, matched: !!data })
}

export async function POST(request: Request) {
  const url = new URL(request.url)
  if (!authorized(request, url)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  let body: { caller?: string; from?: string; number?: string; source?: string } = {}
  try { body = await request.json() } catch { /* ممكن ييجي بـquery بس */ }
  const caller = body.caller || body.from || body.number || url.searchParams.get('caller') || ''
  const source = body.source || url.searchParams.get('source') || null
  return handle(caller, source)
}

export async function GET(request: Request) {
  const url = new URL(request.url)
  if (!authorized(request, url)) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  return handle(url.searchParams.get('caller') || '', url.searchParams.get('source'))
}
