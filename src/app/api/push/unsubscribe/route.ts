import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// POST /api/push/unsubscribe
// Remove the caller's own subscription by endpoint.
// Headers: Authorization: Bearer <supabase access token>   ← 🔒 مطلوب
// Body: { endpoint: string }
//
// 🔒 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) كان من غير auth ولا فحص ملكية —
// أي حد يعرف endpoint كان يقدر يلغي اشتراكات ناس تانية ويقتل
// إشعاراتهم في صمت. دلوقتي: Bearer المستخدم + المسح على صفوفه هو بس
// (profile_id = صاحب التوكن). لو المستخدم عامل خروج، إلغاء الاشتراك
// المحلي في المتصفح بيوقف البوش فعليًا، والصف اليتيم بيتنضف تلقائيًا
// أول ما إرسال ليه يرجّع 410 (منطق expiredEndpoints في process-queue).
export async function POST(req: NextRequest) {
  try {
    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
    if (!bearer) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    )
    const { data: userData, error: userErr } = await adminClient.auth.getUser(bearer)
    if (userErr || !userData?.user) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
    }

    const body = await req.json().catch(() => ({}))
    const endpoint = body?.endpoint
    if (!endpoint) {
      return NextResponse.json({ error: 'missing_endpoint' }, { status: 400 })
    }

    const { error } = await adminClient
      .from('push_subscriptions')
      .delete()
      .eq('endpoint', endpoint)
      .eq('profile_id', userData.user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
