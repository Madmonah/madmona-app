import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

function checkAuth(request: Request): boolean {
  const expected = process.env.ADMIN_PASSWORD
  if (!expected) return false
  return request.headers.get('x-admin-password') === expected
}

// GET /api/admin/meta
// Returns the lookup data the admin pages need to render dropdowns:
//   - All approved suppliers (for supplier_id picker on the unit form)
//   - All active categories (for category_slug picker)
// One round-trip instead of two so the form loads faster.
export async function GET(request: Request) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const [suppliersRes, categoriesRes] = await Promise.all([
    // @ts-expect-error - new tables
    supabase
      .from('suppliers')
      .select('id, business_name, district, status, commission_rate')
      .order('business_name', { ascending: true }),
    // @ts-expect-error - new tables
    supabase
      .from('unit_categories')
      .select('slug, name_ar, name_en, icon, display_order, is_active')
      .order('display_order', { ascending: true }),
  ])

  if (suppliersRes.error) {
    console.error('[admin/meta] suppliers error:', suppliersRes.error)
    return NextResponse.json({ error: 'Failed to load suppliers' }, { status: 500 })
  }
  if (categoriesRes.error) {
    console.error('[admin/meta] categories error:', categoriesRes.error)
    return NextResponse.json({ error: 'Failed to load categories' }, { status: 500 })
  }

  return NextResponse.json({
    suppliers: suppliersRes.data ?? [],
    categories: categoriesRes.data ?? [],
  })
}
