import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_VALUE } from '@/lib/adminGate'

// Server-side, service-role. The meaningful DB write is still gated by
// supplier_self_set_media (ownership-checked) called from the client with the
// supplier's session — this route only stores the file and returns a public URL.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

const BUCKET = 'content-images'
const KINDS = ['cover', 'gallery', 'branch', 'employee', 'inventory', 'logo']

// POST /api/supplier/upload-media
// FormData: { file, supplierId, kind }
// Returns: { success, url, path }
export async function POST(req: NextRequest) {
  try {
    // 🔒 (١٢ أغسطس ٢٠٢٦ — المراجعة الشاملة) كان من غير أي auth ولا فحص
    // ملكية — أي حد يرفع صور في مجلد أي سبلاير ويملى الستوريدج بروابط
    // «رسمية» على دومينا. دلوقتي: Bearer المستخدم + لازم يكون صاحب
    // السبلاير نفسه (profile_id).
    // الأدمن (كوكي جلسة اللوحة — بتتبعت تلقائيًا من صفحات /admin) يرفع لأي سبلاير
    const adminCookie = req.cookies.get(ADMIN_COOKIE)?.value
    const isAdminSession = !!ADMIN_SESSION_VALUE && adminCookie === ADMIN_SESSION_VALUE

    const bearer = (req.headers.get('authorization') || '').replace(/^Bearer\s+/i, '')
    let authedUserId: string | null = null
    if (!isAdminSession) {
      if (!bearer) return NextResponse.json({ success: false, error: 'auth required' }, { status: 401 })
      const { data: userData, error: userErr } = await supabase.auth.getUser(bearer)
      if (userErr || !userData?.user) {
        return NextResponse.json({ success: false, error: 'invalid token' }, { status: 401 })
      }
      authedUserId = userData.user.id
    }

    const fd = await req.formData()
    const file = fd.get('file') as File | null
    const supplierId = (fd.get('supplierId') as string | null) || ''
    const kind = ((fd.get('kind') as string | null) || 'gallery').toLowerCase()

    if (!file) return NextResponse.json({ success: false, error: 'file required' }, { status: 400 })
    if (!supplierId) return NextResponse.json({ success: false, error: 'supplierId required' }, { status: 400 })

    if (!isAdminSession) {
      const { data: owned } = await supabase
        .from('marketplace_suppliers')
        .select('id')
        .eq('id', supplierId)
        .eq('profile_id', authedUserId!)
        .maybeSingle()
      if (!owned) {
        return NextResponse.json({ success: false, error: 'مش صاحب البيزنس ده' }, { status: 403 })
      }
    }
    if (!KINDS.includes(kind)) return NextResponse.json({ success: false, error: 'kind غير صحيح' }, { status: 400 })

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase()
    if (!['jpg', 'jpeg', 'png', 'webp', 'heic'].includes(ext)) {
      return NextResponse.json({ success: false, error: 'بنقبل صور بس (JPG/PNG/WEBP)' }, { status: 400 })
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ success: false, error: 'الصورة أكبر من 8 ميجا' }, { status: 400 })
    }

    const path = `supplier-media/${supplierId}/${kind}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const buf = Buffer.from(await file.arrayBuffer())
    const { error } = await supabase.storage.from(BUCKET).upload(path, buf, {
      contentType: file.type || `image/${ext}`,
      upsert: false,
    })
    if (error) {
      console.error('supplier media upload error:', error)
      return NextResponse.json({ success: false, error: error.message }, { status: 500 })
    }

    const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path)
    return NextResponse.json({ success: true, url: pub.publicUrl, path })
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || 'upload failed' }, { status: 500 })
  }
}
