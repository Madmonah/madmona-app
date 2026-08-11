'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  ChevronLeft, Loader2, RefreshCw, DollarSign, Plus, X, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function CashReconPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_get_cash_recon_history', {
      p_supplier_id: supplierId,
    })
    setData(list)
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · CASH RECON</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">جرد الكاش اليومي · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">جرد آخر اليوم لكل فرع: كاش/فيزا/InstaPay + الفرق</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> جرد اليوم
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        {/* Stats */}
        {data?.stats && (
          <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard label="إجمالي المتوقع" value={`${Number(data.stats.total_expected || 0).toLocaleString()} ج`} />
            <StatCard label="إجمالي الفعلي" value={`${Number(data.stats.total_actual || 0).toLocaleString()} ج`} primary />
            <StatCard label="فروقات" value={`${Number(data.stats.total_variance || 0).toLocaleString()} ج`} tone={data.stats.total_variance < 0 ? 'danger' : data.stats.total_variance > 0 ? 'positive' : 'normal'} />
            <StatCard label="أيام مسجلة" value={data.stats.days_recorded || 0} icon={<CheckCircle2 />} />
          </section>
        )}

        {/* Records */}
        <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="grid grid-cols-12 gap-3 px-4 py-3 bg-[#FAFAF7] border-b border-gray-100 text-[10px] font-bold tracking-wider uppercase text-[#6B7280]">
            <div className="col-span-2">التاريخ</div>
            <div className="col-span-2">الفرع</div>
            <div className="col-span-2 text-center">المتوقع</div>
            <div className="col-span-2 text-center">الفعلي</div>
            <div className="col-span-2 text-center">الفرق</div>
            <div className="col-span-2">الحالة</div>
          </div>
          <div className="divide-y divide-gray-100">
            {loading ? (
              <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
            ) : data?.records?.length === 0 ? (
              <div className="py-12 text-center">
                <DollarSign className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
                <p className="text-sm font-bold text-[#1A2E26]">ابدأ بأول جرد لليوم</p>
                <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold">جرد كاش الفرع</button>
              </div>
            ) : (data?.records || []).map((r: any) => {
              const variance = Number(r.variance || 0)
              return (
                <div key={r.id} className="grid grid-cols-12 gap-3 px-4 py-3 items-center text-sm">
                  <div className="col-span-2 text-xs text-[#6B7280]">{r.date}</div>
                  <div className="col-span-2 font-bold text-[#1A2E26]">{r.branch_name || '—'}</div>
                  <div className="col-span-2 text-center font-mono">{Number(r.expected_cash).toLocaleString()}</div>
                  <div className="col-span-2 text-center font-mono font-bold">{Number(r.actual_cash).toLocaleString()}</div>
                  <div className={`col-span-2 text-center font-mono font-black ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-[#FA8125]' : 'text-[#6B7280]'}`}>
                    {variance > 0 ? '+' : ''}{variance.toLocaleString()}
                  </div>
                  <div className="col-span-2">
                    {variance === 0 ? (
                      <span className="px-2 py-0.5 rounded bg-[#FA8125]/10 text-[#FA8125] text-[10px] font-bold">مطابق ✓</span>
                    ) : Math.abs(variance) < 50 ? (
                      <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">فرق بسيط</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-red-50 text-red-700 text-[10px] font-bold">⚠️ فرق كبير</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      </main>

      {showAdd && (
        <AddReconModal
          supplierId={supplierId}
          branches={branches}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); load() }}
        />
      )}
    </div>
  )
}

function AddReconModal({ supplierId, branches, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    branch_id: branches[0]?.id || '',
    date: new Date().toISOString().slice(0, 10),
    cash: '',
    card: '',
    instapay: '',
    expected: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const actual = (parseFloat(form.cash) || 0) + (parseFloat(form.card) || 0) + (parseFloat(form.instapay) || 0)
  const expected = parseFloat(form.expected) || 0
  const variance = actual - expected

  async function save() {
    if (!form.branch_id) return alert('اختار فرع')
    setSaving(true)
    await rpcSafe(supabase, 'admin_record_cash_recon', {
      p_supplier_id: supplierId,
      p_branch_id: form.branch_id,
      p_date: form.date,
      p_actual_cash: actual,
      p_expected_cash: expected,
      p_breakdown: {
        cash: parseFloat(form.cash) || 0,
        card: parseFloat(form.card) || 0,
        instapay: parseFloat(form.instapay) || 0,
      },
      p_notes: form.notes || null,
    })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">جرد كاش اليوم</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="الفرع">
            <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="التاريخ">
            <input type="date" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          <Field label="المتوقع من النظام (ج)">
            <input type="number" value={form.expected} onChange={e => setForm({ ...form, expected: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
          </Field>
          <hr className="border-gray-100" />
          <p className="text-[10px] font-bold uppercase text-[#6B7280]">الفعلي (تفصيلي)</p>
          <Field label="كاش">
            <input type="number" value={form.cash} onChange={e => setForm({ ...form, cash: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
          </Field>
          <Field label="فيزا/كارت">
            <input type="number" value={form.card} onChange={e => setForm({ ...form, card: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
          </Field>
          <Field label="InstaPay">
            <input type="number" value={form.instapay} onChange={e => setForm({ ...form, instapay: e.target.value })} placeholder="0" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
          </Field>
          
          {/* Summary */}
          <div className="rounded-xl bg-[#FAFAF7] p-3 space-y-1.5">
            <div className="flex justify-between text-xs"><span className="text-[#6B7280]">إجمالي الفعلي</span><span className="font-bold font-mono">{actual.toLocaleString()} ج</span></div>
            <div className="flex justify-between text-xs"><span className="text-[#6B7280]">المتوقع</span><span className="font-mono">{expected.toLocaleString()} ج</span></div>
            <div className={`flex justify-between text-sm font-black font-mono ${variance < 0 ? 'text-red-600' : variance > 0 ? 'text-[#FA8125]' : 'text-[#1A2E26]'}`}>
              <span>الفرق</span><span>{variance > 0 ? '+' : ''}{variance.toLocaleString()} ج</span>
            </div>
          </div>
          
          <Field label="ملاحظات (اختياري)">
            <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} placeholder="سبب الفرق لو موجود..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50">
            {saving ? 'جاري الحفظ...' : 'احفظ الجرد'}
          </button>
        </div>
      </div>
    </div>
  )
}

function StatCard({ label, value, icon, tone, primary }: any) {
  const toneClass = tone === 'warning' ? 'text-amber-700' : tone === 'danger' ? 'text-red-600' : tone === 'positive' ? 'text-[#FA8125]' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-4 border ${primary ? 'bg-[#FA8125] border-[#FA8125] text-white' : 'bg-white border-gray-100'}`}>
      <p className={`text-[10px] font-bold tracking-wider uppercase ${primary ? 'text-white/90' : 'text-[#6B7280]'} mb-1`}>{label}</p>
      <p className={`text-xl md:text-2xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}

function Field({ label, children }: any) {
  return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div>
}

function Loader() {
  return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div>
}
