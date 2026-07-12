// src/app/api/projects/upload-url/route.ts
// =====================================================================
// 🔐 Signed upload URL لبكت project-media
// ليه؟ عشان الملف يروح لـSupabase Storage على طول من المتصفح —
// راوتات Vercel محدودة بـ4.5MB في الـbody، والفيديوهات أكبر من كده.
// الراوت ده بيوقّع بس (service role) والرفع الفعلي بيحصل من الكلاينت.
// =====================================================================
import { NextRequest, NextResponse } from 'next/server'
import { sbProjects as supabase } from '@/lib/supabaseProjects'
import { UPLOAD_LIMITS, ACCEPTED_MIME, type MediaItem } from '@/lib/projects'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'project-media'

function extFor(mime: string): string {
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'application/pdf': 'pdf',
    'video/mp4': 'mp4',
    'video/webm': 'webm',
    'video/quicktime': 'mov',
  }
  return map[mime] || 'bin'
}

export async function POST(req: NextRequest) {
  let body: { kind?: string; mime?: string; size?: number; slug?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 })
  }

  const kind = body.kind as MediaItem['type']
  const mime = String(body.mime || '')
  const size = Number(body.size || 0)

  if (!kind || !ACCEPTED_MIME[kind]) {
    return NextResponse.json({ error: 'نوع الملف مش مدعوم' }, { status: 400 })
  }
  if (!ACCEPTED_MIME[kind].includes(mime)) {
    return NextResponse.json(
      { error: `صيغة مش مدعومة. المسموح: ${ACCEPTED_MIME[kind].join(', ')}` },
      { status: 400 },
    )
  }
  if (!size || size > UPLOAD_LIMITS[kind]) {
    const mb = Math.round(UPLOAD_LIMITS[kind] / (1024 * 1024))
    return NextResponse.json(
      { error: `الملف كبير أوي — الحد الأقصى ${mb} ميجا بعد الضغط` },
      { status: 413 },
    )
  }

  const safeSlug = (body.slug || 'project').replace(/[^a-z0-9-]/gi, '').slice(0, 40) || 'project'
  const rand = Math.random().toString(36).slice(2, 8)
  const path = `${safeSlug}/${kind}-${Date.now()}-${rand}.${extFor(mime)}`

  const { data, error } = await supabase.storage.from(BUCKET).createSignedUploadUrl(path)
  if (error || !data) {
    return NextResponse.json({ error: error?.message || 'فشل توقيع الرفع' }, { status: 500 })
  }

  const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)

  return NextResponse.json({
    bucket: BUCKET,
    path: data.path,
    token: data.token,
    publicUrl: pub.publicUrl,
  })
}
