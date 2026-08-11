'use client'

// =====================================================================
// لوحة إدارة المحافظ — الأرصدة، تعديل يدوي، منح كريدت، ومراجعة طلبات السحب
// =====================================================================
import { useEffect, useState, useCallback, type FormEvent } from 'react'
import Link from 'next/link'
import toast, { Toaster } from 'react-hot-toast'
import {
  Wallet, Lock, RefreshCw, ArrowRight, Search, Plus, Minus, Gift,
  CheckCircle, XCircle, BadgeDollarSign, Loader2,
} from 'lucide-react'
import { formatMoney, WITHDRAW_METHODS } from '@/lib/wallet'

interface AdminWallet {
  id: string
  profile_id: string
  balance_cash: number
  balance_credit: number
  currency: string
  status: string
  updated_at: string
  profile?: { id: string; full_name: string | null; phone: string | null; role: string } | null
}
interface AdminWithdrawal {
  id: string
  profile_id: string
  amount: number
  currency: string
  method: string
  details: string
  status: string
  created_at: string
  admin_notes: string | null
  profile?: { full_name: string | null; phone: string | null } | null
}

const PW_KEY = 'madmona_admin_pw'

export default function AdminWalletsPage() {
  const [authed, setAuthed] = useState(false)
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [loading, setLoading] = useState(false)

  const [wallets, setWallets] = useState<AdminWallet[]>([])
  const [withdrawals, setWithdrawals] = useState<AdminWithdrawal[]>([])
  const [totals, setTotals] = useState<{ cash: number; credit: number }>({ cash: 0, credit: 0 })
  const [q, setQ] = useState('')
  const [tab, setTab] = useState<'wallets' | 'withdrawals'>('wallets')
  const [acting, setActing] = useState<string | null>(null)

  const fetchData = useCallback(async (pw: string, silent = false) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/wallets?q=${encodeURIComponent(q)}`, { headers: { 'X-Admin-Password': pw } })
      if (res.status === 401 || res.status === 403) {
        if (!silent) setAuthError('كلمة السر غلط')
        sessionStorage.removeItem(PW_KEY); setAuthed(false); return
      }
      if (!res.ok) return
      const data = await res.json()
      setWallets(data.wallets || [])
      setWithdrawals(data.withdrawals || [])
      setTotals(data.totals || { cash: 0, credit: 0 })
      setAuthed(true)
      sessionStorage.setItem(PW_KEY, pw)
    } finally { setLoading(false) }
  }, [q])

  useEffect(() => {
    const saved = sessionStorage.getItem(PW_KEY)
    if (saved) { setPassword(saved); fetchData(saved, true) }
  }, [fetchData])

  const handleLogin = (e: FormEvent) => { e.preventDefault(); setAuthError(''); fetchData(password) }

  const action = async (body: Record<string, unknown>, key: string, okMsg: string) => {
    setActing(key)
    try {
      const res = await fetch('/api/admin/wallets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
        body: JSON.stringify(body),
      })
      const json = await res.json().catch(() => ({}))
      if (res.ok) { toast.success(okMsg); await fetchData(password, true) }
      else toast.error(json.error || 'فشل الإجراء')
    } finally { setActing(null) }
  }

  // ---- adjust modal ----
  const [adjustFor, setAdjustFor] = useState<AdminWallet | null>(null)

  if (!authed) {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-[#FAF7F2] px-6">
        <form onSubmit={handleLogin} className="bg-white rounded-3xl shadow-soft p-6 w-full max-w-sm text-center">
          <Wallet className="w-10 h-10 mx-auto text-[#FA8125] mb-2" />
          <h1 className="font-bold text-lg mb-4">إدارة المحافظ</h1>
          <div className="relative mb-3">
            <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة سر الأدمن"
              className="w-full border border-gray-200 rounded-2xl pr-9 pl-4 py-3 outline-none focus:border-[#FA8125]" />
          </div>
          {authError && <p className="text-rose-500 text-sm mb-3">{authError}</p>}
          <button className="w-full bg-[#FA8125] text-white py-3 rounded-2xl font-bold">دخول</button>
        </form>
      </div>
    )
  }

  const pendingCount = withdrawals.filter(w => w.status === 'pending').length

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF7F2] pb-16">
      <Toaster position="top-center" />
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
        <div className="max-w-3xl mx-auto flex items-center gap-3 px-4 py-3">
          <Link href="/admin" className="p-2 -mr-2 text-gray-600 no-underline"><ArrowRight className="w-5 h-5" /></Link>
          <h1 className="font-bold text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-[#FA8125]" /> المحافظ</h1>
          <button onClick={() => fetchData(password)} className="mr-auto p-2 text-gray-500"><RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} /></button>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 pt-4 space-y-4">
        {/* Totals */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white rounded-2xl shadow-soft p-4">
            <p className="text-xs text-gray-500">إجمالي الرصيد النقدي</p>
            <p className="text-2xl font-black text-[#FA8125]">{formatMoney(totals.cash)}</p>
          </div>
          <div className="bg-white rounded-2xl shadow-soft p-4">
            <p className="text-xs text-gray-500">إجمالي الكريدت</p>
            <p className="text-2xl font-black text-amber-600">{formatMoney(totals.credit)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2">
          <button onClick={() => setTab('wallets')} className={`flex-1 py-2 rounded-2xl font-bold text-sm ${tab === 'wallets' ? 'bg-[#FA8125] text-white' : 'bg-white text-gray-600'}`}>المحافظ ({wallets.length})</button>
          <button onClick={() => setTab('withdrawals')} className={`flex-1 py-2 rounded-2xl font-bold text-sm ${tab === 'withdrawals' ? 'bg-[#FA8125] text-white' : 'bg-white text-gray-600'}`}>
            طلبات السحب{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </button>
        </div>

        {tab === 'wallets' && (
          <>
            <div className="relative">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => e.key === 'Enter' && fetchData(password)}
                placeholder="ابحث بالاسم أو رقم الموبايل" className="w-full bg-white border border-gray-200 rounded-2xl pr-9 pl-4 py-2.5 outline-none focus:border-[#FA8125]" />
            </div>
            <div className="space-y-2">
              {wallets.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">لا توجد محافظ</p>}
              {wallets.map(w => (
                <div key={w.id} className="bg-white rounded-2xl shadow-soft p-4">
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <p className="font-bold text-gray-800 truncate">{w.profile?.full_name || 'بدون اسم'}</p>
                      <p className="text-xs text-gray-400">{w.profile?.phone} · {w.profile?.role}</p>
                    </div>
                    <button onClick={() => setAdjustFor(w)} className="text-xs bg-[#FA8125]/10 text-[#FA8125] font-bold px-3 py-1.5 rounded-xl flex items-center gap-1">
                      <BadgeDollarSign className="w-3.5 h-3.5" /> تعديل
                    </button>
                  </div>
                  <div className="flex gap-4 mt-3 text-sm">
                    <span className="font-bold text-[#FA8125]">نقدي: {formatMoney(w.balance_cash, w.currency)}</span>
                    <span className="font-bold text-amber-600">كريدت: {formatMoney(w.balance_credit, w.currency)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {tab === 'withdrawals' && (
          <div className="space-y-2">
            {withdrawals.length === 0 && <p className="text-center text-gray-400 py-8 text-sm">لا توجد طلبات سحب</p>}
            {withdrawals.map(w => (
              <div key={w.id} className="bg-white rounded-2xl shadow-soft p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{w.profile?.full_name || 'بدون اسم'}</p>
                    <p className="text-xs text-gray-400">{w.profile?.phone}</p>
                  </div>
                  <StatusPill status={w.status} />
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <p className="font-black text-lg">{formatMoney(w.amount, w.currency)}</p>
                  <p className="text-xs text-gray-500">{WITHDRAW_METHODS[w.method] || w.method} · {w.details}</p>
                  <p className="text-[11px] text-gray-400 mt-1">{new Date(w.created_at).toLocaleString('ar-EG')}</p>
                </div>
                {(w.status === 'pending' || w.status === 'approved') && (
                  <div className="flex gap-2 mt-3">
                    {w.status === 'pending' && (
                      <button disabled={acting === w.id} onClick={() => action({ action: 'process_withdrawal', withdrawal_id: w.id, decision: 'approve' }, w.id, 'تمت الموافقة')}
                        className="flex-1 bg-blue-50 text-blue-600 font-bold text-sm py-2 rounded-xl flex items-center justify-center gap-1">
                        <CheckCircle className="w-4 h-4" /> موافقة
                      </button>
                    )}
                    <button disabled={acting === w.id} onClick={() => action({ action: 'process_withdrawal', withdrawal_id: w.id, decision: 'paid' }, w.id, 'تم وضعها كمدفوعة')}
                      className="flex-1 bg-emerald-50 text-emerald-600 font-bold text-sm py-2 rounded-xl flex items-center justify-center gap-1">
                      {acting === w.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeDollarSign className="w-4 h-4" />} تم الدفع
                    </button>
                    <button disabled={acting === w.id} onClick={() => action({ action: 'process_withdrawal', withdrawal_id: w.id, decision: 'reject' }, w.id, 'تم الرفض والاسترجاع')}
                      className="flex-1 bg-rose-50 text-rose-500 font-bold text-sm py-2 rounded-xl flex items-center justify-center gap-1">
                      <XCircle className="w-4 h-4" /> رفض
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {adjustFor && (
        <AdjustModal wallet={adjustFor} busy={acting === 'adjust'}
          onClose={() => setAdjustFor(null)}
          onSubmit={async (payload) => { await action(payload, 'adjust', 'تم التعديل'); setAdjustFor(null) }} />
      )}
    </div>
  )
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    pending: ['قيد المراجعة', 'bg-amber-100 text-amber-700'],
    approved: ['تمت الموافقة', 'bg-blue-100 text-blue-700'],
    paid: ['مدفوعة', 'bg-emerald-100 text-emerald-700'],
    rejected: ['مرفوضة', 'bg-rose-100 text-rose-600'],
    cancelled: ['ملغاة', 'bg-gray-100 text-gray-500'],
  }
  const [label, cls] = map[status] || [status, 'bg-gray-100 text-gray-500']
  return <span className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${cls}`}>{label}</span>
}

function AdjustModal({ wallet, busy, onClose, onSubmit }: {
  wallet: AdminWallet; busy: boolean; onClose: () => void
  onSubmit: (p: Record<string, unknown>) => void
}) {
  const [amount, setAmount] = useState('')
  const [kind, setKind] = useState<'cash' | 'credit'>('cash')
  const [direction, setDirection] = useState<'in' | 'out'>('in')
  const [reason, setReason] = useState('')

  const submit = () => {
    const a = Number(amount)
    if (!a || a <= 0) { toast.error('اكتب مبلغ صحيح'); return }
    onSubmit({ action: 'adjust', profile_id: wallet.profile_id, amount: a, kind, direction, reason })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div dir="rtl" className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5" onClick={e => e.stopPropagation()}>
        <h2 className="font-bold text-lg mb-1">تعديل رصيد</h2>
        <p className="text-sm text-gray-500 mb-4">{wallet.profile?.full_name || wallet.profile?.phone}</p>

        <div className="flex gap-2 mb-3">
          <button onClick={() => setDirection('in')} className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${direction === 'in' ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-600'}`}><Plus className="w-4 h-4" /> إضافة</button>
          <button onClick={() => setDirection('out')} className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${direction === 'out' ? 'bg-rose-500 text-white' : 'bg-gray-100 text-gray-600'}`}><Minus className="w-4 h-4" /> خصم</button>
        </div>
        <div className="flex gap-2 mb-3">
          <button onClick={() => setKind('cash')} className={`flex-1 py-2 rounded-xl font-bold text-sm ${kind === 'cash' ? 'bg-[#FA8125] text-white' : 'bg-gray-100 text-gray-600'}`}>نقدي</button>
          <button onClick={() => setKind('credit')} className={`flex-1 py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-1 ${kind === 'credit' ? 'bg-amber-500 text-white' : 'bg-gray-100 text-gray-600'}`}><Gift className="w-4 h-4" /> كريدت</button>
        </div>
        <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder="المبلغ"
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold mb-3 outline-none focus:border-[#FA8125]" />
        <input value={reason} onChange={e => setReason(e.target.value)} placeholder="السبب (اختياري)"
          className="w-full border border-gray-200 rounded-2xl px-4 py-3 mb-4 outline-none focus:border-[#FA8125]" />
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 py-3 rounded-2xl font-bold bg-gray-100 text-gray-600">إلغاء</button>
          <button disabled={busy} onClick={submit} className="flex-1 py-3 rounded-2xl font-bold bg-[#FA8125] text-white flex items-center justify-center gap-2 disabled:opacity-60">
            {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : null} تأكيد
          </button>
        </div>
      </div>
    </div>
  )
}
