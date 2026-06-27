'use client'

// =====================================================================
// سجل معاملات المحفظة الكامل (مقسّم صفحات)
// =====================================================================
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowRight, Loader2, ArrowUpRight, ArrowDownLeft, Gift, RotateCcw, Wallet,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import BottomNav from '@/components/BottomNav'
import { formatMoney, TXN_LABELS, type WalletTransaction } from '@/lib/wallet'

const SIZE = 20

export default function WalletHistoryPage() {
  const router = useRouter()
  const [token, setToken] = useState('')
  const [txns, setTxns] = useState<WalletTransaction[]>([])
  const [page, setPage] = useState(0)
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  const fetchPage = useCallback(async (accessToken: string, p: number) => {
    setLoading(true)
    const res = await fetch(`/api/wallet/transactions?page=${p}&size=${SIZE}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    })
    const json = await res.json().catch(() => ({}))
    setTxns(prev => (p === 0 ? json.transactions || [] : [...prev, ...(json.transactions || [])]))
    setTotal(json.total || 0)
    setLoading(false)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { router.replace('/login'); return }
      setToken(session.access_token)
      await fetchPage(session.access_token, 0)
    })()
  }, [fetchPage, router])

  const loadMore = async () => { const next = page + 1; setPage(next); await fetchPage(token, next) }
  const hasMore = txns.length < total

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF7F2] pb-28">
      <div className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur border-b border-black/5">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/account/wallet')} className="p-2 -mr-2 text-gray-600"><ArrowRight className="w-5 h-5" /></button>
          <h1 className="font-bold text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-[#1F6F5F]" /> سجل المعاملات</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4">
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          {loading && txns.length === 0 ? (
            <div className="py-16 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-[#1F6F5F]" /></div>
          ) : txns.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-16">لا توجد معاملات</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {txns.map(t => {
                const isIn = t.direction === 'in'
                const Icon = t.type === 'credit_grant' ? Gift
                  : t.type === 'withdrawal_refund' || t.type === 'refund' ? RotateCcw
                  : isIn ? ArrowDownLeft : ArrowUpRight
                return (
                  <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                    <span className={`w-9 h-9 rounded-full grid place-items-center ${isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                      <Icon className="w-4 h-4" />
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{t.description || TXN_LABELS[t.type]}</p>
                      <p className="text-[11px] text-gray-400">
                        {new Date(t.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
                        {t.kind === 'credit' ? ' · كريدت' : ''}
                        {t.status === 'pending' ? ' · قيد التنفيذ' : t.status === 'reversed' ? ' · ملغاة' : ''}
                      </p>
                    </div>
                    <span className={`text-sm font-bold ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}>
                      {isIn ? '+' : '−'}{formatMoney(t.amount, t.currency)}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {hasMore && (
          <button onClick={loadMore} disabled={loading}
            className="w-full mt-4 bg-white border border-gray-200 rounded-2xl py-3 font-bold text-[#1F6F5F] flex items-center justify-center gap-2 disabled:opacity-60">
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null} تحميل المزيد
          </button>
        )}
      </div>

      <BottomNav />
    </div>
  )
}
