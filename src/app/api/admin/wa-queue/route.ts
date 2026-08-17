// app/api/admin/wa-queue/route.ts
// 📬 طابور الواتساب — عرض وإلغاء (١٧ أغسطس ٢٠٢٦ — محمد: «اعمل تاب نشيل
//    منه الطابور القديم علشان مش لاقيه»)
//
// الطابور كان بيتدار بـSQL يدوي — أي إلغاء أو استعلام كان محتاج حد يدخل
// الداتابيز. دلوقتي شاشة: الحملات متجمعة، وكل حملة ليها زرار إلغاء.
//
// ⚠️ الإلغاء بيمسك الرسايل اللي **لسه** queued بس — اللي اتبعتت اتبعتت.
//    والصفوف الملغية بتفضل بحالتها وسببها، مش بتتمسح: لما بايع يسأل
//    «ليه ماوصلتنيش رسالة؟» لازم يبقى فيه إجابة.
import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export const dynamic = 'force-dynamic'

function unauthorized(req: NextRequest) {
  return req.cookies.get(ADMIN_COOKIE)?.value !== ADMIN_SESSION_VALUE
}

export async function GET(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  // الحملات متجمعة — الاسم والمسار والحالة والعدد وأول/آخر ميعاد
  const { data, error } = await supabase.rpc('wa_queue_overview')
  if (error) return NextResponse.json({ ok: false, error: error.message })
  return NextResponse.json({ ok: true, campaigns: data ?? [] })
}

export async function POST(req: NextRequest) {
  if (unauthorized(req)) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const { action, campaign, session } = body as { action?: string; campaign?: string; session?: string }

  if (action !== 'cancel') return NextResponse.json({ ok: false, error: 'action غير معروف' })
  if (!campaign) return NextResponse.json({ ok: false, error: 'اسم الحملة مطلوب' })

  let q = supabase
    .from('whatsapp_campaign_messages')
    .update({
      status: 'cancelled',
      error_message: `اتلغت من شاشة الطابور — ${new Date().toISOString().slice(0, 16)}`,
    })
    .eq('status', 'queued')

  // «(من غير اسم)» = الرسايل اللي مالهاش campaign_name
  q = campaign === '(من غير اسم)'
    ? q.is('template_vars->>campaign_name', null)
    : q.eq('template_vars->>campaign_name', campaign)
  if (session) q = q.eq('session', session)

  const { data, error } = await q.select('id')
  if (error) return NextResponse.json({ ok: false, error: error.message })
  return NextResponse.json({ ok: true, cancelled: (data ?? []).length })
}
