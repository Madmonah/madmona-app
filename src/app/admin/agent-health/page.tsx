'use client'

// =====================================================================
// /admin/agent-health — لوحة تحكم موحّدة لكل الـ Agents
// تبويب "الحالة": نفس فكرة الصفحة القديمة + عمود آلية التشغيل ودوره بالظبط.
// تبويب "الإعدادات": چيك ليست بالفرق، تشغيل/إيقاف كل agent (agent_registry.enabled)
// عن طريق set_agent_enabled() RPC.
// Phase Ω.12 — لوحة التحكم بالنبضة (Aug 9 2026)
// =====================================================================

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, RefreshCw, Zap, ZapOff,
  CheckCircle, AlertTriangle, AlertCircle, Clock, Search, Power,
  LayoutList, ListChecks, Radio, Calendar, Hand, Cable, Sigma, HelpCircle,
} from 'lucide-react'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'
type Tab = 'status' | 'settings'

interface AgentHealth {
  agent_name: string
  team: string
  display_name: string | null
  description: string | null
  trigger_type: string
  event_source: string | null
  enabled: boolean
  schedule_cron: string | null
  run_count: number
  success_count: number
  error_count: number
  last_run_at: string | null
  success_pct: number | null
  hours_since_last_run: number | null
  health_status: string
  reason_code: string | null
  suggested_action: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  healthy:  { label: 'سليم',      color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle },
  warning:  { label: 'تحذير',     color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle },
  critical: { label: 'حرج',       color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      icon: AlertCircle },
  disabled: { label: 'متوقف',     color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',    icon: ZapOff },
  never_ran:{ label: 'ما اشتغلش', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: Clock },
}

const TRIGGER_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof Radio }> = {
  event:       { label: 'حدث فوري',   color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200', icon: Radio },
  schedule:    { label: 'مجدول',      color: 'text-blue-700',    bg: 'bg-blue-50 border-blue-200',       icon: Calendar },
  manual:      { label: 'يدوي',       color: 'text-orange-700',  bg: 'bg-orange-50 border-orange-200',   icon: Hand },
  external:    { label: 'خدمة خارجية', color: 'text-sky-700',    bg: 'bg-sky-50 border-sky-200',         icon: Cable },
  sql_derived: { label: 'SQL مباشر',  color: 'text-violet-700',  bg: 'bg-violet-50 border-violet-200',   icon: Sigma },
  undecided:   { label: 'محتاج قرار', color: 'text-gray-600',    bg: 'bg-gray-50 border-gray-200',       icon: HelpCircle },
}

const TEAM_LABELS: Record<string, string> = {
  sales: 'مبيعات',
  marketing: 'تسويق',
  support: 'دعم العملاء',
  operations: 'عمليات',
  intelligence: 'استخبارات واستراتيجية',
  strategic: 'تنسيق',
  creative: 'إبداعي',
  growth: 'نمو',
  ops: 'عمليات',
  unified: 'موحّد',
}

function teamLabel(t: string) {
  return TEAM_LABELS[t] || t
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'مطلقاً'
  const d = new Date(iso)
  const mins = Math.floor((Date.now() - d.getTime()) / 60000)
  if (mins < 1) return 'الآن'
  if (mins < 60) return `${mins} د`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} س`
  const days = Math.floor(hrs / 24)
  return `${days} ي`
}

export default function AgentHealthPage() {
  const [stage, setStage] = useState<Stage>('loading')
  const [tab, setTab] = useState<Tab>('status')
  const [agents, setAgents] = useState<AgentHealth[]>([])
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'healthy' | 'disabled'>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [waking, setWaking] = useState<string | null>(null)
  const [wakingAll, setWakingAll] = useState(false)
  const [toggling, setToggling] = useState<string | null>(null)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }
    const { data: prof } = await supabaseBrowser.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    if (prof?.role !== 'admin') { setStage('forbidden'); return }
    await loadAgents()
    setStage('ready')
  }

  async function loadAgents() {
    setRefreshing(true)
    const { data, error } = await supabaseBrowser
      .from('v_agent_health')
      .select('*')
      .order('health_status', { ascending: true })
      .order('agent_name')
    if (error) console.error('agent-health load error', error)
    setAgents((data as AgentHealth[]) || [])
    setRefreshing(false)
  }

  async function wakeOne(agent_name: string) {
    setWaking(agent_name)
    const { error } = await supabaseBrowser.rpc('wake_agent', { p_agent_name: agent_name })
    setWaking(null)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      setFlash({ ok: true, text: `تم إيقاظ ${agent_name} — هيشتغل خلال دقيقتين` })
      setTimeout(loadAgents, 2000)
    }
    setTimeout(() => setFlash(null), 4500)
  }

  async function wakeAllStale() {
    if (!confirm('هتـ wake كل الـ stale agents (٣+ أيام). متأكد؟')) return
    setWakingAll(true)
    const { data, error } = await supabaseBrowser.rpc('wake_all_stale_agents')
    setWakingAll(false)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      // @ts-expect-error jsonb RPC return shape not represented in generated types
      const count = Array.isArray(data) ? data.length : (data?.woken_count || data?.woke || 0)
      setFlash({ ok: true, text: `تم إيقاظ ${count} agent` })
      setTimeout(loadAgents, 2000)
    }
    setTimeout(() => setFlash(null), 4500)
  }

  async function toggleAgent(agent_name: string, currentlyEnabled: boolean) {
    setToggling(agent_name)
    // Optimistic update
    setAgents(prev => prev.map(a => a.agent_name === agent_name ? { ...a, enabled: !currentlyEnabled } : a))
    const { data, error } = await supabaseBrowser.rpc('set_agent_enabled', {
      p_agent_name: agent_name,
      p_enabled: !currentlyEnabled,
    })
    setToggling(null)
    // @ts-expect-error jsonb RPC return shape not represented in generated types
    if (error || !data?.success) {
      // revert on failure
      setAgents(prev => prev.map(a => a.agent_name === agent_name ? { ...a, enabled: currentlyEnabled } : a))
      // @ts-expect-error jsonb RPC return shape not represented in generated types
      setFlash({ ok: false, text: `فشل تغيير حالة ${agent_name}: ${error?.message || data?.error || 'خطأ غير معروف'}` })
    } else {
      setFlash({ ok: true, text: `${agent_name} دلوقتي ${!currentlyEnabled ? 'شغّال' : 'متوقف'}` })
      setTimeout(loadAgents, 800)
    }
    setTimeout(() => setFlash(null), 4000)
  }

  const summary = useMemo(() => {
    const counts: Record<string, number> = {}
    agents.forEach(a => { counts[a.health_status] = (counts[a.health_status] || 0) + 1 })
    return counts
  }, [agents])

  const teams = useMemo(() => Array.from(new Set(agents.map(a => a.team))).sort(), [agents])

  const filtered = useMemo(() => agents.filter(a => {
    if (filter === 'critical' && a.health_status !== 'critical' && a.health_status !== 'never_ran') return false
    if (filter === 'warning' && a.health_status !== 'warning') return false
    if (filter === 'healthy' && a.health_status !== 'healthy') return false
    if (filter === 'disabled' && a.health_status !== 'disabled') return false
    if (teamFilter !== 'all' && a.team !== teamFilter) return false
    if (query && !a.agent_name.toLowerCase().includes(query.toLowerCase()) && !(a.display_name?.toLowerCase().includes(query.toLowerCase())) && !(a.description?.toLowerCase().includes(query.toLowerCase()))) return false
    return true
  }), [agents, filter, teamFilter, query])

  const groupedByTeam = useMemo(() => {
    const groups: Record<string, AgentHealth[]> = {}
    agents.forEach(a => {
      if (!groups[a.team]) groups[a.team] = []
      groups[a.team].push(a)
    })
    Object.values(groups).forEach(list => list.sort((a, b) => a.agent_name.localeCompare(b.agent_name)))
    return groups
  }, [agents])

  if (stage === 'loading') return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 text-[#059669] animate-spin" /></div>
  if (stage === 'unauthenticated') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <Lock className="w-8 h-8 text-[#059669] mx-auto mb-3" />
        <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/agent-health" className="block bg-[#34D399] text-[#04352A] py-3 rounded-xl font-semibold">دخول</Link>
      </div>
    </div>
  )
  if (stage === 'forbidden') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <ShieldAlert className="w-8 h-8 text-red-500 mx-auto mb-3" />
        <h1 className="font-bold">الصفحة دي للأدمن فقط</h1>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-20" dir="rtl">
      <header className="sticky top-0 z-40 bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/admin/dashboard" className="w-9 h-9 bg-white shadow rounded-full flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <Zap className="w-5 h-5 text-[#059669]" />
          <h1 className="text-lg font-black text-gray-900 flex-1">تحكم الـ Agents</h1>
          <button onClick={loadAgents} disabled={refreshing} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="تحديث">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          {tab === 'status' && (
            <button onClick={wakeAllStale} disabled={wakingAll} className="bg-[#34D399] text-[#04352A] px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-[#34D399]/90 disabled:opacity-50">
              {wakingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
              <span>إيقاظ الكل</span>
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="max-w-6xl mx-auto px-4 flex gap-1 border-t border-gray-50">
          <button
            onClick={() => setTab('status')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === 'status' ? 'border-[#059669] text-[#059669]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <LayoutList className="w-4 h-4" /> الحالة
          </button>
          <button
            onClick={() => setTab('settings')}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-bold border-b-2 transition-colors ${tab === 'settings' ? 'border-[#059669] text-[#059669]' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            <ListChecks className="w-4 h-4" /> الإعدادات
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4 space-y-3">
        {flash && (
          <div className={`p-3 rounded-xl border flex items-start gap-2 text-sm ${
            flash.ok ? 'bg-green-50 border-green-200 text-green-900' : 'bg-red-50 border-red-200 text-red-900'
          }`}>
            {flash.ok ? <CheckCircle className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
            <span>{flash.text}</span>
          </div>
        )}

        {tab === 'status' && (
          <>
            {/* Summary tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {(['all','healthy','warning','critical','disabled'] as const).map(k => {
                const cnt = k === 'all' ? agents.length
                  : k === 'critical' ? (summary.critical || 0) + (summary.never_ran || 0)
                  : (summary[k] || 0)
                const isActive = filter === k
                const cfg = k === 'all' ? { label: 'الكل', color: 'text-gray-700', bg: 'bg-white' } : STATUS_CONFIG[k]
                return (
                  <button key={k} onClick={() => setFilter(k)}
                    className={`p-3 rounded-xl border text-right transition-all ${isActive ? 'border-[#059669] bg-[#34D399]/5 ring-2 ring-[#059669]/20' : 'border-gray-200 bg-white'}`}>
                    <div className={`text-2xl font-black ${cfg.color}`}>{cnt}</div>
                    <div className="text-xs text-gray-600 mt-0.5">{cfg.label}</div>
                  </button>
                )
              })}
            </div>

            {/* Search + team filter */}
            <div className="flex items-center gap-2 bg-white rounded-xl border border-gray-100 p-2">
              <Search className="w-4 h-4 text-gray-400 mx-2" />
              <input
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="ابحث عن agent أو دوره..."
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
              <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#059669]/40">
                <option value="all">كل الفرق</option>
                {teams.map(t => <option key={t} value={t}>{teamLabel(t)}</option>)}
              </select>
            </div>

            {/* Agent list */}
            <div className="space-y-2">
              {filtered.length === 0 && (
                <div className="text-center py-12 bg-white rounded-2xl border border-gray-100 text-sm text-gray-500">
                  مفيش agents مطابقة للفلاتر
                </div>
              )}
              {filtered.map(a => {
                const cfg = STATUS_CONFIG[a.health_status] || STATUS_CONFIG.healthy
                const tcfg = TRIGGER_CONFIG[a.trigger_type] || TRIGGER_CONFIG.undecided
                const Icon = cfg.icon
                const TIcon = tcfg.icon
                const isWaking = waking === a.agent_name
                return (
                  <div key={a.agent_name} className={`bg-white rounded-2xl border p-4 ${cfg.bg.replace('bg-', 'border-r-4 border-r-').split(' ')[0]}`}>
                    <div className="flex items-start gap-3">
                      <div className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${cfg.bg.split(' ')[0]}`}>
                        <Icon className={`w-5 h-5 ${cfg.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-gray-900 text-sm font-mono">{a.agent_name}</h3>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{teamLabel(a.team)}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border font-bold`}>{cfg.label}</span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full ${tcfg.bg} ${tcfg.color} border font-bold flex items-center gap-1`}>
                            <TIcon className="w-2.5 h-2.5" />{tcfg.label}
                          </span>
                          {!a.enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">معطّل</span>}
                        </div>
                        {a.description && <p className="text-xs text-gray-700 mb-1 leading-relaxed">{a.description}</p>}
                        {a.event_source && a.event_source !== '—' && (
                          <p className="text-[11px] text-gray-500 mb-1">
                            {a.trigger_type === 'schedule' ? '⏱ ' : a.trigger_type === 'event' ? '⚡ ' : ''}
                            {a.event_source}
                          </p>
                        )}
                        {a.suggested_action && (
                          <p className="text-xs text-gray-700 bg-gray-50 px-2 py-1.5 rounded-lg mt-2">{a.suggested_action}</p>
                        )}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-2 text-[11px]">
                          <div>
                            <span className="text-gray-500">آخر تشغيل:</span>{' '}
                            <span className="font-bold">{timeAgo(a.last_run_at)}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">تشغيلات:</span>{' '}
                            <span className="font-bold">{a.run_count}</span>
                          </div>
                          <div>
                            <span className="text-gray-500">نجاح:</span>{' '}
                            <span className="font-bold">{Number(a.success_pct ?? 0).toFixed(0)}%</span>
                          </div>
                          <div>
                            <span className="text-gray-500">cron:</span>{' '}
                            <span className="font-mono text-[10px]">{a.schedule_cron || '—'}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        <button
                          onClick={() => wakeOne(a.agent_name)}
                          disabled={isWaking || !a.enabled}
                          className="bg-[#34D399] text-[#04352A] px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 hover:bg-[#34D399]/90"
                          title="إيقاظ"
                        >
                          {isWaking ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          <span>إيقاظ</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}

        {tab === 'settings' && (
          <>
            <div className="bg-white rounded-2xl border border-gray-100 p-4 text-xs text-gray-600 leading-relaxed">
              شغّل أو وقف أي agent من هنا. الإيقاف بيمنعه من الاشتغال — سواء كان بيتشغّل بجدول زمني، بحدث، أو يدوي. التغيير فوري.
            </div>
            {Object.keys(groupedByTeam).sort().map(team => (
              <div key={team} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                  <h3 className="font-bold text-sm text-gray-800">{teamLabel(team)}</h3>
                  <span className="text-[11px] text-gray-500">
                    {groupedByTeam[team].filter(a => a.enabled).length}/{groupedByTeam[team].length} شغّالين
                  </span>
                </div>
                <div className="divide-y divide-gray-50">
                  {groupedByTeam[team].map(a => {
                    const tcfg = TRIGGER_CONFIG[a.trigger_type] || TRIGGER_CONFIG.undecided
                    const TIcon = tcfg.icon
                    const isToggling = toggling === a.agent_name
                    return (
                      <div key={a.agent_name} className="px-4 py-3 flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-sm font-bold text-gray-900">{a.agent_name}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${tcfg.bg} ${tcfg.color} border font-bold flex items-center gap-1`}>
                              <TIcon className="w-2.5 h-2.5" />{tcfg.label}
                            </span>
                          </div>
                          {a.description && <p className="text-xs text-gray-600 mt-0.5">{a.description}</p>}
                          {a.event_source && a.event_source !== '—' && (
                            <p className="text-[11px] text-gray-400 mt-0.5">{a.event_source}</p>
                          )}
                        </div>
                        <button
                          onClick={() => toggleAgent(a.agent_name, a.enabled)}
                          disabled={isToggling}
                          className={`relative flex-shrink-0 w-12 h-7 rounded-full transition-colors disabled:opacity-50 ${a.enabled ? 'bg-[#34D399]' : 'bg-gray-300'}`}
                          title={a.enabled ? 'شغّال — دوس عشان توقفه' : 'متوقف — دوس عشان تشغّله'}
                        >
                          {isToggling ? (
                            <Loader2 className="w-3.5 h-3.5 text-white animate-spin absolute top-1/2 -translate-y-1/2 right-1/2 translate-x-1/2" />
                          ) : (
                            <span className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow transition-transform ${a.enabled ? 'right-1' : 'right-6'}`} />
                          )}
                        </button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  )
}
