import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

interface RouteContext {
  params: Promise<{ id: string }>
}

// GET /api/units/[id] — full details for a single unit, including supplier info.
// Used by the unit detail page (the booking-ready customer screen).
export async function GET(_request: Request, ctx: RouteContext) {
  const { id } = await ctx.params

  // Validate UUID format roughly — protect against malformed paths
  if (!id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: 'Invalid unit ID' }, { status: 400 })
  }

  // @ts-expect-error - new tables not in generated types
  const { data, error } = await supabase
    .from('space_units')
    .select(`
      *,
      supplier:suppliers!inner (
        id,
        business_name,
        district,
        address,
        description_ar,
        logo_url,
        status,
        commission_rate
      )
    `)
    .eq('id', id)
    .eq('is_active', true)
    .single()

  if (error || !data) {
    console.error('[units/:id] fetch error:', error)
    return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
  }

  // Don't expose supplier status/commission to customers — strip those
  // fields before returning. Admin uses /api/admin/units for full details.
  const unit = data as Record<string, unknown> & { supplier: Record<string, unknown> }
  if (unit.supplier) {
    delete unit.supplier.status
    delete unit.supplier.commission_rate
  }

  return NextResponse.json({ unit })
}
