// src/lib/platformAdmin.ts
// =====================================================================
// 🔐 (١٩ أغسطس ٢٠٢٦ — محمد: «عايز الدخول للأدمن يكون عن طريق ايميل - رقم
//    تليفون - باسورد (موظفين مضمونة فقط)») — حسابات أدمن مستقلة بدل
//    الباسورد المشترك الواحد القديم (ADMIN_PW_SHA256 — اتلغى بالكامل).
//
//    كل موظف مضمونة بقى ليه: إيميل + تليفون + باسورد خاصة بيه، وجلسة
//    مستقلة (platform_admin_sessions) بدل الكوكي الثابت الواحد اللي كان
//    بيفتح لأي حد عنده الباسورد القديمة.
//
//    الباسورد بتتخزن كـ scrypt hash (Node built-in — من غير أي مكتبة
//    خارجية زي bcrypt، تجنّبًا لمشاكل native binary على Vercel).
// =====================================================================

import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'
import { PLATFORM_ADMIN_COOKIE, PLATFORM_ADMIN_SESSION_DAYS } from './platformAdminConst'

export { PLATFORM_ADMIN_COOKIE, PLATFORM_ADMIN_SESSION_DAYS }

export function platformAdminDb() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
}

// ── باسورد: scrypt + salt عشوائي ────────────────────────────────────────
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex')
  const hash = crypto.scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${hash}`
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = (stored || '').split(':')
  if (!salt || !hashHex) return false
  const a = crypto.scryptSync(password, salt, 64)
  const b = Buffer.from(hashHex, 'hex')
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function passwordStrengthError(password: string): string | null {
  if (!password || password.length < 8) return 'الباسورد لازم يكون ٨ حروف/أرقام على الأقل'
  return null
}

// ── جلسة: توكن عشوائي، بيتخزن في الداتابيز مش JWT — يقدر يتلغى فورًا ────
export function newSessionToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export interface PlatformAdmin {
  id: string
  full_name: string
  email: string
  phone: string
  role: 'owner' | 'admin'
  status: 'active' | 'disabled'
}

/** بيدوّر بالكوكي — بيرجّع بيانات الموظف الداخل لو الجلسة صالحة، وإلا null */
export async function getPlatformAdminFromRequest(request: Request): Promise<PlatformAdmin | null> {
  const raw = request.headers.get('cookie') || ''
  const hit = raw.split(';').map((c) => c.trim()).find((c) => c.startsWith(`${PLATFORM_ADMIN_COOKIE}=`))
  if (!hit) return null
  const token = decodeURIComponent(hit.slice(PLATFORM_ADMIN_COOKIE.length + 1))
  if (!token) return null

  const db = platformAdminDb()
  const { data: session } = await db
    .from('platform_admin_sessions')
    .select('admin_id, expires_at')
    .eq('token', token)
    .maybeSingle()
  if (!session) return null
  if (new Date((session as { expires_at: string }).expires_at).getTime() < Date.now()) return null

  const { data: admin } = await db
    .from('platform_admins')
    .select('id, full_name, email, phone, role, status')
    .eq('id', (session as { admin_id: string }).admin_id)
    .maybeSingle()
  if (!admin || (admin as PlatformAdmin).status !== 'active') return null

  // best-effort: نحدّث آخر ظهور — مايوقفش الطلب لو فشل
  db.from('platform_admin_sessions').update({ last_seen_at: new Date().toISOString() } as never).eq('token', token).then(
    () => {},
    () => {},
  )

  return admin as PlatformAdmin
}
