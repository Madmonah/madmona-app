import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================
// POST /api/listing-drafts/bulk — Excel bulk upload from the PUBLIC
// /add-listing funnel (no auth). Creates up to 200 listing_drafts
// (status=submitted, source=excel_bulk) sharing one contact block.
// They flow into the normal review pipeline (/admin/listing-drafts)
// exactly like single-wizard submissions.
// ============================================================

export const dynamic = 'force-dynamic'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

type BulkItem = {
  title?: string
  category?: string
  price?: number | string | null
  price_on_request?: string | null
  description?: string | null
  district?: string | null
  city?: string | null
  photo_url?: string | null
}

function normPhone(raw: string | null | undefined): string | null {
  if (!raw) return null
  let d = String(raw).replace(/\D/g, '')
  if (d.startsWith('0020')) d = d.slice(2)
  if (d.startsWith('20') && d.length === 12) return d.slice(1) // store 01xxxxxxxxx style
  if (d.startsWith('01') && d.length === 11) return d
  if (d.startsWith('1') && d.length === 10) return '0' + d
  return null
}

const isPor = (v: unknown) =>
  ['نعم', 'اه', 'آه', 'yes', 'true', '1', 'y'].includes(String(v ?? '').trim().toLowerCase())

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null) as {
      contact_name?: string
      contact_phone?: string
      business_name?: string | null
      utm_source?: string | null
      utm_medium?: string | null
      utm_campaign?: string | null
      items?: BulkItem[]
    } | null

    if (!body) return NextResponse.json({ success: false, error: 'bad json' }, { status: 400 })

    const name = String(body.contact_name || '').trim()
    const phone = normPhone(body.contact_phone)
    if (!name) return NextResponse.json({ success: false, error: 'الاسم مطلوب' }, { status: 400 })
    if (!phone) return NextResponse.json({ success: false, error: 'رقم واتساب غير صحيح (01xxxxxxxxx)' }, { status: 400 })

    const items = Array.isArray(body.items) ? body.items : []
    if (items.length === 0) return NextResponse.json({ success: false, error: 'مفيش صفوف' }, { status: 400 })
    if (items.length > 200) return NextResponse.json({ success: false, error: 'الحد الأقصى 200 صف' }, { status: 400 })

    // categories lookup (active, non-restaurant)
    const { data: cats } = await admin
      .from('categories')
      .select('id, slug, name_ar, track, is_active')
      .eq('is_active', true)

    const catList = (cats || []) as { id: string; slug: string; name_ar: string; track: string }[]
    const resolveCat = (txt: string | null | undefined) => {
      const t = String(txt || '').trim()
      if (!t) return null
      const bySlug = catList.find((c) => c.slug === t.toLowerCase())
      if (bySlug) return bySlug
      const byName = catList.find((c) => c.name_ar.trim() === t)
      if (byName) return byName
      const partial = catList.filter((c) => c.name_ar.includes(t))
      if (partial.length === 1) return partial[0]
      return null
    }

    const rows: Record<string, unknown>[] = []
    const errors: { row: number; error: string }[] = []

    items.forEach((it, i) => {
      const rowNo = i + 1
      const title = String(it.title || '').trim()
      if (!title) { errors.push({ row: rowNo, error: 'العنوان فاضي' }); return }

      const por = isPor(it.price_on_request)
      let price: number | null = null
      const rawPrice = String(it.price ?? '').replace(/[,٬\s]/g, '')
      if (rawPrice) {
        const n = Number(rawPrice)
        if (!isNaN(n) && n >= 0) price = n
      }
      if (!por && price === null) {
        errors.push({ row: rowNo, error: `السعر ناقص (أو "نعم" في اتصل للسعر): ${title}` })
        return
      }

      const cat = resolveCat(it.category)
      if (cat && cat.track === 'restaurants') {
        errors.push({ row: rowNo, error: `فئات المطاعم ليها مسار المنيو: ${title}` })
        return
      }

      const photo = String(it.photo_url || '').trim()

      rows.push({
        title: title.slice(0, 200),
        category_id: cat?.id ?? null,
        category_slug: cat?.slug ?? null,
        description: String(it.description || '').trim() || title,
        city: String(it.city || '').trim() || 'القاهرة',
        district: String(it.district || '').trim() || null,
        price,
        price_period: 'per_unit',
        currency: 'EGP',
        photos: photo ? [{ url: photo }] : [],
        attributes: {
          price_on_request: por,
          category_text: cat ? undefined : (String(it.category || '').trim() || undefined),
          bulk_row: rowNo,
        },
        contact_name: name,
        contact_phone: phone,
        business_name: String(body.business_name || '').trim() || null,
        account_type: 'business',
        source: 'excel_bulk',
        utm_source: body.utm_source || null,
        utm_medium: body.utm_medium || null,
        utm_campaign: body.utm_campaign || null,
        status: 'submitted',
        current_step: 5,
        total_steps: 5,
      })
    })

    let created = 0
    if (rows.length > 0) {
      const { data: inserted, error } = await admin
        .from('listing_drafts')
        .insert(rows)
        .select('id')
      if (error) {
        console.error('[drafts/bulk] insert error:', error)
        return NextResponse.json({ success: false, error: error.message }, { status: 500 })
      }
      created = (inserted || []).length
    }

    return NextResponse.json({ success: true, created, failed: errors.length, errors: errors.slice(0, 20) })
  } catch (e) {
    console.error('[drafts/bulk] fatal:', e)
    return NextResponse.json({ success: false, error: 'server error' }, { status: 500 })
  }
}
