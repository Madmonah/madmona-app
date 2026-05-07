// src/app/admin/ai-os/page.tsx
// AI Operating System Dashboard with controls

import { supabase as supabaseAdmin } from '@/lib/supabase'
import AIOSControls from './AIOSControls'

export const dynamic = 'force-dynamic'
export const revalidate = 0

const TEAMS = {
  sales: { label: '💰 Sales', color: '#1F5F3F' },
  marketing: { label: '📣 Marketing', color: '#B8860B' },
  ops: { label: '⚙️ Ops', color: '#666' },
  creative: { label: '🎨 Creative', color: '#C2410C' },
  operations: { label: '💼 Operations', color: '#1F5F3F' },
  strategic: { label: '🧠 Strategic', color: '#2c3e50' },
}

export default async function AIOSPage() {
  const { data: agentsRaw } = await supabaseAdmin
    .from('agent_registry')
    .select('*')
    .order('team', { ascending: true })
    .order('agent_name', { ascending: true })

  type Agent = {
    agent_name: string
    team: string
    display_name: string | null
    description: string | null
    enabled: boolean
    schedule_cron: string | null
    last_run_at: string | null
    run_count: number
    success_count: number
    error_count: number
  }
  const agents = (agentsRaw ?? []) as Agent[]

  const [adsCount, reelsCount, qcCount, bookingDecisionsCount, briefsCount, playsCount, pendingCount, insightsCount] = await Promise.all([
    supabaseAdmin.from('ad_creatives').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('reel_scripts').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('qc_reports').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('booking_decisions').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('ceo_briefs').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('strategy_plays').select('*', { count: 'exact', head: true }),
    supabaseAdmin.from('agent_runs').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabaseAdmin.from('agent_insights').select('*', { count: 'exact', head: true }).eq('status', 'new').eq('priority', 'high'),
  ])

  const byTeam = new Map<string, Agent[]>()
  for (const a of agents) {
    if (!byTeam.has(a.team)) byTeam.set(a.team, [])
    byTeam.get(a.team)!.push(a)
  }

  return (
    <div dir="rtl" style={{
      fontFamily: 'Tahoma, Arial, sans-serif',
      background: '#FAF7F0',
      minHeight: '100vh',
      padding: '24px 20px',
      color: '#1a1a1a',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <header style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ color: '#1F5F3F', margin: 0, fontSize: 32, fontWeight: 'bold' }}>
            🤖 Madmona AI Operating System
          </h1>
          <p style={{ color: '#666', marginTop: 8, fontSize: 14 }}>
            {agents.length} agent بيشتغلوا 24/7 · مدير شركة بالكامل
          </p>
        </header>

        {/* High priority alert */}
        {(insightsCount.count ?? 0) > 0 && (
          <a href="/admin/insights" style={{
            display: 'block', background: '#C2410C', color: '#fff',
            padding: 16, borderRadius: 12, marginBottom: 16,
            textDecoration: 'none', fontWeight: 'bold', textAlign: 'center',
          }}>
            🚨 {insightsCount.count} insight عالي الأولوية محتاج إجراء — اضغط هنا
          </a>
        )}

        {/* Output stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 12,
          marginBottom: 24,
        }}>
          {[
            { label: '🎨 Ad Creatives', val: adsCount.count ?? 0, href: '/admin/ad-creatives' },
            { label: '🎬 Reel Scripts', val: reelsCount.count ?? 0, href: '/admin/reels' },
            { label: '✅ QC Reports', val: qcCount.count ?? 0, href: '/admin/qc-reports' },
            { label: '📅 Booking Decisions', val: bookingDecisionsCount.count ?? 0 },
            { label: '🌅 CEO Briefs', val: briefsCount.count ?? 0, href: '/admin/ceo-briefs' },
            { label: '🧠 Strategy Plays', val: playsCount.count ?? 0, href: '/admin/strategy' },
            { label: '⏳ Pending', val: pendingCount.count ?? 0 },
          ].map((s, i) => (
            <a key={i} href={s.href ?? '#'} style={{
              background: '#fff', padding: 16, borderRadius: 12,
              border: '1px solid #eee', textAlign: 'center',
              textDecoration: 'none', color: 'inherit', display: 'block',
            }}>
              <div style={{ fontSize: 28, fontWeight: 'bold', color: '#1F5F3F' }}>{s.val}</div>
              <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{s.label}</div>
            </a>
          ))}
        </div>

        {/* Interactive controls (client-side) */}
        <AIOSControls
          agentsByTeam={Object.fromEntries(byTeam)}
          teams={TEAMS}
        />

        <div style={{
          background: '#1F5F3F', color: '#FAF7F0',
          padding: 24, borderRadius: 16, marginTop: 32, textAlign: 'center',
        }}>
          <h3 style={{ margin: '0 0 8px' }}>🚀 الـ AI OS بيشتغل دلوقتي</h3>
          <p style={{ margin: 0, opacity: 0.9, fontSize: 14 }}>
            {agents.filter(a => a.enabled).length} agent نشط · بيدير كل أقسام مضمونة بدون تدخل
          </p>
        </div>

        <div style={{ marginTop: 24, textAlign: 'center', display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="/admin/marketing-hq" style={navLinkStyle}>← Marketing HQ</a>
          <a href="/admin/leads-feed" style={navLinkStyle}>Leads Feed</a>
          <a href="/admin/ad-builder" style={navLinkStyle}>Ad Builder</a>
        </div>
      </div>
    </div>
  )
}

const navLinkStyle: React.CSSProperties = {
  color: '#1F5F3F', textDecoration: 'none', fontSize: 13,
  padding: '8px 16px', background: '#fff',
  borderRadius: 8, border: '1px solid #1F5F3F',
}
