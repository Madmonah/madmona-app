// src/app/api/start/logo/route.ts
// 🖼️ (١٨/٩/٢٠٢٦) رفع لوجو الشركة من شاشة /start — محمد: «زي شاشة ضيف بيزنس جديد… اللوجو والفروع والهوية والألوان».
// الهوية: Bearer (جلسة Supabase) أو madmona_token — نفس البابين. الملف بيتخزّن بـservice_role في content-images.
// ⚠️ مفتاح التخزين ASCII بس (Supabase بيرفض العربي — درس ٤/٩).
import { NextResponse } from 'next/server'
import { platformAdminDb } from '@/lib/platformAdmin'
import { rateLimitOk, clientIp } from '@/lib/rate-limit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX = 3 * 1024 * 1024 // ٣ ميجا
const TYPES = ['image/jpeg', 'image/png', 'image/webp']

export async function POST(req: Request) {
  const db = platformAdminDb()
  if (!(await rateLimitOk(db, `start-logo:${clientIp(req)}`, 30, 3600))) {
    return NextResponse.json({ ok: false, error: 'حاول تاني بعد شوية' }, { status: 429 })
  }
  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  const token = String(form?.get('token') || '')
  if (!(file instanceof File)) return NextResponse.json({ ok: false, error: 'مفيش ملف' }, { status: 400 })
  if (file.size > MAX) return NextResponse.json({ ok: false, error: 'الصورة أكبر من ٣ ميجا' }, { status: 400 })
  if (!TYPES.includes(file.type)) return NextResponse.json({ ok: false, error: 'الصورة لازم JPG أو PNG أو WEBP' }, { status: 400 })

  let userId: string | null = null
  const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '').trim()
  if (bearer) { const { data } = await db.auth.getUser(bearer); userId = data?.user?.id || null }
  if (!userId && /^[0-9a-f-]{36}$/i.test(token)) {
    const { data: acc } = await (db.rpc as unknown as (fn: string, a: Record<string, unknown>) => Promise<{ data: { found?: boolean; user_id?: string } | null }>)(
      'auth_user_for_madmona_token', { p_token: token })
    if (acc?.found && acc.user_id) userId = acc.user_id
  }
  if (!userId) return NextResponse.json({ ok: false, error: 'سجّل دخولك الأول' }, { status: 401 })

  const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg'
  const key = `business-logos/${userId.replace(/-/g, '')}-${Date.now()}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())
  const { error } = await db.storage.from('content-images').upload(key, buf, { contentType: file.type, upsert: true })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const { data: pub } = db.storage.from('content-images').getPublicUrl(key)
  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
