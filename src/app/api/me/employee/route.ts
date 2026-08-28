import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

// ============================================================================
// 💼 GET /api/me/employee — مين الموظف اللي فاتح الجلسة دي؟
//
// (٢٧ أغسطس ٢٠٢٦) بيتستخدم في إسناد العمولة: لما موظف يدخّل إعلان نيابة
// عن مورد، بنسجّل إنه هو اللي ضاف عشان ياخد حصته من العمولة.
//
// 🔒 الإسناد بيتاخد من **الجلسة** مش من اختيار يدوي — عشان محدش ينسب
//    لنفسه شغل غيره. لو مش موظف، بيرجّع null والإعلان بيتحفظ من غير إسناد.
// ============================================================================
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // التوكن من كوكي سوبابيز (نفس المسار اللي بتستخدمه باقي الراوتس)
    const jar = await cookies()
    const token = jar.getAll()
      .filter((c) => c.name.includes('-auth-token') && !c.name.endsWith('code-verifier'))
      .map((c) => c.value).join('')
      .replace(/^base64-/, '')

    if (!token) return NextResponse.json({ employee_id: null })

    let accessToken: string | null = null
    try {
      const parsed = JSON.parse(
        token.startsWith('{') ? token : Buffer.from(token, 'base64').toString('utf8'),
      )
      accessToken = parsed?.access_token || null
    } catch { accessToken = null }
    if (!accessToken) return NextResponse.json({ employee_id: null })

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${accessToken}` } }, auth: { persistSession: false } },
    )
    const { data: { user } } = await supa.auth.getUser()
    if (!user) return NextResponse.json({ employee_id: null })

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } },
    )
    const { data } = await admin
      .from('business_employees')
      .select('id, full_name, role_ar, supplier_id')
      .eq('auth_user_id', user.id).eq('status', 'active')
      .limit(1).maybeSingle()

    if (!data) return NextResponse.json({ employee_id: null })
    return NextResponse.json({
      employee_id: data.id, full_name: data.full_name,
      role_ar: data.role_ar, supplier_id: data.supplier_id,
    })
  } catch {
    // 🛡️ مش بنكسر إضافة الإعلان لو الإسناد فشل
    return NextResponse.json({ employee_id: null })
  }
}
