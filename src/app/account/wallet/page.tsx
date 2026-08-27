'use client'

// =====================================================================
// صفحة المحفظة الإلكترونية — العميل/المورد
// الرصيد (كاش + كريدت) · شحن · تحويل · سحب · سجل المعاملات
// =====================================================================
import { useEffect, useState, useCallback } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast, { Toaster } from 'react-hot-toast'
import {
  Wallet, ArrowRight, Plus, Send, ArrowDownToLine, Loader2,
  ArrowUpRight, ArrowDownLeft, Gift, RotateCcw, X, ShieldCheck,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import BottomNav from '@/components/BottomNav'
import {
  formatMoney, TXN_LABELS, WITHDRAW_METHODS,
  type Wallet as TWallet, type WalletTransaction, type WalletWithdrawal,
} from '@/lib/wallet'

type Stage = 'loading' | 'unauthenticated' | 'ready'
type Modal = null | 'topup' | 'transfer' | 'withdraw'

export default function WalletPage() {
  const { t } = useT()
  const router = useRouter()
  const [stage, setStage] = useState<Stage>('loading')
  const [token, setToken] = useState<string>('')
  const [wallet, setWallet] = useState<TWallet | null>(null)
  const [txns, setTxns] = useState<WalletTransaction[]>([])
  const [withdrawals, setWithdrawals] = useState<WalletWithdrawal[]>([])
  const [modal, setModal] = useState<Modal>(null)

  const load = useCallback(async (accessToken: string) => {
    const res = await fetch('/api/wallet', { headers: { Authorization: `Bearer ${accessToken}` } })
    if (!res.ok) { toast.error(t('wl.err_load')); return }
    const json = await res.json()
    setWallet(json.wallet)
    setTxns(json.transactions || [])
    setWithdrawals(json.withdrawals || [])
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setStage('unauthenticated'); return }
      setToken(session.access_token)
      await load(session.access_token)
      setStage('ready')
    })()
  }, [load])

  const refresh = () => token && load(token)

  if (stage === 'loading') {
    return <div className="min-h-screen grid place-items-center bg-[#FAF7F2]"><Loader2 className="w-7 h-7 animate-spin text-[#059669]" /></div>
  }

  if (stage === 'unauthenticated') {
    return (
      <div dir="rtl" className="min-h-screen grid place-items-center bg-[#FAF7F2] px-6">
        <div className="text-center max-w-sm">
          <Wallet className="w-12 h-12 mx-auto text-[#059669] mb-3" />
          <h1 className="text-xl font-bold mb-2">{t('wl.title')}</h1>
          <p className="text-gray-500 mb-5">{t('wl.login_note')}</p>
          <Link href="/login" className="inline-block bg-[#34D399] text-[#04352A] px-6 py-3 rounded-2xl font-bold no-underline">{t('wl.login')}</Link>
        </div>
      </div>
    )
  }

  const cash = Number(wallet?.balance_cash || 0)
  const credit = Number(wallet?.balance_credit || 0)
  const pendingWithdrawals = withdrawals.filter(w => ['pending', 'approved'].includes(w.status))

  return (
    <div dir="rtl" className="min-h-screen bg-[#FAF7F2] pb-28">
      <Toaster position="top-center" />

      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#FAF7F2]/90 backdrop-blur border-b border-black/5">
        <div className="max-w-md mx-auto flex items-center gap-3 px-4 py-3">
          <button onClick={() => router.push('/account')} className="p-2 -mr-2 text-gray-600"><ArrowRight className="w-5 h-5" /></button>
          <h1 className="font-bold text-lg flex items-center gap-2"><Wallet className="w-5 h-5 text-[#059669]" /> {t('wl.my_wallet')}</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 pt-4 space-y-4">
        {/* Balance card */}
        <div className="rounded-3xl p-5 text-white shadow-lg bg-gradient-to-br from-[#34D399] to-[#2FA084]">
          <p className="text-white/80 text-sm mb-1">{t('wl.available')}</p>
          <p className="text-4xl font-black tracking-tight">{formatMoney(cash + credit, wallet?.currency)}</p>
          <div className="flex gap-4 mt-4 text-sm">
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2">
              <p className="text-white/70 text-xs">{t('wl.cash')}</p>
              <p className="font-bold">{formatMoney(cash, wallet?.currency)}</p>
            </div>
            <div className="flex-1 bg-white/10 rounded-2xl px-3 py-2">
              <p className="text-white/70 text-xs">{t('wl.credit')}</p>
              <p className="font-bold">{formatMoney(credit, wallet?.currency)}</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-3">
          <ActionBtn icon={<Plus className="w-5 h-5" />} label={t('wl.topup')} onClick={() => setModal('topup')} />
          <ActionBtn icon={<Send className="w-5 h-5" />} label={t('wl.transfer')} onClick={() => setModal('transfer')} />
          <ActionBtn icon={<ArrowDownToLine className="w-5 h-5" />} label={t('wl.withdraw')} onClick={() => setModal('withdraw')} />
        </div>

        {/* Pending withdrawals */}
        {pendingWithdrawals.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
            <p className="text-sm font-bold text-amber-800 mb-2 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> {t('wl.pending_wd')}</p>
            {pendingWithdrawals.map(w => (
              <div key={w.id} className="flex justify-between text-sm text-amber-900 py-1">
                <span>{formatMoney(w.amount, w.currency)} · {WITHDRAW_METHODS[w.method] || w.method}</span>
                <span className="text-amber-600">{w.status === 'approved' ? t('wl.approved') : t('wl.pending_review')}</span>
              </div>
            ))}
          </div>
        )}

        {/* Transactions */}
        <div className="bg-white rounded-3xl shadow-soft overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
            <p className="font-bold text-sm">{t('wl.recent')}</p>
            <Link href="/account/wallet/history" className="text-xs text-[#059669] no-underline">{t('wl.view_all')}</Link>
          </div>
          {txns.length === 0 ? (
            <p className="text-center text-gray-400 text-sm py-10">{t('wl.no_tx')}</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {txns.map(t => <TxnRow key={t.id} t={t} currency={wallet?.currency} />)}
            </div>
          )}
        </div>
      </div>

      {modal === 'topup' && <TopUpModal token={token} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh() }} />}
      {modal === 'transfer' && <TransferModal token={token} max={cash} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh() }} />}
      {modal === 'withdraw' && <WithdrawModal token={token} max={cash} onClose={() => setModal(null)} onDone={() => { setModal(null); refresh() }} />}

      <BottomNav />
    </div>
  )
}

// ---------- pieces ----------
function ActionBtn({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="bg-white rounded-2xl shadow-soft py-3 flex flex-col items-center gap-1.5 active:scale-95 transition">
      <span className="w-10 h-10 rounded-full bg-[#34D399]/10 text-[#059669] grid place-items-center">{icon}</span>
      <span className="text-xs font-bold text-gray-700">{label}</span>
    </button>
  )
}

function TxnRow({ t, currency }: { t: WalletTransaction; currency?: string }) {
  const { t: tr } = useT()
  const isIn = t.direction === 'in'
  const Icon = t.type === 'credit_grant' ? Gift
    : t.type === 'withdrawal_refund' || t.type === 'refund' ? RotateCcw
    : isIn ? ArrowDownLeft : ArrowUpRight
  return (
    <div className="flex items-center gap-3 px-5 py-3">
      <span className={`w-9 h-9 rounded-full grid place-items-center ${isIn ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
        <Icon className="w-4 h-4" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-gray-800 truncate">{t.description || TXN_LABELS[t.type]}</p>
        <p className="text-[11px] text-gray-400">
          {new Date(t.created_at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' })}
          {t.kind === 'credit' ? tr('wl.tx_credit') : ''}
          {t.status === 'pending' ? tr('wl.tx_pending') : t.status === 'reversed' ? tr('wl.tx_reversed') : ''}
        </p>
      </div>
      <span className={`text-sm font-bold ${isIn ? 'text-emerald-600' : 'text-rose-500'}`}>
        {isIn ? '+' : '−'}{formatMoney(t.amount, currency)}
      </span>
    </div>
  )
}

// ---------- modals ----------
function Shell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div dir="rtl" className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl p-5 animate-slide-up" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-lg">{title}</h2>
          <button onClick={onClose} className="p-1 text-gray-400"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

async function postJSON(url: string, token: string, body: unknown) {
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  return { ok: res.ok, status: res.status, json }
}

const ERR_AR: Record<string, string> = {
  insufficient_funds: 'wl.e_funds',
  invalid_amount: 'wl.e_amount',
  invalid_phone: 'wl.e_phone',
  recipient_not_found: 'wl.e_recipient',
  cannot_transfer_to_self: 'wl.e_self',
  invalid_method: 'wl.e_method',
  missing_payout_details: 'wl.e_details',
  amount_below_minimum: 'wl.e_min',
  topup_gateway_required: 'wl.e_gateway',
}
// 🌍 (٢٧ أغسطس ٢٠٢٦) الخريطة بقت مفاتيح ترجمة بدل نص عربي ثابت
const errKey = (code?: string) => (code && ERR_AR[code]) || 'wl.e_generic'

function TopUpModal({ token, onClose, onDone }: { token: string; onClose: () => void; onDone: () => void }) {
  const { t } = useT()
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const quick = [50, 100, 200, 500]
  const submit = async () => {
    const a = Number(amount)
    if (!a || a <= 0) { toast.error(t('wl.e_valid_amount')); return }
    setBusy(true)
    const { ok, json } = await postJSON('/api/wallet/topup', token, { amount: a, kind: 'cash' })
    setBusy(false)
    if (ok) { toast.success(t('wl.topped_up')); onDone() } else toast.error(t(errKey(json.error)))
  }
  return (
    <Shell title={t('wl.topup_title')} onClose={onClose}>
      <div className="flex gap-2 mb-3">
        {quick.map(q => (
          <button key={q} onClick={() => setAmount(String(q))} className="flex-1 py-2 rounded-xl border border-gray-200 text-sm font-bold hover:border-[#059669]">{q}</button>
        ))}
      </div>
      <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal"
        placeholder={t('wl.amount_egp')} className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold mb-2 outline-none focus:border-[#059669]" />
      <p className="text-[11px] text-gray-400 mb-4">{t('wl.topup_note')}</p>
      <button disabled={busy} onClick={submit} className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />} {t('wl.topup_now')}
      </button>
    </Shell>
  )
}

function TransferModal({ token, max, onClose, onDone }: { token: string; max: number; onClose: () => void; onDone: () => void }) {
  const { t } = useT()
  const [phone, setPhone] = useState('')
  const [amount, setAmount] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const a = Number(amount)
    if (!a || a <= 0) { toast.error(t('wl.e_valid_amount')); return }
    if (a > max) { toast.error(t('wl.e_cash_funds')); return }
    setBusy(true)
    const { ok, json } = await postJSON('/api/wallet/transfer', token, { phone, amount: a, kind: 'cash' })
    setBusy(false)
    if (ok) { toast.success(t('wl.transferred', { name: json.recipient_name })); onDone() } else toast.error(t(errKey(json.error)))
  }
  return (
    <Shell title={t('wl.transfer_title')} onClose={onClose}>
      <label className="block text-xs font-bold text-gray-500 mb-1">{t('wl.recipient_phone')}</label>
      <input value={phone} onChange={e => setPhone(e.target.value)} inputMode="tel" placeholder="01xxxxxxxxx"
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 mb-3 outline-none focus:border-[#059669]" />
      <label className="block text-xs font-bold text-gray-500 mb-1">{t('wl.amount_avail', { n: formatMoney(max) })}</label>
      <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder={t('wl.amount')}
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold mb-4 outline-none focus:border-[#059669]" />
      <button disabled={busy} onClick={submit} className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />} {t('wl.transfer_now')}
      </button>
    </Shell>
  )
}

function WithdrawModal({ token, max, onClose, onDone }: { token: string; max: number; onClose: () => void; onDone: () => void }) {
  const { t } = useT()
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState('instapay')
  const [details, setDetails] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async () => {
    const a = Number(amount)
    if (!a || a <= 0) { toast.error(t('wl.e_valid_amount')); return }
    if (a > max) { toast.error(t('wl.e_cash_funds')); return }
    setBusy(true)
    const { ok, json } = await postJSON('/api/wallet/withdraw', token, { amount: a, method, details })
    setBusy(false)
    if (ok) { toast.success(t('wl.wd_sent')); onDone() }
    else toast.error(json.error === 'amount_below_minimum' ? t('wl.wd_min', { n: json.min }) : t(errKey(json.error)))
  }
  return (
    <Shell title={t('wl.wd_title')} onClose={onClose}>
      <label className="block text-xs font-bold text-gray-500 mb-1">{t('wl.amount_avail', { n: formatMoney(max) })}</label>
      <input value={amount} onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" placeholder={t('wl.amount')}
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 text-lg font-bold mb-3 outline-none focus:border-[#059669]" />
      <label className="block text-xs font-bold text-gray-500 mb-1">{t('wl.wd_method')}</label>
      <select value={method} onChange={e => setMethod(e.target.value)}
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 mb-3 outline-none focus:border-[#059669] bg-white">
        {Object.entries(WITHDRAW_METHODS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
      </select>
      <label className="block text-xs font-bold text-gray-500 mb-1">{t('wl.wd_details')}</label>
      <input value={details} onChange={e => setDetails(e.target.value)} placeholder={t('wl.wd_details_ph')}
        className="w-full border border-gray-200 rounded-2xl px-4 py-3 mb-4 outline-none focus:border-[#059669]" />
      <button disabled={busy} onClick={submit} className="w-full bg-[#34D399] text-[#04352A] py-3 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
        {busy ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowDownToLine className="w-5 h-5" />} {t('wl.wd_request')}
      </button>
    </Shell>
  )
}
