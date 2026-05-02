import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// POST /api/auth/reset-password
//
// Body: { token: string, password: string }
//
// Flow:
//   1. Validate token (exists, not expired, not used)
//   2. Update auth.users password via Admin API
//   3. Mark token as used
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const token = String(body.token || '').trim()
    const password = String(body.password || '')

    if (!token) {
      return NextResponse.json(
        { error: 'token is required' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: 'كلمة السر لازم تكون 8 حروف على الأقل' },
        { status: 400 }
      )
    }

    // Service role for token validation + password update
    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // 1. Look up token
    // @ts-expect-error
    const { data: tokenRow } = await supa
      .from('password_reset_tokens')
      .select('user_id, email, expires_at, used')
      .eq('token', token)
      .maybeSingle()

    if (!tokenRow) {
      return NextResponse.json(
        { error: 'اللينك مش صحيح. اطلب لينك جديد.' },
        { status: 400 }
      )
    }

    if (tokenRow.used) {
      return NextResponse.json(
        { error: 'اللينك ده اتستخدم بالفعل. اطلب لينك جديد لو محتاج.' },
        { status: 400 }
      )
    }

    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'اللينك انتهت صلاحيته. اطلب لينك جديد.' },
        { status: 400 }
      )
    }

    // 2. Update password via Admin API
    const { error: updateErr } = await supa.auth.admin.updateUserById(
      tokenRow.user_id,
      { password }
    )

    if (updateErr) {
      console.error('[reset-password] update failed:', updateErr)
      return NextResponse.json(
        { error: 'حصل خطأ في تحديث كلمة السر. حاول تاني.' },
        { status: 500 }
      )
    }

    // 3. Mark token as used
    // @ts-expect-error
    await supa
      .from('password_reset_tokens')
      .update({ used: true })
      .eq('token', token)

    return NextResponse.json({
      ok: true,
      message: 'تم تحديث كلمة السر بنجاح',
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    console.error('[reset-password] error:', msg)
    return NextResponse.json(
      { error: 'حصل خطأ، حاول تاني' },
      { status: 500 }
    )
  }
}

// ============================================================================
// GET /api/auth/reset-password?token=X — verify token validity (for page load)
// ============================================================================
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token')
    if (!token) {
      return NextResponse.json({ valid: false, error: 'no token' }, { status: 400 })
    }

    const supa = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    // @ts-expect-error
    const { data: tokenRow } = await supa
      .from('password_reset_tokens')
      .select('email, expires_at, used')
      .eq('token', token)
      .maybeSingle()

    if (!tokenRow) {
      return NextResponse.json({ valid: false, error: 'not_found' })
    }
    if (tokenRow.used) {
      return NextResponse.json({ valid: false, error: 'used' })
    }
    if (new Date(tokenRow.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'expired' })
    }

    // Mask email for display: m****@example.com
    const email: string = tokenRow.email
    const at = email.indexOf('@')
    const masked = at > 1
      ? email[0] + '*'.repeat(Math.max(1, at - 2)) + email[at - 1] + email.slice(at)
      : email

    return NextResponse.json({ valid: true, masked_email: masked })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'unknown'
    return NextResponse.json({ valid: false, error: msg }, { status: 500 })
  }
}
