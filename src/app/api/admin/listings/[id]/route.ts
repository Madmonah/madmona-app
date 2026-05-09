import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// ============================================================================
// DELETE /api/admin/listings/[id]
//
// Smart admin delete that handles all foreign-key dependencies:
//   1. Verifies caller is admin (via JWT)
//   2. If listing has bookings → soft-delete (status='rejected' + archived_at)
//      to preserve booking history
//   3. If no bookings → hard delete with cascade cleanup:
//      - Delete listing_photos rows + storage files
//      - Delete pricing_rules rows
//      - Delete listing_values rows
//      - Delete favorites rows
//      - Delete reviews rows
//      - Then delete listing itself
//
// Uses service_role key to bypass RLS — auth checked manually via JWT.
// ============================================================================

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: listingId } = await context.params

  // 1. Verify admin via JWT
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace(/^Bearer\s+/i, '').trim()

  if (!token) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  const userClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { global: { headers: { Authorization: `Bearer ${token}` } } }
  )

  const { data: { user } } = await userClient.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  }

  // @ts-expect-error
  const { data: prof } = await userClient
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()

  if (prof?.role !== 'admin') {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  // 2. Use service_role for DB operations (bypasses RLS)
  const adminClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 3. Check if listing exists & if it has any bookings
  // @ts-expect-error
  const { data: listing, error: fetchErr } = await adminClient
    .from('listings')
    .select('id, title, status')
    .eq('id', listingId)
    .maybeSingle()

  if (fetchErr || !listing) {
    return NextResponse.json({ error: 'listing_not_found' }, { status: 404 })
  }

  // @ts-expect-error
  const { count: bookingsCount } = await adminClient
    .from('marketplace_bookings')
    .select('id', { count: 'exact', head: true })
    .eq('listing_id', listingId)

  const hasBookings = (bookingsCount || 0) > 0

  // 4. SOFT DELETE if bookings exist (preserve history)
  if (hasBookings) {
    // @ts-expect-error
    const { error: updateErr } = await adminClient
      .from('listings')
      .update({
        status: 'rejected',
        // archived_at is optional — only set if column exists
      })
      .eq('id', listingId)

    if (updateErr) {
      return NextResponse.json({
        error: 'soft_delete_failed',
        message: updateErr.message,
      }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      type: 'soft_delete',
      message: `الخدمة عندها ${bookingsCount} حجز — تم أرشفتها (إخفاؤها) بدل الحذف الكامل عشان نحافظ على تاريخ الحجوزات`,
      bookings_count: bookingsCount,
    })
  }

  // 5. HARD DELETE — clean up dependents in order
  const cleanupSteps: { table: string; success: boolean; error?: string }[] = []

  // Helper to attempt deletion of dependent rows
  const tryDelete = async (table: string, column: string = 'listing_id') => {
    try {
      // @ts-expect-error
      const { error } = await adminClient
        .from(table)
        .delete()
        .eq(column, listingId)
      cleanupSteps.push({ table, success: !error, error: error?.message })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown'
      cleanupSteps.push({ table, success: false, error: msg })
    }
  }

  // First, fetch storage paths for photos so we can delete files
  // @ts-expect-error
  const { data: photos } = await adminClient
    .from('listing_photos')
    .select('storage_path')
    .eq('listing_id', listingId)

  type PhotoRow = { storage_path: string | null }
  const storagePaths = ((photos || []) as PhotoRow[])
    .map(p => p.storage_path)
    .filter((p): p is string => !!p)

  // Delete dependents
  await tryDelete('listing_photos')
  await tryDelete('pricing_rules')
  await tryDelete('listing_values')
  await tryDelete('favorites')
  await tryDelete('reviews')

  // Try to delete storage files (best-effort, doesn't block listing deletion)
  if (storagePaths.length > 0) {
    try {
      // @ts-expect-error
      await adminClient.storage.from('listing-photos').remove(storagePaths)
    } catch (e) {
      // Log but don't fail
      console.warn('Storage cleanup failed:', e)
    }
  }

  // 6. Finally, delete the listing itself
  // @ts-expect-error
  const { error: deleteErr } = await adminClient
    .from('listings')
    .delete()
    .eq('id', listingId)

  if (deleteErr) {
    return NextResponse.json({
      error: 'delete_failed',
      message: deleteErr.message,
      cleanup: cleanupSteps,
    }, { status: 500 })
  }

  return NextResponse.json({
    ok: true,
    type: 'hard_delete',
    message: 'تم حذف الخدمة بالكامل مع كل بياناتها',
    cleanup: cleanupSteps,
    photos_removed: storagePaths.length,
  })
}
