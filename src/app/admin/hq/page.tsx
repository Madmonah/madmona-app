// src/app/admin/hq/page.tsx
// MASTER ADMIN PANEL — comprehensive: dashboard + AI OS + marketplace + ops

import { supabase as supabaseAdmin } from '@/lib/supabase'
import HQClient from './HQClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HQPage() {
  const monthAgo = new Date()
  monthAgo.setMonth(monthAgo.getMonth() - 1)
  const monthAgoIso = monthAgo.toISOString()

  const [
    agentsRes, runsTodayRes, runs24hRes,
    adsRes, reelsRes, qcRes, briefsRes, playsRes,
    insightsRes, fraudRes, demandRes, partnershipsRes, pricingRes,
    promptVersionsRes, collabsRes, msgsRes,
    customerSuccessRes, emailResponsesRes, photoBriefsRes,
    contentRes, complaintsRes, recentRunsRes,
    bookingsAllRes, bookingsRecentRes, suppliersAllRes,
    listingsAllRes, listingsTopRes,
    customersCountRes, reviewsRes, pushSubsRes,
    leadsRes, leadsRecentRes, payoutsRes,
    notificationsRes, categoriesRes,
  ] = await Promise.all([
    supabaseAdmin.from('agent_registry').select('*').order('team').order('agent_name'),
    supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true })
      .gte('started_at', new Date(Date.now() - 24*60*60*1000).toISOString()),
    supabaseAdmin.from('agent_runs').select('agent_name, status, duration_ms, started_at')
      .gte('started_at', new Date(Date.now() - 24*60*60*1000).toISOString())
      .order('started_at', { ascending: false }).limit(50),
    supabaseAdmin.from('ad_creatives').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('reel_scripts').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('qc_reports').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('ceo_briefs').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('strategy_plays').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('agent_insights').select('*').order('priority', { ascending: false }).order('created_at', { ascending: false }).limit(30),
    supabaseAdmin.from('fraud_alerts').select('*').order('severity', { ascending: false }).order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('demand_forecasts').select('*').order('supply_gap', { ascending: true }).limit(15),
    supabaseAdmin.from('partnership_opportunities').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('pricing_suggestions').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('prompt_versions').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('agent_collaborations').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('agent_messages').select('id, from_agent, to_agent, message_type, subject, status, created_at').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('customer_success_actions').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('email_responses').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('photo_briefs').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('content_calendar').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('complaint_resolutions').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('agent_runs').select('id, agent_name, status, duration_ms, started_at, error_message')
      .order('started_at', { ascending: false }).limit(30),
    supabaseAdmin.from('marketplace_bookings').select('id, status, total_amount, commission_amount, created_at'),
    supabaseAdmin.from('marketplace_bookings').select(`
      id, reference_code, total_amount, status, created_at,
      listing:listings(title),
      supplier:marketplace_suppliers(business_name)
    `).order('created_at', { ascending: false }).limit(15),
    // Suppliers WITH profile join (for name/phone display)
    supabaseAdmin.from('marketplace_suppliers').select(`
      id, profile_id, business_name, description, logo_url,
      account_type, kyc_status, kyc_rejection_reason, commission_rate,
      listings_count, bookings_count, total_revenue, rating, reviews_count,
      created_at,
      profile:profiles!marketplace_suppliers_profile_id_fkey(id, full_name, phone, email)
    `).order('created_at', { ascending: false }),
    supabaseAdmin.from('listings').select('id, title, status, category_id, created_at'),
    supabaseAdmin.from('listings').select('id, title, slug, views_count, bookings_count, rating')
      .eq('status', 'published').order('views_count', { ascending: false }).limit(10),
    supabaseAdmin.from('profiles').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reviews').select('rating').eq('is_published', true),
    supabaseAdmin.from('push_subscriptions').select('*', { count: 'exact', head: true }),
    // 🐛 (١٣ أغسطس ٢٠٢٦ — جرد الكود مقابل الداتابيز) الأربع استعلامات دي كانت
    // بتنده على جداول **مش موجودة خالص**: lead_captures / payouts / notifications
    // / listing_categories. supabase-js بيرجّع الخطأ في `.error` مش بيرميه،
    // و`Promise.all` هنا مش بيقع — فالصفحة كانت بتفتح عادي وتعرض **أصفار كاذبة**.
    // ده أخطر من إنها تقع: «٠ فئة» و«٠ إشعار» كانوا بيبانوا كأنهم حقيقة،
    // والواقع 415 فئة و4869 إشعار. اتوصلت بالجداول الحقيقية:
    //   lead_captures      → sales_leads (مع alias عشان الواجهة ما تتغيّرش)
    //   payouts            → supplier_payouts
    //   notifications      → notification_queue
    //   listing_categories → categories
    supabaseAdmin.from('sales_leads').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('sales_leads')
      .select('id, full_name:contact_name, phone_number:contact_phone, intent, lead_score, created_at')
      .order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('supplier_payouts').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('notification_queue').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('categories').select('id, name_ar, slug').eq('is_active', true).order('display_order'),
  ])

  type Booking = { status: string; total_amount: number | string; commission_amount: number | string; created_at: string }
  const bookings = (bookingsAllRes.data ?? []) as Booking[]
  const finalized = bookings.filter(b => ['confirmed', 'active', 'completed'].includes(b.status))
  const finalizedThisMonth = finalized.filter(b => new Date(b.created_at) >= new Date(monthAgoIso))

  const totalGMV = finalized.reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const monthGMV = finalizedThisMonth.reduce((s, b) => s + Number(b.total_amount || 0), 0)
  const totalCommission = finalized.reduce((s, b) => s + Number(b.commission_amount || 0), 0)
  const monthCommission = finalizedThisMonth.reduce((s, b) => s + Number(b.commission_amount || 0), 0)

  const reviewsArr = (reviewsRes.data ?? []) as Array<{ rating: number }>
  const avgRating = reviewsArr.length > 0
    ? reviewsArr.reduce((s, r) => s + r.rating, 0) / reviewsArr.length
    : 0

  const suppliersAll = (suppliersAllRes.data ?? []) as Array<{ kyc_status: string }>
  const listingsAll = (listingsAllRes.data ?? []) as Array<{ status: string }>

  return (
    <HQClient
      data={{
        agents: agentsRes.data ?? [],
        runs24hCount: runsTodayRes.count ?? 0,
        recentRuns: recentRunsRes.data ?? [],
        runs24hList: runs24hRes.data ?? [],
        ads: adsRes.data ?? [],
        reels: reelsRes.data ?? [],
        qc: qcRes.data ?? [],
        briefs: briefsRes.data ?? [],
        plays: playsRes.data ?? [],
        insights: insightsRes.data ?? [],
        fraud: fraudRes.data ?? [],
        demand: demandRes.data ?? [],
        partnerships: partnershipsRes.data ?? [],
        pricing: pricingRes.data ?? [],
        promptVersions: promptVersionsRes.data ?? [],
        collabs: collabsRes.data ?? [],
        messages: msgsRes.data ?? [],
        customerSuccess: customerSuccessRes.data ?? [],
        emailResponses: emailResponsesRes.data ?? [],
        photoBriefs: photoBriefsRes.data ?? [],
        content: contentRes.data ?? [],
        complaints: complaintsRes.data ?? [],
        kpis: {
          totalGMV, monthGMV, totalCommission, monthCommission,
          totalBookings: bookings.length,
          monthBookings: bookings.filter(b => new Date(b.created_at) >= new Date(monthAgoIso)).length,
          pendingBookings: bookings.filter(b => b.status === 'pending_payment').length,
          confirmedBookings: bookings.filter(b => b.status === 'confirmed').length,
          completedBookings: bookings.filter(b => b.status === 'completed').length,
          cancelledBookings: bookings.filter(b => b.status === 'cancelled').length,
          totalCustomers: customersCountRes.count ?? 0,
          approvedSuppliers: suppliersAll.filter(s => s.kyc_status === 'approved').length,
          pendingSuppliers: suppliersAll.filter(s => s.kyc_status === 'pending').length,
          publishedListings: listingsAll.filter(l => l.status === 'published').length,
          draftListings: listingsAll.filter(l => ['draft', 'pending_review'].includes(l.status)).length,
          totalReviews: reviewsArr.length,
          averageRating: avgRating,
          pushSubscribers: pushSubsRes.count ?? 0,
          leadsCount: leadsRes.count ?? 0,
          notificationsCount: notificationsRes.count ?? 0,
          categoriesCount: (categoriesRes.data ?? []).length,
        },
        bookingsRecent: bookingsRecentRes.data ?? [],
        suppliers: suppliersAllRes.data ?? [],
        topListings: listingsTopRes.data ?? [],
        leadsRecent: leadsRecentRes.data ?? [],
        payouts: payoutsRes.data ?? [],
        categories: categoriesRes.data ?? [],
      }}
    />
  )
}
