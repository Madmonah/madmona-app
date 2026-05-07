// src/app/admin/hq/page.tsx
// MASTER ADMIN PANEL - everything in one place

import { supabase as supabaseAdmin } from '@/lib/supabase'
import HQClient from './HQClient'

export const dynamic = 'force-dynamic'
export const revalidate = 0

export default async function HQPage() {
  // Pull EVERYTHING in parallel
  const [
    agentsRes, runsTodayRes, runs24hRes,
    adsRes, reelsRes, qcRes, briefsRes, playsRes,
    insightsRes, fraudRes, demandRes, partnershipsRes, pricingRes,
    promptVersionsRes, collabsRes, msgsRes,
    customerSuccessRes, emailResponsesRes, photoBriefsRes,
    bookingsRes, suppliersRes, listingsRes, leadsRes,
    contentRes, complaintsRes, recentRunsRes,
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
    supabaseAdmin.from('agent_messages').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('customer_success_actions').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('email_responses').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('photo_briefs').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('marketplace_bookings').select('*').order('created_at', { ascending: false }).limit(10),
    supabaseAdmin.from('marketplace_suppliers').select('*'),
    supabaseAdmin.from('listings').select('*', { count: 'exact', head: true }).eq('status', 'published'),
    supabaseAdmin.from('lead_captures').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('content_calendar').select('*').order('created_at', { ascending: false }).limit(20),
    supabaseAdmin.from('complaint_resolutions').select('*').order('created_at', { ascending: false }).limit(15),
    supabaseAdmin.from('agent_runs').select('id, agent_name, status, duration_ms, started_at, error_message, output_summary')
      .order('started_at', { ascending: false }).limit(30),
  ])

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
        bookings: bookingsRes.data ?? [],
        suppliersCount: (suppliersRes.data ?? []).length,
        listingsCount: listingsRes.count ?? 0,
        leadsCount: leadsRes.count ?? 0,
        content: contentRes.data ?? [],
        complaints: complaintsRes.data ?? [],
      }}
    />
  )
}
