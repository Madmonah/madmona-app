// app/api/admin/photo-audit/route.ts
// Audit UI backend for the ~86 listings flagged `needs_photo_audit=true`
// (created 4 Aug 2026 after the Talda "wrong photo" bug — the wa-inbound bucket
// had every supplier's photos mixed together so publish-drafts sometimes bound
// the wrong image as primary. See wa-inbound-photo-mismatch.md).
//
// GET  → list flagged listings + ALL their photos so the admin can pick primary.
// POST → set a new primary (and optionally hide bad photos), clear the flag.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } },
)

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const limit = Math.min(Number(url.searchParams.get('limit') || 20), 50)
  const cursor = url.searchParams.get('cursor') // last id from previous page

  let q = supabase
    .from('listings')
    .select('id, title, slug, city, district, price_egp, status, created_at, supplier_id, category_id, currency')
    .eq('needs_photo_audit', true)
    .order('created_at', { ascending: false })
    .limit(limit)
  if (cursor) q = q.lt('created_at', cursor)

  const { data: listings, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!listings?.length) return NextResponse.json({ listings: [], remaining: 0 })

  // fetch photos + supplier + category names in parallel
  const ids = (listings as Array<{ id: string }>).map((l) => l.id)
  const supIds = Array.from(
    new Set((listings as Array<{ supplier_id: string | null }>).map((l) => l.supplier_id).filter(Boolean) as string[]),
  )
  const catIds = Array.from(
    new Set((listings as Array<{ category_id: string | null }>).map((l) => l.category_id).filter(Boolean) as string[]),
  )

  const [photosR, suppliersR, categoriesR, totalR] = await Promise.all([
    supabase.from('listing_photos')
      .select('id, listing_id, url, is_primary, display_order, created_at')
      .in('listing_id', ids)
      .order('is_primary', { ascending: false })
      .order('display_order', { ascending: true }),
    supIds.length
      ? supabase.from('suppliers').select('id, business_name').in('id', supIds)
      : Promise.resolve({ data: [] }),
    catIds.length
      ? supabase.from('categories').select('id, name_ar').in('id', catIds)
      : Promise.resolve({ data: [] }),
    supabase.from('listings').select('id', { count: 'exact', head: true }).eq('needs_photo_audit', true),
  ])

  const photosByListing = new Map<string, Array<Record<string, unknown>>>()
  ;(photosR.data || []).forEach((p: any) => {
    const list = photosByListing.get(p.listing_id) || []
    list.push(p)
    photosByListing.set(p.listing_id, list)
  })
  const supplierMap = new Map<string, string>()
  ;(suppliersR.data || []).forEach((s: any) => supplierMap.set(s.id, s.business_name))
  const categoryMap = new Map<string, string>()
  ;(categoriesR.data || []).forEach((c: any) => categoryMap.set(c.id, c.name_ar))

  const items = (listings as Array<any>).map((l) => ({
    id: l.id,
    title: l.title,
    slug: l.slug,
    city: l.city,
    district: l.district,
    price_egp: l.price_egp,
    status: l.status,
    created_at: l.created_at,
    supplier_name: l.supplier_id ? supplierMap.get(l.supplier_id) || null : null,
    category_name: l.category_id ? categoryMap.get(l.category_id) || null : null,
    photos: photosByListing.get(l.id) || [],
  }))

  return NextResponse.json({
    listings: items,
    remaining: totalR.count ?? null,
    next_cursor: items.length === limit ? items[items.length - 1].created_at : null,
  })
}

// POST body: { listing_id, primary_photo_id, hide_photo_ids?: string[], clear_flag?: boolean }
export async function POST(req: NextRequest) {
  let body: {
    listing_id?: string
    primary_photo_id?: string
    hide_photo_ids?: string[]
    clear_flag?: boolean
  }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'bad_json' }, { status: 400 })
  }

  const { listing_id, primary_photo_id, hide_photo_ids = [], clear_flag = true } = body
  if (!listing_id || !primary_photo_id) {
    return NextResponse.json({ error: 'listing_id + primary_photo_id required' }, { status: 400 })
  }

  // demote all photos on this listing → then promote the chosen one to primary
  await supabase.from('listing_photos').update({ is_primary: false }).eq('listing_id', listing_id)
  const { error: promErr } = await supabase.from('listing_photos')
    .update({ is_primary: true, display_order: 1 })
    .eq('id', primary_photo_id)
    .eq('listing_id', listing_id)
  if (promErr) return NextResponse.json({ error: promErr.message }, { status: 500 })

  // hide bad photos → push to display_order=99+
  if (hide_photo_ids.length > 0) {
    for (let i = 0; i < hide_photo_ids.length; i++) {
      await supabase.from('listing_photos')
        .update({ is_primary: false, display_order: 90 + i })
        .eq('id', hide_photo_ids[i])
        .eq('listing_id', listing_id)
    }
  }

  // clear the audit flag → listing joins v_postiz_safe_listings
  if (clear_flag) {
    await supabase.from('listings').update({ needs_photo_audit: false }).eq('id', listing_id)
  }

  return NextResponse.json({ ok: true, listing_id, primary_photo_id, hidden: hide_photo_ids.length })
}
