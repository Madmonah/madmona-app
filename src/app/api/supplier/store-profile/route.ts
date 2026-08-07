import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/supplier/store-profile — (٧ أغسطس ٢٠٢٦، طلب محمد)
// المالك يعدّل اسم متجره ولوجو من لوحة /supplier/marketplace.
// Auth: Bearer <supabase access token> — التحقق من الملكية سيرفر-سايد
// (profile_id بتاع marketplace_suppliers لازم يساوي المستخدم).
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization') || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })
    const { data: userData, error: userErr } = await admin.auth.getUser(token)
    const user = userData?.user
    if (userErr || !user) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 })

    const body = await req.json().catch(() => ({}))
    const supplierId = String(body.supplierId || '')
    const businessName = String(body.businessName || '').trim()
    const logoUrl = body.logoUrl ? String(body.logoUrl) : null
    if (!supplierId) return NextResponse.json({ success: false, error: 'supplierId required' }, { status: 400 })
    if (businessName.length > 80) {
      return NextResponse.json({ success: false, error: 'الاسم طويل أوي — أقصى حد 80 حرف' }, { status: 400 })
    }
    if (logoUrl && !logoUrl.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/`)) {
      return NextResponse.json({ success: false, error: 'لينك اللوجو لازم يكون من التخزين بتاعنا' }, { status: 400 })
    }

    const { data: sup } = await admin
      .from('marketplace_suppliers')
      .select('id, profile_id')
      .eq('id', supplierId)
      .maybeSingle()
    if (!sup) return NextResponse.json({ success: false, error: 'المتجر مش موجود' }, { status: 404 })
    if (sup.profile_id !== user.id) {
      return NextResponse.json({ success: false, error: 'المالك بس اللي يقدر يعدّل بيانات المتجر' }, { status: 403 })
    }

    const patch: Record<string, string> = {}
    if (businessName) patch.business_name = businessName
    if (logoUrl) patch.logo_url = logoUrl
    if (!Object.keys(patch).length) {
      return NextResponse.json({ success: false, error: 'مفيش تغييرات' }, { status: 400 })
    }

    const { error } = await admin.from('marketplace_suppliers').update(patch).eq('id', supplierId)
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'failed' }, { status: 500 })
  }
}
