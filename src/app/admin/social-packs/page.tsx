// app/admin/social-packs/page.tsx
// Madmona Admin — Social Packs queue
// Lists all per-listing social packs with status, listing context, and quick actions.

'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

type Pack = {
  id: string
  status: 'pending' | 'generating' | 'ready' | 'error' | 'archived'
  created_at: string
  completed_at: string | null
  error_message: string | null
  retry_count: number
  reel_script: { hook?: string } | null
  post_copies: Record<string, string> | null
  hashtags: string[] | null
  square_canva_url: string | null
  carousel_canva_url: string | null
  published_to_ig_at: string | null
  published_to_fb_page_at: string | null
  listing: {
    id: string
    title: string
    slug: string | null
    city: string | null
    category: { name_ar: string; slug: string } | null
  } | null
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-700',
  generating: 'bg-blue-100 text-blue-700',
  ready: 'bg-green-100 text-green-700',
  error: 'bg-red-100 text-red-700',
  archived: 'bg-gray-50 text-gray-400',
}

const STATUS_AR: Record<string, string> = {
  pending: 'في الطابور',
  generating: 'بيتولّد',
  ready: 'جاهز',
  error: 'خطأ',
  archived: 'مؤرشف',
}

export default function SocialPacksAdmin() {
  const [packs, setPacks] = useState<Pack[]>([])
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const [toast, setToast] = useState<string | null>(null)

  const refresh = async () => {
    setLoading(true)
    try {
      const url = statusFilter
        ? `/api/admin/social-packs?status=${statusFilter}&limit=200`
        : '/api/admin/social-packs?limit=200'
      const r = await fetch(url, { cache: 'no-store' })
      const d = await r.json()
      setPacks(d.packs || [])
      setCounts(d.counts || {})
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    refresh()
    const t = setInterval(refresh, 30000) // auto-refresh every 30s
    return () => clearInterval(t)
  }, [statusFilter])

  const triggerBatch = async () => {
    setTriggering(true)
    try {
      const r = await fetch('/api/admin/social-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ limit: 5 }),
      })
      const d = await r.json()
      setToast(`اتعمل ${d.ok}/${d.processed}, فشل ${d.failed}`)
      setTimeout(() => setToast(null), 4000)
      await refresh()
    } catch (err) {
      setToast('حصل خطأ')
    } finally {
      setTriggering(false)
    }
  }

  const regeneratePack = async (id: string) => {
    if (!confirm('إعادة توليد الـ pack ده؟ هيمسح اللي اتولّد قبل كده.')) return
    try {
      const r = await fetch('/api/admin/social-packs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack_id: id }),
      })
      const d = await r.json()
      setToast(d.ok ? 'اتعاد التوليد' : `فشل: ${d.error}`)
      setTimeout(() => setToast(null), 4000)
      await refresh()
    } catch (err) {
      setToast('حصل خطأ')
    }
  }

  const total = Object.values(counts).reduce((a, b) => a + b, 0)
  const readyPct = total > 0 ? Math.round(((counts.ready ?? 0) / total) * 100) : 0

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8" dir="rtl">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">حزم السوشيال للـ Listings</h1>
            <p className="text-sm text-gray-600 mt-1">
              لكل listing منشور: تصميمات، ريلز script، 3 نسخ بوست، قائمة جروبات فيسبوك للنشر
            </p>
          </div>
          <button
            onClick={triggerBatch}
            disabled={triggering}
            className="bg-[#1F5F3F] text-white px-5 py-2.5 rounded-xl font-bold shadow-sm hover:shadow-md disabled:opacity-50 transition-all"
          >
            {triggering ? '...بيشتغل' : 'شغّل دفعة (5)'}
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {(['pending', 'generating', 'ready', 'error', 'archived'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? null : s)}
              className={`p-4 rounded-xl border-2 text-right transition-all ${
                statusFilter === s
                  ? 'border-[#1F5F3F] bg-white shadow-md'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <p className="text-xs text-gray-500 font-medium">{STATUS_AR[s]}</p>
              <p className="text-2xl font-black text-gray-900 mt-1">{counts[s] ?? 0}</p>
            </button>
          ))}
        </div>

        {/* Progress bar */}
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-700">
              التقدم: {counts.ready ?? 0} من أصل {total}
            </p>
            <p className="text-sm font-bold text-[#1F5F3F]">{readyPct}%</p>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className="bg-[#1F5F3F] h-full rounded-full transition-all"
              style={{ width: `${readyPct}%` }}
            />
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-5 py-2.5 rounded-xl shadow-lg z-50 text-sm font-medium">
            {toast}
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-gray-400">جاري التحميل...</div>
          ) : packs.length === 0 ? (
            <div className="p-12 text-center text-gray-400">
              مفيش packs {statusFilter ? `في حالة "${STATUS_AR[statusFilter]}"` : ''}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">Listing</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">التصنيف</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">الحالة</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">الـ Hook</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">النشر</th>
                    <th className="text-right px-4 py-3 font-bold text-gray-700">أكشن</th>
                  </tr>
                </thead>
                <tbody>
                  {packs.map((p) => (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/social-packs/${p.id}`}
                          className="font-bold text-gray-900 hover:text-[#1F5F3F] no-underline"
                        >
                          {p.listing?.title || '—'}
                        </Link>
                        <p className="text-xs text-gray-500 mt-0.5">{p.listing?.city || '—'}</p>
                      </td>
                      <td className="px-4 py-3 text-gray-700">
                        {p.listing?.category?.name_ar || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-xs font-bold ${
                            STATUS_COLORS[p.status]
                          }`}
                        >
                          {STATUS_AR[p.status]}
                        </span>
                        {p.error_message && (
                          <p className="text-xs text-red-600 mt-1 max-w-xs truncate" title={p.error_message}>
                            {p.error_message}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-gray-600 max-w-xs">
                        <span className="block truncate">{p.reel_script?.hook || '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {p.published_to_ig_at ? (
                          <span className="text-green-600">✓ IG</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}{' '}
                        {p.published_to_fb_page_at ? (
                          <span className="text-green-600">✓ FB</span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <Link
                            href={`/admin/social-packs/${p.id}`}
                            className="text-[#1F5F3F] hover:underline text-xs font-medium"
                          >
                            عرض
                          </Link>
                          <button
                            onClick={() => regeneratePack(p.id)}
                            className="text-gray-500 hover:text-gray-700 text-xs"
                          >
                            إعادة توليد
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
