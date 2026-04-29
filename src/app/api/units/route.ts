import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// GET /api/units?category=workstation&district=مصر الجديدة
//
// Public listing of marketplace units. Returns only active units owned
// by approved suppliers. Supports optional filtering by category slug
// and supplier district.
//
// Each unit includes its supplier's display details so the customer can
// see who owns the space without an extra round-trip.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const categorySlug = searchParams.get('category')
  const district = searchParams.get('district')

  // @ts-expect-error - new tables not yet in generated types
  let query = supabase
    .from('space_units')
    .select(`
      id,
      name_ar,
      description_ar,
      photo_urls,
      capacity,
      category_slug,
      price_hourly,
      price_daily,
      price_package_10,
      price_monthly,
      operating_start_hour,
      operating_end_hour,
      supplier:suppliers!inner (
        id,
        business_name,
        district,
        logo_url,
        status
      )
    `)
    .eq('is_active', true)
    .eq('suppliers.status', 'approved')

  if (categorySlug) {
    query = query.eq('category_slug', categorySlug)
  }
  if (district) {
    query = query.eq('suppliers.district', district)
  }

  const { data, error } = await query.order('created_at', { ascending: false }).limit(200)

  if (error) {
    console.error('[units] fetch error:', error)
    return NextResponse.json({ error: 'Failed to load units' }, { status: 500 })
  }

  return NextResponse.json({ units: data ?? [] })
}
