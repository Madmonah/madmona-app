// 📸 (٢٤ أغسطس ٢٦) رفع صور من مودال «ضيف إعلان» في اللوحة.
//
// محمد: «الصور مش بتسمع في الإضافة الجديدة والنشر متوقف».
//
// المودال بيخلق الإعلان بـadmin_add_listing، وبعدين يرفع كل صورة
// هنا واحدة واحدة. الرفع بيعدّي على Supabase Storage (bucket:
// listing-photos)، وبعدين بينضاف صف في listing_photos بلينك عمومي.
// أول صورة بتتحطّ is_primary=true.
//
// الحماية: كوكي جلسة اللوحة (نفس isAdminRequest اللي في /api/admin/rpc).
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
// 🧑‍💼 (٢٥/٨) محمد: «اعلانات شهد لسة مش بتنزل» — موظفين الأبليكيشن
// (جلسة Supabase) بقوا مقبولين هنا كمان، مش كوكي اللوحة بس.
import { isAdminOrListingsStaffRequest } from '@/lib/adminGate'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BUCKET = 'listing-photos'
const MAX_BYTES = 8 * 1024 * 1024 // 8MB

export async function POST(req: NextRequest) {
  if (!(await isAdminOrListingsStaffRequest(req))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  let listingId = ''
  let file: File | null = null
  let displayOrder = 0
  let isPrimary = false

  try {
    const form = await req.formData()
    listingId = String(form.get('listing_id') || '').trim()
    file = form.get('file') as File | null
    displayOrder = Number(form.get('display_order') || 0)
    isPrimary = String(form.get('is_primary') || '').toLowerCase() === 'true'
  } catch {
    return NextResponse.json({ ok: false, error: 'bad_form' }, { status: 400 })
  }

  if (!listingId) return NextResponse.json({ ok: false, error: 'listing_id مطلوب' }, { status: 400 })
  if (!file) return NextResponse.json({ ok: false, error: 'الملف مطلوب' }, { status: 400 })
  if (!/^image\//.test(file.type)) {
    return NextResponse.json({ ok: false, error: 'الملف مش صورة' }, { status: 400 })
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ ok: false, error: 'الصورة أكبر من ٨ ميجا' }, { status: 400 })
  }

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )

  // اتأكّد إن الإعلان موجود قبل ما ترفع الصورة (مايبقاش عندنا صور يتيمة)
  const { data: listing } = await db.from('listings')
    .select('id').eq('id', listingId).maybeSingle()
  if (!listing) return NextResponse.json({ ok: false, error: 'الإعلان مش موجود' }, { status: 404 })

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg'
  const path = `${listingId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
  const buf = Buffer.from(await file.arrayBuffer())

  const up = await db.storage.from(BUCKET).upload(path, buf, {
    contentType: file.type, upsert: false,
  })
  if (up.error) {
    return NextResponse.json({ ok: false, error: 'الرفع فشل: ' + up.error.message }, { status: 502 })
  }

  const { data: pub } = db.storage.from(BUCKET).getPublicUrl(path)
  const url = pub.publicUrl

  const { data: row, error: insErr } = await db.from('listing_photos').insert({
    listing_id: listingId, url, storage_path: path,
    display_order: displayOrder, is_primary: isPrimary,
  } as never).select('id').single()

  if (insErr) {
    // لو الصف فشل، امسح الملف عشان مانخلّيش صور يتيمة في الستوريج
    await db.storage.from(BUCKET).remove([path]).catch(() => {})
    return NextResponse.json({ ok: false, error: 'حفظ الصورة فشل: ' + insErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, id: (row as { id: string }).id, url, path })
}

// 🧹 (٢٥/٨/٢٠٢٦ — محمد: «بيطلب من سامية الصور بترفع الصور بيجيب لها خطأ»)
// فورم التعديل وهو بيعيد حفظ الصور بيمسح القديم الأول. الموظف الداخل
// بكوكي اللوحة من غير جلسة Supabase مايقدرش يمسح مباشرة — فالمسح بيعدي
// من هنا بنفس حماية الكوكي.
export async function DELETE(req: NextRequest) {
  if (!(await isAdminOrListingsStaffRequest(req))) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }
  const listingId = new URL(req.url).searchParams.get('listing_id')?.trim() || ''
  if (!listingId) return NextResponse.json({ ok: false, error: 'listing_id مطلوب' }, { status: 400 })

  const db = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } },
  )
  const { data, error } = await db.from('listing_photos')
    .delete().eq('listing_id', listingId).select('id')
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, deleted: (data ?? []).length })
}
