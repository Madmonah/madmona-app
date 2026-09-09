// src/app/api/tasks/proof/route.ts
// 📷 (٩/٩/٢٠٢٦) محمد: «التوثيق خليه وهو بيقفل التاسك يوثّق بصورة». صورة الإثبات
// بتترفع من «شغلي» (مضغوطة في المتصفح — lib/image-compress.ts) لبَكِت content-images
// تحت task-proofs/<uid>/ وبيرجع رابطها عشان complete_my_task تاخده p_proof_url.
// الهوية من توكن Supabase (نفس نمط /api/chat/media) — الرفع بالـservice role عشان
// سياسات الستوريج ماتبلعش الطلب بصمت.
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const runtime = 'nodejs'
export const maxDuration = 30

const MAX_BYTES = 2 * 1024 * 1024

export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim()
  let body: { taskId?: string; dataBase64?: string; mimetype?: string }
  try { body = await request.json() } catch { return NextResponse.json({ ok: false, error: 'bad json' }, { status: 400 }) }
  const dataBase64 = (body.dataBase64 || '').replace(/^data:[^;]+;base64,/, '').trim()
  const mimetype = (body.mimetype || 'image/jpeg').trim()
  const taskId = (body.taskId || '').replace(/[^a-zA-Z0-9-]/g, '').slice(0, 40) || 'task'
  if (!token || !dataBase64) return NextResponse.json({ ok: false, error: 'unauthorized or empty' }, { status: 401 })
  if (!mimetype.startsWith('image/')) return NextResponse.json({ ok: false, error: 'صور بس' }, { status: 400 })

  const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const userClient = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${token}` } }, auth: { persistSession: false } })
  const { data: { user } } = await userClient.auth.getUser()
  if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })

  const buf = Buffer.from(dataBase64, 'base64')
  if (buf.length > MAX_BYTES) return NextResponse.json({ ok: false, error: 'الصورة كبيرة — جرّب تاني' }, { status: 413 })

  const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
  const ext = mimetype === 'image/png' ? 'png' : mimetype === 'image/webp' ? 'webp' : 'jpg'
  const path = `task-proofs/${user.id}/${taskId}-${Date.now()}.${ext}`
  const { error } = await admin.storage.from('content-images').upload(path, buf, { contentType: mimetype, upsert: false })
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  const { data: pub } = admin.storage.from('content-images').getPublicUrl(path)
  return NextResponse.json({ ok: true, url: pub.publicUrl, bytes: buf.length })
}
