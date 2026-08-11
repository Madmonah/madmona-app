'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Clock, Phone, Scissors, Building2, X, Calendar, CheckCircle2, MessageCircle, Trash2 } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUS_TABS = [
  { value: 'waiting', label: 'في الانتظار' },
  { value: 'notified', label: 'تم التواصل' },
  { value: 'converted', label: 'اتحولت لحجز' },
  { value: 'cancelled', label: 'ملغية' },
]

export default function WaitlistPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [entries, setEntries] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('waiting')
  const [loading, setLoading] = useState(true)
  const [converting, setConverting] = useState<any>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name, contact_phone').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    // @ts-expect-error
    const { data: result } = await supabase.rpc('admin_get_waitlist', {
      p_supplier_id: supplierId, p_branch_id: branchFilter, p_status: statusFilter,
    })
    setEntries(result || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, branchFilter, statusFilter])

  async function updateStatus(id: string, status: string) {
    setBusyId(id)
    await rpcSafe(supabase, 'admin_update_waitlist_status', { p_waitlist_id: id, p_status: status })
    await load()
    setBusyId(null)
  }

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
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · WAITLIST</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">قائمة الانتظار · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{entries.length} في القائمة · حوّلهم لحجوزات لما يفضى مكان</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            {STATUS_TABS.map(t => (
              <button key={t.value} onClick={() => setStatusFilter(t.value)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${statusFilter === t.value ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{t.label}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
            <button onClick={() => setBranchFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!branchFilter ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>كل الفروع</button>
            {branches.map(b => (
              <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${branchFilter === b.id ? 'bg-[#FA8125] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{b.name}</button>
            ))}
          </div>
        </section>

        {/* Entries */}
        <section className="space-y-2">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : entries.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Clock className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش حد في القائمة دي</p>
            </div>
          ) : entries.map((e, i) => (
            <div key={e.waitlist_id} className="bg-white rounded-2xl border border-gray-100 p-4">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded-full bg-[#FA8125]/10 text-[#FA8125] grid place-items-center font-black text-sm">{i + 1}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#1A2E26]">{e.customer_name}</p>
                    <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5"><Scissors className="w-3 h-3" /> {e.service_name || 'خدمة'}</p>
                    <div className="flex items-center gap-3 mt-1 text-[10px] text-[#6B7280] flex-wrap">
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {e.customer_phone}</span>
                      {e.preferred_date && <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(e.preferred_date).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })}</span>}
                      {e.preferred_time_text && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {e.preferred_time_text}</span>}
                      {e.branch_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {e.branch_name}</span>}
                    </div>
                  </div>
                </div>

                {e.status === 'waiting' && (
                  <div className="flex gap-1.5 flex-wrap">
                    {busyId === e.waitlist_id ? <Loader2 className="w-5 h-5 text-[#FA8125] animate-spin" /> : (
                      <>
                        <a
                          href={`https://wa.me/${(e.customer_phone || '').replace(/[^0-9]/g, '').replace(/^0/, '20')}?text=${encodeURIComponent(`مرحباً ${e.customer_name?.split(' ')[0] || ''}، فضى مكان لـ ${e.service_name} في ${supplier?.business_name}! تحبي تحجزي؟`)}`}
                          target="_blank" rel="noopener"
                          onClick={() => updateStatus(e.waitlist_id, 'notified')}
                          className="px-2.5 py-1.5 rounded-lg bg-[#FA8125] text-white text-[10px] font-bold flex items-center gap-1"
                        >
                          <MessageCircle className="w-3 h-3" /> كلّمها
                        </a>
                        <button onClick={() => setConverting(e)} className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-[10px] font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> حوّل لحجز
                        </button>
                        <button onClick={() => updateStatus(e.waitlist_id, 'cancelled')} className="px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 text-[10px] font-bold flex items-center gap-1">
                          <Trash2 className="w-3 h-3" /> شيل
                        </button>
                      </>
                    )}
                  </div>
                )}
                {e.status === 'notified' && (
                  <div className="flex gap-1.5">
                    <button onClick={() => setConverting(e)} className="px-2.5 py-1.5 rounded-lg bg-green-600 text-white text-[10px] font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> حوّل لحجز</button>
                    <span className="px-2 py-1 rounded-lg bg-amber-50 text-amber-700 text-[10px] font-bold">تم التواصل</span>
                  </div>
                )}
                {e.status === 'converted' && <span className="px-2 py-1 rounded-lg bg-green-50 text-green-700 text-[10px] font-bold">✓ اتحولت لحجز</span>}
              </div>
              {e.notes && <p className="text-[10px] text-[#FA8125] mt-2 pt-2 border-t border-gray-100">💡 {e.notes}</p>}
            </div>
          ))}
        </section>
      </main>

      {converting && (
        <ConvertModal entry={converting} branches={branches} supplierId={supplierId} onClose={() => setConverting(null)} onDone={() => { setConverting(null); load() }} />
      )}
    </div>
  )
}

function ConvertModal({ entry, branches, supplierId, onClose, onDone }: any) {
  const [date, setDate] = useState(entry.preferred_date || new Date().toISOString().slice(0, 10))
  const [time, setTime] = useState('11:00')
  const [stylists, setStylists] = useState<any[]>([])
  const [stylistId, setStylistId] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      // find branch id from entry
      const branch = branches.find((b: any) => b.name === entry.branch_name)
      if (branch) {
        // @ts-expect-error
        const { data } = await supabase.from('business_employees').select('id, full_name').eq('branch_id', branch.id).eq('status', 'active').order('full_name')
        setStylists(data || [])
      }
    })()
  }, [entry, branches])

  async function convert() {
    setSaving(true)
    const scheduled = new Date(date)
    const [h, m] = time.split(':')
    scheduled.setHours(parseInt(h), parseInt(m), 0, 0)
    // @ts-expect-error
    const { data, error } = await supabase.rpc('admin_convert_waitlist', {
      p_waitlist_id: entry.waitlist_id,
      p_scheduled_at: scheduled.toISOString(),
      p_employee_id: stylistId || null,
    })
    if (error || !data?.success) alert('خطأ: ' + (error?.message || 'فشل التحويل'))
    else onDone()
    setSaving(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#FA8125]">تحويل لحجز</p>
            <h2 className="text-lg font-black text-[#1A2E26]">{entry.customer_name}</h2>
          </div>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <p className="text-xs text-[#6B7280]">{entry.service_name}</p>
          <div className="grid grid-cols-2 gap-3">
            <Field label="التاريخ"><input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
            <Field label="الوقت"><input type="time" value={time} onChange={e => setTime(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          </div>
          <Field label="الستايليست (اختياري)">
            <select value={stylistId} onChange={e => setStylistId(e.target.value)} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              <option value="">بدون تحديد</option>
              {stylists.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
          <button onClick={convert} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التحويل...</> : <><CheckCircle2 className="w-4 h-4" /> أكد الحجز</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
