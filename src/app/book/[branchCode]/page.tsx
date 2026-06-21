import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'

// Unified booking: every legacy branch-booking link now routes into the
// Madmona marketplace booking flow (single ledger = marketplace_bookings).
// "زي سعداوي" — أي حجز يعدّي من خلال الماركتبليس.
export const dynamic = 'force-dynamic'

export default async function BranchBookingRedirect({ params }: { params: { branchCode: string } }) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  let target = '/marketplace'
  try {
    // @ts-expect-error rpc typing
    const { data } = await supabase.rpc('public_resolve_booking_target', { p_branch_code: params.branchCode })
    if (data?.found && data?.listing_slug) {
      target = `/marketplace/${data.listing_slug}/book`
    } else if (data?.found === false) {
      target = '/marketplace'
    }
  } catch {
    target = '/marketplace'
  }

  redirect(target)
}
