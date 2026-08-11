'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@supabase/supabase-js'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  CheckCircle2, XCircle, Sparkles, AlertTriangle,
  Eye, Image as ImageIcon, Loader2, Filter, ChevronDown,
} from 'lucide-react'

// ============================================================
// /admin/ad-review — Brand-compliant ad approval workflow
// Locked palette (system_context.brand v3): 5 colors only
// ============================================================

const LOCKED_PALETTE = ['#FA8125', '#FAFAF7', '#1A2E26', '#6B7280', '#FFFFFF']

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type AdCreative = {
  id: string
  listing_id: string | null
  category: string | null
  ad_type: string
  headline: string | null
  primary_text: string | null
  description: string | null
  cta_text: string | null
  hashtags: string[] | null
  color_palette: string[] | null
  visual_concept: string | null
  design_brief: any
  status: string
  agent_name: string | null
  created_at: string
  updated_at: string | null
}

const STATUS_TABS = [
  { key: 'drafted', label: 'مسودة' },
  { key: 'needs_revision', label: 'محتاج مراجعة' },
  { key: 'approved', label: 'معتمد' },
  { key: 'all', label: 'الكل' },
] as const

function isOnBrand(palette: string[] | null): boolean {
  if (!palette || palette.length === 0) return true
  const allowed = LOCKED_PALETTE.map((c) => c.toUpperCase())
  return palette.every((c) => allowed.includes(c.toUpperCase()))
}

function getBadColors(palette: string[] | null): string[] {
  if (!palette) return []
  const allowed = LOCKED_PALETTE.map((c) => c.toUpperCase())
  return palette.filter((c) => !allowed.includes(c.toUpperCase()))
}

export default function AdReviewPage() {
  const [ads, setAds] = useState<AdCreative[]>([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>('drafted')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set())
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [message, setMessage] = useState<string>('')

  async function load() {
    setLoading(true)
    let query = supabase.from('ad_creatives').select('*').order('updated_at', { ascending: false }).limit(200)
    if (statusFilter !== 'all') query = query.eq('status', statusFilter)
    // @ts-expect-error
    const { data, error } = await query
    if (!error) setAds((data || []) as AdCreative[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter])

  const adTypes = useMemo(() => {
    const types = new Set(ads.map((a) => a.ad_type))
    return ['all', ...Array.from(types).sort()]
  }, [ads])

  const filtered = useMemo(() => {
    if (typeFilter === 'all') return ads
    return ads.filter((a) => a.ad_type === typeFilter)
  }, [ads, typeFilter])

  const stats = useMemo(() => ({
    total: ads.length,
    onBrand: ads.filter((a) => isOnBrand(a.color_palette)).length,
    offBrand: ads.filter((a) => !isOnBrand(a.color_palette)).length,
  }), [ads])

  function setBusy(id: string, busy: boolean) {
    setBusyIds((s) => {
      const n = new Set(s)
      if (busy) n.add(id); else n.delete(id)
      return n
    })
  }

  async function approve(ad: AdCreative) {
    if (!isOnBrand(ad.color_palette)) {
      setMessage('❌ مينفعش approve لـ ad ألوانه off-brand. اطلب revision أو regenerate.')
      setTimeout(() => setMessage(''), 4000)
      return
    }
    setBusy(ad.id, true)
    // @ts-expect-error
    await supabase.from('ad_creatives').update({ status: 'approved', updated_at: new Date().toISOString() }).eq('id', ad.id)
    setBusy(ad.id, false)
    setMessage(`✅ Approved: ${ad.headline?.slice(0, 50) || ad.id.slice(0, 8)}`)
    setTimeout(() => setMessage(''), 3000)
    load()
  }

  async function requestRevision(ad: AdCreative) {
    setBusy(ad.id, true)
    // @ts-expect-error
    await supabase.from('ad_creatives').update({ status: 'needs_revision', updated_at: new Date().toISOString() }).eq('id', ad.id)
    setBusy(ad.id, false)
    setMessage(`🔄 اترسل للمراجعة`)
    setTimeout(() => setMessage(''), 3000)
    load()
  }

  async function regenerate(ad: AdCreative) {
    setBusy(ad.id, true)
    // @ts-expect-error
    await supabase.from('ad_creatives').update({ status: 'needs_revision', updated_at: new Date().toISOString() }).eq('id', ad.id)
    // @ts-expect-error
    const { error } = await supabase.rpc('regenerate_one_ad_creative')
    if (error) {
      setMessage(`❌ ${error.message}`)
    } else {
      setMessage('✨ Regen fired — هياخد ~30 ثانية')
      setTimeout(async () => {
        await rpcSafe(supabase, 'poll_ad_regen_responses')
        load()
      }, 35000)
    }
    setBusy(ad.id, false)
    setTimeout(() => setMessage(''), 5000)
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">PHASE Ω.14 · BRAND REVIEW</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">مراجعة الإعلانات</h1>
              <p className="text-sm text-[#6B7280] mt-1">برتكول الـ palette المقفل · ٥ ألوان بس</p>
            </div>
            <div className="flex items-center gap-6 text-sm">
              <div>
                <p className="text-[10px] font-bold tracking-wider text-[#6B7280] uppercase">إجمالي</p>
                <p className="text-2xl font-black text-[#1A2E26]">{stats.total}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-[#6B7280] uppercase">on-brand</p>
                <p className="text-2xl font-black text-[#FA8125]">{stats.onBrand}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold tracking-wider text-[#6B7280] uppercase">off-brand</p>
                <p className="text-2xl font-black text-red-600">{stats.offBrand}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Locked palette display */}
        <div className="max-w-7xl mx-auto px-4 pb-4">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B7280]">LOCKED PALETTE</span>
            {LOCKED_PALETTE.map((c) => (
              <div key={c} className="flex items-center gap-1.5">
                <div className="w-5 h-5 rounded-md border border-gray-200" style={{ background: c }} />
                <span className="text-[11px] font-mono text-[#6B7280]">{c}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-7xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_TABS.map((t) => (
              <button
                key={t.key}
                onClick={() => setStatusFilter(t.key)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                  statusFilter === t.key
                    ? 'bg-[#FA8125] text-white shadow-sm'
                    : 'bg-[#FAFAF7] text-[#1A2E26] hover:bg-gray-100'
                }`}
              >
                {t.label}
              </button>
            ))}

            <div className="mr-auto flex items-center gap-2">
              <Filter className="w-4 h-4 text-[#6B7280]" />
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="text-sm font-medium text-[#1A2E26] bg-white border border-gray-200 rounded-lg px-3 py-1.5"
              >
                {adTypes.map((t) => (
                  <option key={t} value={t}>{t === 'all' ? 'كل الأنواع' : t}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </header>

      {/* Toast */}
      {message && (
        <div className="max-w-7xl mx-auto px-4 pt-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-3 text-sm text-[#1A2E26]">
            {message}
          </div>
        </div>
      )}

      {/* Body */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {loading && ads.length === 0 ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <ImageIcon className="w-12 h-12 text-[#6B7280] mx-auto mb-3 opacity-40" />
            <p className="text-[#6B7280] text-sm">مفيش إعلانات في الـ filter ده</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map((ad) => {
              const onBrand = isOnBrand(ad.color_palette)
              const badColors = getBadColors(ad.color_palette)
              const isExpanded = expandedId === ad.id
              const busy = busyIds.has(ad.id)

              return (
                <article key={ad.id} className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
                  {/* Top strip */}
                  <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-1 rounded-md text-[10px] font-bold tracking-wider uppercase ${
                        ad.status === 'approved' ? 'bg-[#FA8125]/10 text-[#FA8125]' :
                        ad.status === 'drafted' ? 'bg-blue-50 text-blue-700' :
                        ad.status === 'needs_revision' ? 'bg-red-50 text-red-700' :
                        'bg-gray-50 text-gray-700'
                      }`}>
                        {ad.status}
                      </span>
                      <span className="text-[10px] font-mono text-[#6B7280]">{ad.ad_type}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {onBrand ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#FA8125]">
                          <CheckCircle2 className="w-3 h-3" />
                          on-brand
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          off-brand
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-5">
                    <h2 className="text-lg font-black text-[#1A2E26] leading-tight mb-2 tracking-tight">
                      {ad.headline || <span className="text-[#6B7280] italic font-light">(بدون عنوان)</span>}
                    </h2>
                    {ad.primary_text && (
                      <p className="text-sm text-[#6B7280] leading-relaxed mb-3 line-clamp-2">{ad.primary_text}</p>
                    )}

                    {ad.color_palette && ad.color_palette.length > 0 && (
                      <div className="mb-3">
                        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B7280] mb-1.5">PALETTE</p>
                        <div className="flex flex-wrap gap-1.5">
                          {ad.color_palette.map((c, i) => {
                            const allowed = LOCKED_PALETTE.map((x) => x.toUpperCase()).includes(c.toUpperCase())
                            return (
                              <div key={i} className="flex items-center gap-1" title={c}>
                                <div
                                  className={`w-6 h-6 rounded-md border ${
                                    allowed ? 'border-gray-200' : 'border-red-400 ring-2 ring-red-200'
                                  }`}
                                  style={{ background: c }}
                                />
                                <span className={`text-[10px] font-mono ${allowed ? 'text-[#6B7280]' : 'text-red-600 font-bold'}`}>{c}</span>
                              </div>
                            )
                          })}
                        </div>
                        {badColors.length > 0 && (
                          <p className="text-[10px] text-red-600 mt-1.5">
                            مخالف: {badColors.join(', ')} — اعمل regenerate
                          </p>
                        )}
                      </div>
                    )}

                    {(ad.cta_text || (ad.hashtags && ad.hashtags.length > 0)) && (
                      <div className="flex items-center gap-2 flex-wrap mb-3">
                        {ad.cta_text && (
                          <span className="px-2.5 py-1 rounded-md bg-[#FA8125]/10 text-[#FA8125] text-[11px] font-bold">
                            ↳ {ad.cta_text}
                          </span>
                        )}
                        {ad.hashtags?.slice(0, 5).map((h, i) => (
                          <span key={i} className="text-[11px] text-[#6B7280] font-mono">#{h.replace(/^#/, '')}</span>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => setExpandedId(isExpanded ? null : ad.id)}
                      className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#6B7280] hover:text-[#FA8125] py-2 border-t border-gray-100 mt-2 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      {isExpanded ? 'إخفاء التفاصيل' : 'عرض التفاصيل'}
                      <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </button>

                    {isExpanded && (
                      <div className="mt-4 space-y-3 pt-3 border-t border-gray-100">
                        {ad.visual_concept && (
                          <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B7280] mb-1.5">VISUAL CONCEPT</p>
                            <p className="text-xs leading-relaxed text-[#1A2E26] bg-[#FAFAF7] rounded-lg p-3">{ad.visual_concept}</p>
                          </div>
                        )}
                        {ad.design_brief && (
                          <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B7280] mb-1.5">DESIGN BRIEF</p>
                            <pre className="text-[10px] leading-relaxed text-[#1A2E26] bg-[#FAFAF7] rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">
                              {typeof ad.design_brief === 'string' ? ad.design_brief : JSON.stringify(ad.design_brief, null, 2)}
                            </pre>
                          </div>
                        )}
                        {ad.description && (
                          <div>
                            <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#6B7280] mb-1.5">DESCRIPTION</p>
                            <p className="text-xs leading-relaxed text-[#1A2E26]">{ad.description}</p>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-2 text-[10px] text-[#6B7280]">
                          <div>Agent: <span className="font-mono text-[#1A2E26]">{ad.agent_name || '—'}</span></div>
                          <div>Updated: <span className="font-mono text-[#1A2E26]">{ad.updated_at ? new Date(ad.updated_at).toLocaleDateString('ar-EG') : '—'}</span></div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action footer */}
                  <div className="grid grid-cols-3 border-t border-gray-100">
                    <button
                      onClick={() => approve(ad)}
                      disabled={busy || ad.status === 'approved' || !onBrand}
                      className="flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-[#FA8125] hover:bg-[#FA8125]/5 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      اعتماد
                    </button>
                    <button
                      onClick={() => requestRevision(ad)}
                      disabled={busy || ad.status === 'needs_revision'}
                      className="flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-red-600 hover:bg-red-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors border-r border-l border-gray-100"
                    >
                      <XCircle className="w-4 h-4" />
                      مراجعة
                    </button>
                    <button
                      onClick={() => regenerate(ad)}
                      disabled={busy}
                      className="flex items-center justify-center gap-1.5 py-3 text-xs font-bold text-[#1A2E26] hover:bg-gray-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                      تجديد AI
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </main>
    </div>
  )
}
