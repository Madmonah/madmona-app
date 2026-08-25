// src/app/api/login/route.ts
// =====================================================================
// 🔐 (٢٥/٨/٢٠٢٦) الدخول الموحّد — محمد: «مش عارف اسجل دخول في /login
//    وشايف ان ليا كذا باسورد في المشروع!!»
//
// المشكلة: كان فيه ٣ مخازن باسورد والشاشة بتفهم واحد بس:
//   • platform_admins (لوحة الأدمن — bcrypt للجديد وscrypt للقديم)
//   • business_employees.password_hash (شاشة الموظفين — bcrypt)
//   • business_employees.pin_code (الـPIN بتاع البصمة)
//
// الحل: /login بتبعت هنا، وإحنا بنجرّب بالترتيب:
//   ١) platform_admins (نفس منطق /api/admin-entry بالظبط) — ولو نجح:
//      بنفتح جلسة اللوحة (كوكي) + madmona_token للأبليكيشن مع بعض.
//      يعني باسورد اللوحة بتاعك بيفتحلك كل حاجة بدخلة واحدة.
//   ٢) business_employees (باسورد أو PIN) عبر login_with_password.
// =====================================================================

import { NextResponse } from 'next/server'
import {
  PLATFORM_ADMIN_COOKIE,
  PLATFORM_ADMIN_SESSION_DAYS,
  platformAdminDb,
  verifyPassword,
  newSessionToken,
} from '@/lib/platformAdmin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const isProd = process.env.NODE_ENV === 'production'
const MAX_AGE = 60 * 60 * 24 * PLATFORM_ADMIN_SESSION_DAYS

export async function POST(req: Request) {
  let identifier = ''
  let password = ''
  try {
    const body = await req.json()
    identifier = typeof body?.identifier === 'string' ? body.identifier.trim() : ''
    password = typeof body?.password === 'string' ? body.password : ''
  } catch { /* body مش JSON */ }

  if (!identifier || !password) {
    return NextResponse.json({ ok: false, error: 'اكتب رقمك أو إيميلك والباسورد' }, { status: 400 })
  }

  const db = platformAdminDb()

  // ── ١) أدمن اللوحة (بيقبل أي صيغة رقم — مطابقة بآخر ١٠ أرقام) ──────────
  const { data: rows } = await (db.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: Array<{ id: string; password_hash: string; status: string }> | null }>)(
    'platform_admin_lookup', { p_identifier: identifier },
  )
  const admin = Array.isArray(rows) ? rows[0] : null

  if (admin && admin.status === 'active' && typeof admin.password_hash === 'string'
      && !admin.password_hash.startsWith('LOCKED-')) {
    let passwordOk = false
    if (admin.password_hash.startsWith('$2')) {
      const { data: bcryptOk } = await (db.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: boolean | null }>)(
        'platform_admin_verify_bcrypt', { p_admin_id: admin.id, p_password: password },
      )
      passwordOk = bcryptOk === true
    } else {
      passwordOk = verifyPassword(password, admin.password_hash)
    }

    if (passwordOk) {
      // جلسة اللوحة (كوكي) — نفس اللي /api/admin-entry بيعمله
      const token = newSessionToken()
      const expiresAt = new Date(Date.now() + MAX_AGE * 1000).toISOString()
      await db.from('platform_admin_sessions').insert({
        token, admin_id: admin.id, expires_at: expiresAt,
        user_agent: req.headers.get('user-agent') || null,
      } as never)
      await db.from('platform_admins').update({ last_login_at: new Date().toISOString() } as never).eq('id', admin.id)

      // madmona_token للأبليكيشن — بنفس الدخلة
      const { data: mt } = await (db.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { success?: boolean; token?: string; name?: string } | null }>)(
        'issue_madmona_token_for_admin', { p_admin_id: admin.id },
      )

      const res = NextResponse.json({
        ok: true,
        source: 'admin',
        token: mt?.success ? mt.token : null,
        name: mt?.name || null,
      })
      res.cookies.set(PLATFORM_ADMIN_COOKIE, token, {
        httpOnly: true, secure: isProd, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
      })
      return res
    }
  }

  // ── ٢) موظف (باسورد أو PIN) ─────────────────────────────────────────────
  const { data: emp } = await (db.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: { success?: boolean; token?: string; error?: string; employee_name?: string } | null }>)(
    'login_with_password', { p_identifier: identifier, p_secret: password },
  )
  if (emp?.success && emp.token) {
    return NextResponse.json({ ok: true, source: 'employee', token: emp.token, name: emp.employee_name || null })
  }

  return NextResponse.json({
    ok: false,
    error: emp?.error || 'البيانات غلط — جرّب بباسورد لوحة الأدمن أو باسورد الموظفين أو الـPIN',
  }, { status: 401 })
}
