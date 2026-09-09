// src/app/api/catalog/photo/route.ts
// 📷 (٩/٩/٢٠٢٦ — آخر الليل) صورة المنتج/الخدمة/الخامة من شاشة «المنتجات والخدمات».
// محمد: «لازم يكون ليها مكان للصور علشان ننزلها في الماركتبليس». الصورة بتتضغط في المتصفح
// (lib/image-compress) وبتترفع لبَكِت listing-photos (عام) تحت catalog/<supplier>/ — الهوية
// بالبابين: توكن Supabase (Bearer) أو madmona_token (body.token) عبر schedule_edit_ok.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30
const MAX_BYTES = 2 * 1024 * 1024
const UUID_RE = /^[0-9a-f-]{36}$/i

export async function POST(request: NextRequest) {
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim() || ''
  let body: { supplierId?: string; token?: string; dataBase64?: string; mimetype?: string }
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const supplierId = (body.supplierId || '').trim()
  const token = (body.token || '').trim()
  const dataBase64 = (body.dataBase64 || '').replace(/^data:[^;]+;base64,/, '').trim()
  const mimetype = (body.mimetype || 'image/jpeg').trim()
  if (!UUID_RE.test(supplierId) || !dataBase64) return NextResponse.json({ ok: false, error: 'bad request' }, { status: 400 })
  if (!mimetype.startsWith('image/')) return NextResponse.json({ ok: false, error: 'صور بس' }, { status: 400 })

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!

  // الصلاحية: بجلسة Supabase (auth.uid) أو بتوكن الواتساب — نفس حارس اللوحة
  let allowed = false
  if (bearer) {
    const userClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${bearer}` } }, auth: { persistSession: false } })
    const { data } = await userClient.rpc('schedule_edit_ok', { p_supplier_id: supplierId, p_token: UUID_RE.test(token) ? token : null })
    allowed = data === true
  }
  if (!allowed && UUID_RE.test(token)) {
    const anonClient = createClient(URL, ANON, { auth: { persistSession: false } })
    const { data } = await anonClient.rpc('schedule_edit_ok', { p_supplier_id: supplierId, p_token: token })
    allowed = data === true
  }
  if (!allowed) return NextResponse.json({ ok: false, error: 'مالكش صلاحية' }, { status: 403 })

  const buf = Buffer.from(dataBase64, 'base64')
  if (buf.length > MAX_BYTES) return NextResponse.json({ ok: false, error: 'الصورة كبيرة — جرّب تاني' }, { status: 413 })
  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const ext = mimetype === 'image/png' ? 'png' : mimetype === 'image/webp' ? 'webp' : 'jpg'
  const path = `catalog/${supplierId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const { error } = await admin.storage.from('listing-photos').upload(path, buf, { contentType: mimetype, upsert: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const { data: pub } = admin.storage.from('listing-photos').getPublicUrl(path)
  return NextResponse.json({ ok: true, url: pub.publicUrl })
}
