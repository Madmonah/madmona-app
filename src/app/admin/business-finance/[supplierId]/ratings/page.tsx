'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Star, ChevronLeft, Loader2, MessageCircle, TrendingUp,
  AlertTriangle, Award, Users, Filter,
} from 'lucide-react'

/* ============================================================
   /admin/business-finance/[supplierId]/ratings
   
   View all customer ratings. Visible to Madmona admin + Ahmed.
   ============================================================ */

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Rating = {
  id: string
  rating: number
  comment: string | null
  customer_name_snapshot: string | null
  service_name_snapshot: string | null
  employee_name_snapshot: string | null
  branch_id: string | null
  service_id: string | null
  employee_id: string | null
  created_at: string
}

type Branch = { id: string; name: string; code: string | null }

export default function RatingsPage({
  params,
}: {
  params: { supplierId: string }
}) {
  const { supplierId } = params
  const [supplierName, setSupplierName] = useState('')
  const [ratings, setRatings] = useState<Rating[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [loading, setLoading] = useState(true)
  const [branchFilter, setBranchFilter] = useState<string>('all')
  const [ratingFilter, setRatingFilter] = useState<string>('all')

  async function load() {
    setLoading(true)
    const { data: sup } = await supabase.from('suppliers')
      .select('business_name').eq('id', supplierId).single()
    setSupplierName((sup as any)?.business_name || '')

    const { data: br } = await supabase.from('supplier_branches')
      .select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches((br || []) as Branch[])

    const { data: r } = await supabase.from('service_ratings')
      .select('id, rating, comment, customer_name_snapshot, service_name_snapshot, employee_name_snapshot, branch_id, service_id, employee_id, created_at')
      .eq('supplier_id', supplierId)
      .order('created_at', { ascending: false })
      .limit(200)
    setRatings((r || []) as Rating[])
    setLoading(false)
  }

  useEffect(() => {
    load()
    const id = setInterval(load, 60000)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supplierId])

  const filtered = useMemo(() => {
    let r = ratings
    if (branchFilter !== 'all') r = r.filter((x) => x.branch_id === branchFilter)
    if (ratingFilter !== 'all') {
      if (ratingFilter === 'low') r = r.filter((x) => x.rating <= 2)
      else if (ratingFilter === 'high') r = r.filter((x) => x.rating >= 4)
      else r = r.filter((x) => x.rating === Number(ratingFilter))
    }
    return r
  }, [ratings, branchFilter, ratingFilter])

  const stats = useMemo(() => {
    const total = ratings.length
    if (total === 0) return { total: 0, avg: 0, fiveStars: 0, lowRated: 0 }
    const sum = ratings.reduce((s, r) => s + r.rating, 0)
    return {
      total,
      avg: Math.round((sum / total) * 10) / 10,
      fiveStars: ratings.filter((r) => r.rating === 5).length,
      lowRated: ratings.filter((r) => r.rating <= 2).length,
    }
  }, [ratings])

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link
            href={`/admin/business-finance/${supplierId}`}
            className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2 transition-colors"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            رجوع للـ finance
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">
            CUSTOMER RATINGS
          </p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">
            تقييمات العملاء — {supplierName}
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            {stats.total} تقييم · متوسط {stats.avg} ⭐
          </p>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-4 flex-wrap">
            <select
              value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}
              className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-3 py-1.5 text-[#1A2E26]"
            >
              <option value="all">كل الفروع</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            <div className="flex items-center gap-1 bg-white rounded-xl p-1 border border-gray-200">
              {[
                { v: 'all', l: 'الكل' },
                { v: 'high', l: '⭐⭐⭐⭐+' },
                { v: '3', l: '⭐⭐⭐' },
                { v: 'low', l: '⭐⭐ أو أقل' },
              ].map((f) => (
                <button
                  key={f.v}
                  onClick={() => setRatingFilter(f.v)}
                  className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                    ratingFilter === f.v ? 'bg-[#FA8125] text-white' : 'text-[#6B7280]'
                  }`}
                >
                  {f.l}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="إجمالي التقييمات" value={stats.total} icon={<MessageCircle className="w-4 h-4" />} />
          <StatCard label="المتوسط" value={`${stats.avg}/5`} icon={<Star className="w-4 h-4" />} primary />
          <StatCard label="٥ نجوم" value={stats.fiveStars} icon={<Award className="w-4 h-4" />} tone="positive" />
          <StatCard label="منخفض (٢⭐ أو أقل)" value={stats.lowRated} icon={<AlertTriangle className="w-4 h-4" />} tone={stats.lowRated > 0 ? 'negative' : 'neutral'} />
        </section>

        {/* Ratings list */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-3xl border border-dashed border-gray-300 p-12 text-center">
            <Star className="w-12 h-12 text-[#6B7280] opacity-30 mx-auto mb-3" />
            <h3 className="text-lg font-black text-[#1A2E26] mb-1">
              {ratings.length === 0 ? 'لسه ما فيش تقييمات' : 'مفيش نتائج للفلتر ده'}
            </h3>
            <p className="text-sm text-[#6B7280]">
              لما العميل يقيّم خدمة، هـ تظهر هنا live
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((r) => (
              <RatingCard key={r.id} r={r} branches={branches} />
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

function StatCard({ label, value, icon, tone, primary }: any) {
  const t = tone === 'positive' ? 'text-[#FA8125]' : tone === 'negative' ? 'text-red-600' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}>
      <div className={`flex items-center gap-2 mb-1.5 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>
        {icon}
        <p className="text-[10px] font-bold tracking-wider uppercase">{label}</p>
      </div>
      <p className={`text-2xl md:text-3xl font-black ${primary ? 'text-white' : t}`}>{value}</p>
    </div>
  )
}

function RatingCard({ r, branches }: { r: Rating; branches: Branch[] }) {
  const branchName = branches.find((b) => b.id === r.branch_id)?.name || ''
  const time = new Date(r.created_at).toLocaleString('ar-EG', {
    day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })
  const isLow = r.rating <= 2

  return (
    <div className={`bg-white rounded-2xl border p-5 ${isLow ? 'border-red-200' : 'border-gray-100'}`}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className={`inline-grid place-items-center w-10 h-10 rounded-xl flex-shrink-0 ${
            isLow ? 'bg-red-50 text-red-600' : 'bg-[#FA8125]/10 text-[#FA8125]'
          }`}>
            <Star className="w-5 h-5 fill-current" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star key={n} className={`w-4 h-4 ${
                  n <= r.rating ? 'text-amber-400 fill-amber-400' : 'text-gray-200'
                }`} />
              ))}
              <span className="text-sm font-black text-[#1A2E26] mr-1">{r.rating}/5</span>
            </div>
            <p className="text-xs text-[#6B7280] mt-1 truncate">
              {r.customer_name_snapshot || 'عميل'} · {r.service_name_snapshot || '—'}
              {r.employee_name_snapshot && ` · من ${r.employee_name_snapshot}`}
            </p>
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-[10px] text-[#6B7280]">{time}</p>
          {branchName && <p className="text-[10px] font-bold text-[#FA8125]">{branchName}</p>}
        </div>
      </div>

      {r.comment && (
        <div className={`rounded-xl p-3 mt-2 ${isLow ? 'bg-red-50' : 'bg-[#FAFAF7]'}`}>
          <p className="text-sm text-[#1A2E26] leading-relaxed">"{r.comment}"</p>
        </div>
      )}
    </div>
  )
}
