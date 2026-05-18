'use client'

// =====================================================================
// /admin/agent-health — Health monitor for all 49 Madmona agents
// Reads from v_agent_health view. Wake buttons call wake_agent() RPC.
// Phase Ω.11 (May 18 2026)
// =====================================================================

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  ArrowRight, Loader2, Lock, ShieldAlert, RefreshCw, Zap, ZapOff,
  CheckCircle, AlertTriangle, AlertCircle, Clock, Search, Users, Power,
} from 'lucide-react'

type Stage = 'loading' | 'unauthenticated' | 'forbidden' | 'ready'

interface AgentHealth {
  agent_name: string
  team: string
  display_name: string | null
  enabled: boolean
  schedule_cron: string | null
  run_count: number
  success_count: number
  error_count: number
  last_run_at: string | null
  success_pct: number | null
  hours_since_last_run: number | null
  health_status: string  // 'healthy' | 'warning' | 'critical' | 'disabled' | 'never_ran'
  reason_code: string | null
  suggested_action: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  healthy:  { label: 'سليم',    color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle },
  warning:  { label: 'تحذير',   color: 'text-amber-700',  bg: 'bg-amber-50 border-amber-200',  icon: AlertTriangle },
  critical: { label: 'حرج',     color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      icon: AlertCircle },
  disabled: { label: 'متوقف',   color: 'text-gray-500',   bg: 'bg-gray-50 border-gray-200',    icon: ZapOff },
  never_ran:{ label: 'ما اشتغلش', color: 'text-purple-700', bg: 'bg-purple-50 border-purple-200', icon: Clock },
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
  const [agents, setAgents] = useState<AgentHealth[]>([])
  const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'healthy' | 'disabled'>('all')
  const [teamFilter, setTeamFilter] = useState<string>('all')
  const [query, setQuery] = useState('')
  const [waking, setWaking] = useState<string | null>(null)
  const [wakingAll, setWakingAll] = useState(false)
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => { init() }, [])

  async function init() {
    const { data: { session } } = await supabaseBrowser.auth.getSession()
    if (!session?.user) { setStage('unauthenticated'); return }
    // @ts-expect-error
    const { data: prof } = await supabaseBrowser.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
    if (prof?.role !== 'admin') { setStage('forbidden'); return }
    await loadAgents()
    setStage('ready')
  }

  async function loadAgents() {
    setRefreshing(true)
    // @ts-expect-error
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
    // @ts-expect-error
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
    // @ts-expect-error
    const { data, error } = await supabaseBrowser.rpc('wake_all_stale_agents')
    setWakingAll(false)
    if (error) {
      setFlash({ ok: false, text: `فشل: ${error.message}` })
    } else {
      const count = Array.isArray(data) ? data.length : (data?.woken_count || 0)
      setFlash({ ok: true, text: `تم إيقاظ ${count} agent` })
      setTimeout(loadAgents, 2000)
    }
    setTimeout(() => setFlash(null), 4500)
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
    if (query && !a.agent_name.toLowerCase().includes(query.toLowerCase()) && !(a.display_name?.toLowerCase().includes(query.toLowerCase()))) return false
    return true
  }), [agents, filter, teamFilter, query])

  if (stage === 'loading') return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin" /></div>
  if (stage === 'unauthenticated') return (
    <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center p-4" dir="rtl">
      <div className="bg-white rounded-2xl border p-8 text-center max-w-sm">
        <Lock className="w-8 h-8 text-[#1F6F5F] mx-auto mb-3" />
        <h1 className="font-bold mb-4">سجّل دخول الأول</h1>
        <Link href="/auth/login?redirect=/admin/agent-health" className="block bg-[#1F6F5F] text-white py-3 rounded-xl font-semibold">دخول</Link>
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
          <Zap className="w-5 h-5 text-[#1F6F5F]" />
          <h1 className="text-lg font-black text-gray-900 flex-1">صحة الـ Agents</h1>
          <button onClick={loadAgents} disabled={refreshing} className="p-2 rounded-lg bg-gray-100 hover:bg-gray-200" title="تحديث">
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={wakeAllStale} disabled={wakingAll} className="bg-[#1F6F5F] text-white px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1.5 hover:bg-[#1F6F5F]/90 disabled:opacity-50">
            {wakingAll ? <Loader2 className="w-4 h-4 animate-spin" /> : <Power className="w-4 h-4" />}
            <span>إيقاظ الكل</span>
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
                className={`p-3 rounded-xl border text-right transition-all ${isActive ? 'border-[#1F6F5F] bg-[#1F6F5F]/5 ring-2 ring-[#1F6F5F]/20' : 'border-gray-200 bg-white'}`}>
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
            placeholder="ابحث عن agent..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
          />
          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
            className="text-sm bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 focus:outline-none focus:border-[#1F6F5F]/40">
            <option value="all">كل الفرق</option>
            {teams.map(t => <option key={t} value={t}>{t}</option>)}
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
            const Icon = cfg.icon
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
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 border border-gray-200">{a.team}</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color} border font-bold`}>{cfg.label}</span>
                      {!a.enabled && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">معطّل</span>}
                    </div>
                    {a.display_name && <p className="text-xs text-gray-600 mb-1">{a.display_name}</p>}
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
                      className="bg-[#1F6F5F] text-white px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1 disabled:opacity-40 hover:bg-[#1F6F5F]/90"
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
      </main>
    </div>
  )
}
