// src/app/api/start/create-business/route.ts
// 🔗 (١٠/٩/٢٠٢٦) محمد: «عايز التاب ده (/admin/business-partners/new) الناس تدخل تعمل منه حساب جديد على مضمونة
//    ويتعمل منه حساب البيزنس الجديد بنفس تفاصيله». الصفحة العامة /start بتبعت نفس payload فورم الأدمن هنا بعد ما
//    المستخدم يوثّق نفسه (واتساب/جوجل). الهوية: Bearer (جلسة Supabase) أو madmona_token — البابين.
//    الإنشاء بـservice_role عبر self_create_business (نفس admin_create_b2b_partner_unguarded + الملكية + مالك وموظف واحد).
import { NextResponse } from 'next/server'
import { platformAdminDb } from '@/lib/platformAdmin'
import { rateLimitOk, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED = ['business_name', 'contact_name', 'contact_phone', 'contact_email', 'city', 'district', 'address', 'industry', 'branches'] as const

export async function POST(req: Request) {
  const db = platformAdminDb()
  if (!(await rateLimitOk(db, `start-create:${clientIp(req)}`, 20, 3600))) {
    return NextResponse.json({ ok: false, error: 'حاول تاني بعد شوية' }, { status: 429 })
  }
  let body: { payload?: Record<string, unknown>; token?: string } = {}
  try { body = await req.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }

  // ── مين المستخدم؟ ──
  let userId: string | null = null
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (bearer) {
    const { data } = await db.auth.getUser(bearer)
    userId = data?.user?.id || null
  }
  if (!userId && body.token && /^[0-9a-f-]{36}$/i.test(body.token)) {
    const { data: acc } = await (db.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: { found?: boolean; user_id?: string } | null }>)(
      'auth_user_for_madmona_token', { p_token: body.token },
    )
    if (acc?.found && acc.user_id) userId = acc.user_id
  }
  if (!userId) return NextResponse.json({ ok: false, error: 'سجّل دخولك الأول' }, { status: 401 })

  // ── الـpayload: نفس حقول فورم الأدمن، من غير أي حقول عمولة/عقد من العميل ──
  const src = body.payload || {}
  const payload: Record<string, unknown> = {}
  for (const k of ALLOWED) if (src[k] !== undefined && src[k] !== null && src[k] !== '') payload[k] = src[k]
  if (typeof payload.business_name !== 'string' || (payload.business_name as string).trim().length < 2) {
    return NextResponse.json({ ok: false, error: 'اكتب اسم الشركة' }, { status: 400 })
  }
  if (Array.isArray(payload.branches)) {
    payload.branches = (payload.branches as Array<Record<string, unknown>>).slice(0, 5).map((b) => ({
      name: String(b.name || '').slice(0, 120), code: String(b.code || '').slice(0, 20),
      address: b.address ? String(b.address).slice(0, 300) : null, district: b.district ? String(b.district).slice(0, 80) : null,
      phone: b.phone ? String(b.phone).slice(0, 30) : null, manager_name: b.manager_name ? String(b.manager_name).slice(0, 120) : null,
    }))
  }

  const { data, error } = await (db.rpc as unknown as (fn: string, args: Record<string, unknown>) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>)(
    'self_create_business', { p_user: userId, p_payload: payload },
  )
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  if (!data?.ok) return NextResponse.json({ ok: false, error: (data?.error as string) || 'ماتعملش' }, { status: 400 })
  return NextResponse.json({ ok: true, supplier_id: data.supplier_id, existing: data.existing === true, slug: data.slug || null })
}
