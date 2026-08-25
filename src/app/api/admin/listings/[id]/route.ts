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

  // 🔑 (٢٥ أغسطس ٢٠٢٦) الصلاحية بقت `admin_delete_listing()` في الداتابيز،
  //    مش `profiles.role = 'admin'` هنا. الجذر: الشرط القديم كان بيقفل
  //    المسح على حساب واحد بس (`madmona@madmonacairo.com`) — فريق مضمونة
  //    كله، بصلاحية «مسح الإعلانات» بتاعته، كان بياخد 403 من غير سبب واضح.
  //    الدالة كمان بتفهم الجداول اللي بتمنع المسح: طلبات · بنود طلبات ·
  //    حجوزات (RESTRICT — سجلات فلوس) وبترجّع رسالة مفهومة بدل خطأ FK خام.

  // 2. المسح نفسه بجلسة اليوزر — الدالة هي اللي بتحكم مين يمسح إيه
  const { data: result, error: rpcErr } = await (userClient.rpc as unknown as (
    fn: string, args: Record<string, unknown>,
  ) => Promise<{ data: any; error: any }>)('admin_delete_listing', {
    p_listing_id: listingId,
    p_reason: 'مسح من لوحة الإدارة — /admin/listings',
  })

  if (rpcErr) {
    return NextResponse.json({ error: 'delete_failed', message: rpcErr.message }, { status: 500 })
  }
  if (!result?.ok) {
    // الإعلان عليه طلبات أو حجوزات → مش خطأ، ده قرار: يتقفل مايتمسحش
    if (result?.blocked) {
      return NextResponse.json({
        error: 'has_transactions',
        message: `${result.error} — طلبات: ${result.orders} · بنود: ${result.order_items} · حجوزات: ${result.bookings}. ${result.hint}`,
        ...result,
      }, { status: 409 })
    }
    return NextResponse.json(
      { error: 'forbidden', message: result?.error || 'مالكش صلاحية المسح' },
      { status: 403 },
    )
  }

  // 3. تنضيف ملفات الصور من الستوريدج — بعد ما المسح نجح، وبأفضل مجهود.
  //    (الصفوف نفسها اتمسحت CASCADE، ده الملفات بس.) الصور محفوظة في
  //    `listings_recycle_bin` كـURLs لو حصل استرجاع.
  let photosRemoved = 0
  try {
    const adminClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
    const bin = await adminClient
      .from('listings_recycle_bin').select('photos').eq('listing_id', listingId).maybeSingle()
    const paths = (((bin.data as { photos?: { storage_path?: string | null }[] } | null)?.photos) || [])
      .map(p => p?.storage_path).filter((p): p is string => !!p)
    if (paths.length) {
      await adminClient.storage.from('listing-photos').remove(paths)
      photosRemoved = paths.length
    }
  } catch { /* الملفات مش حاجزة — الإعلان اتمسح خلاص */ }

  return NextResponse.json({
    ok: true,
    type: 'hard_delete',
    message: `تم حذف «${result.title || 'الإعلان'}» بالكامل — محفوظ في سلة المهملات لو احتجته`,
    was_status: result.was_status,
    photos_removed: photosRemoved || result.photos_removed,
    reviews_removed: result.reviews_removed,
    restore: result.restore,
  })
}
