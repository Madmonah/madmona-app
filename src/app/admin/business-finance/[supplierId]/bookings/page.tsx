'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'
import {
  ChevronLeft, Loader2, RefreshCw, Calendar, Clock, Phone, User, Plus, X,
  CheckCircle2, PlayCircle, XCircle, UserX2, Scissors, Building2, Check,
} from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'محجوز', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  confirmed: { label: 'مؤكد', cls: 'bg-[#2B4521]/10 text-[#2B4521] border-[#2B4521]/20' },
  in_progress: { label: 'جاري', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  completed: { label: 'مكتمل', cls: 'bg-green-50 text-green-700 border-green-200' },
  cancelled: { label: 'ملغي', cls: 'bg-gray-100 text-gray-500 border-gray-200' },
  no_show: { label: 'لم يحضر', cls: 'bg-red-50 text-red-700 border-red-200' },
}

export default function BookingsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [bookings, setBookings] = useState<any[]>([])
  const [branchFilter, setBranchFilter] = useState<string | null>(null)
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().slice(0, 10))
  const [statusFilter, setStatusFilter] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showWalkin, setShowWalkin] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code')
    setBranches(br || [])
    // @ts-expect-error
    const { data: result } = await supabase.rpc('admin_get_bookings', {
      p_supplier_id: supplierId,
      p_branch_id: branchFilter,
      p_date: dateFilter || null,
      p_status: statusFilter,
    })
    setBookings(result || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, branchFilter, dateFilter, statusFilter])

  async function updateStatus(bookingId: string, newStatus: string) {
    setBusyId(bookingId)
    await rpcSafe(supabase, 'admin_update_booking_status', { p_booking_id: bookingId, p_new_status: newStatus })
    await load()
    setBusyId(null)
  }

  if (!supplier) return <Loader />

  const counts = {
    total: bookings.length,
    scheduled: bookings.filter(b => b.status === 'scheduled' || b.status === 'confirmed').length,
    in_progress: bookings.filter(b => b.status === 'in_progress').length,
    completed: bookings.filter(b => b.status === 'completed').length,
    revenue: bookings.filter(b => b.status === 'completed').reduce((s, b) => s + Number(b.price_egp || 0), 0),
  }

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">B2B PARTNER · BOOKINGS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">إدارة الحجوزات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{counts.total} حجز · {counts.completed} مكتمل · {Number(counts.revenue).toLocaleString()} ج</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowWalkin(true)} className="px-4 py-2 rounded-xl bg-[#2B4521] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> حجز walk-in</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-4">
        {/* Filters */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3">
          <div className="flex gap-2 flex-wrap items-center">
            <Calendar className="w-3.5 h-3.5 text-[#6B7280]" />
            <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-xs font-mono" />
            <button onClick={() => setDateFilter('')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!dateFilter ? 'bg-[#2B4521] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>كل الأيام</button>
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Building2 className="w-3.5 h-3.5 text-[#6B7280]" />
            <button onClick={() => setBranchFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!branchFilter ? 'bg-[#2B4521] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>كل الفروع</button>
            {branches.map(b => (
              <button key={b.id} onClick={() => setBranchFilter(b.id)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${branchFilter === b.id ? 'bg-[#2B4521] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{b.name}</button>
            ))}
          </div>
          <div className="flex gap-2 flex-wrap items-center">
            <Clock className="w-3.5 h-3.5 text-[#6B7280]" />
            <button onClick={() => setStatusFilter(null)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${!statusFilter ? 'bg-[#2B4521] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>الكل</button>
            {Object.entries(STATUS_CONFIG).map(([k, v]) => (
              <button key={k} onClick={() => setStatusFilter(k)} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${statusFilter === k ? 'bg-[#2B4521] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'}`}>{v.label}</button>
            ))}
          </div>
        </section>

        {/* Bookings list */}
        <section className="space-y-2">
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin inline" /></div>
          ) : bookings.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Calendar className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش حجوزات في الفلتر ده</p>
            </div>
          ) : bookings.map(b => {
            const sc = STATUS_CONFIG[b.status] || STATUS_CONFIG.scheduled
            const time = new Date(b.scheduled_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
            const date = new Date(b.scheduled_at).toLocaleDateString('ar-EG', { day: 'numeric', month: 'short' })
            return (
              <div key={b.booking_id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="text-center bg-[#FAFAF7] rounded-xl px-3 py-2 min-w-[60px]">
                      <p className="text-sm font-black text-[#1A2E26] font-mono">{time}</p>
                      <p className="text-[10px] text-[#6B7280]">{date}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-black text-[#1A2E26]">{b.customer_name}</p>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${sc.cls}`}>{sc.label}</span>
                      </div>
                      <p className="text-xs text-[#6B7280] flex items-center gap-1 mt-0.5"><Scissors className="w-3 h-3" /> {b.service_name} · {Number(b.price_egp).toLocaleString()} ج</p>
                      <div className="flex items-center gap-3 mt-1 text-[10px] text-[#6B7280]">
                        {b.customer_phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {b.customer_phone}</span>}
                        {b.stylist_name && <span className="flex items-center gap-1"><User className="w-3 h-3" /> {b.stylist_name}</span>}
                        {b.branch_name && <span className="flex items-center gap-1"><Building2 className="w-3 h-3" /> {b.branch_name}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Workflow buttons */}
                  <div className="flex gap-1.5 flex-wrap">
                    {busyId === b.booking_id ? (
                      <Loader2 className="w-5 h-5 text-[#2B4521] animate-spin" />
                    ) : (
                      <>
                        {(b.status === 'scheduled') && (
                          <WorkflowBtn onClick={() => updateStatus(b.booking_id, 'confirmed')} icon={<Check />} label="أكد" tone="primary" />
                        )}
                        {(b.status === 'scheduled' || b.status === 'confirmed') && (
                          <>
                            <WorkflowBtn onClick={() => updateStatus(b.booking_id, 'in_progress')} icon={<PlayCircle />} label="ابدأ" tone="amber" />
                            <WorkflowBtn onClick={() => updateStatus(b.booking_id, 'no_show')} icon={<UserX2 />} label="لم يحضر" tone="red" />
                            <WorkflowBtn onClick={() => updateStatus(b.booking_id, 'cancelled')} icon={<XCircle />} label="ألغِ" tone="gray" />
                          </>
                        )}
                        {b.status === 'in_progress' && (
                          <WorkflowBtn onClick={() => updateStatus(b.booking_id, 'completed')} icon={<CheckCircle2 />} label="خلص" tone="green" />
                        )}
                      </>
                    )}
                  </div>
                </div>
                {b.notes && <p className="text-[10px] text-[#6B7280] mt-2 pt-2 border-t border-gray-100">📝 {b.notes}</p>}
              </div>
            )
          })}
        </section>
      </main>

      {showWalkin && (
        <WalkinModal supplierId={supplierId} branches={branches} onClose={() => setShowWalkin(false)} onSaved={() => { setShowWalkin(false); load() }} />
      )}
    </div>
  )
}

function WorkflowBtn({ onClick, icon, label, tone }: any) {
  const tones: Record<string, string> = {
    primary: 'bg-[#2B4521] text-white',
    amber: 'bg-amber-500 text-white',
    green: 'bg-green-600 text-white',
    red: 'bg-red-50 text-red-600 border border-red-200',
    gray: 'bg-gray-100 text-gray-500',
  }
  return (
    <button onClick={onClick} className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 ${tones[tone]}`}>
      <div className="w-3 h-3">{icon}</div> {label}
    </button>
  )
}

function WalkinModal({ supplierId, branches, onClose, onSaved }: any) {
  const [services, setServices] = useState<any[]>([])
  const [stylists, setStylists] = useState<any[]>([])
  const [form, setForm] = useState({ branch_id: branches[0]?.id || '', service_id: '', customer_name: '', customer_phone: '', employee_id: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    (async () => {
      // @ts-expect-error
      const { data: svc } = await supabase.from('services_catalog').select('id, name_ar, price_egp').eq('supplier_id', supplierId).eq('status', 'active').order('name_ar')
      setServices(svc || [])
    })()
  }, [supplierId])

  useEffect(() => {
    if (!form.branch_id) return
    (async () => {
      // @ts-expect-error
      const { data: emp } = await supabase.from('business_employees').select('id, full_name').eq('branch_id', form.branch_id).eq('status', 'active').order('full_name')
      setStylists(emp || [])
    })()
  }, [form.branch_id])

  async function save() {
    if (!form.service_id || !form.customer_name) return alert('اختار الخدمة واسم العميل')
    setSaving(true)
    await rpcSafe(supabase, 'admin_create_walkin_booking', {
      p_supplier_id: supplierId,
      p_branch_id: form.branch_id,
      p_service_id: form.service_id,
      p_customer_name: form.customer_name,
      p_customer_phone: form.customer_phone || null,
      p_employee_id: form.employee_id || null,
    })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">حجز walk-in سريع</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="الفرع">
            <select value={form.branch_id} onChange={e => setForm({ ...form, branch_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {branches.map((b: any) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </Field>
          <Field label="الخدمة *">
            <select value={form.service_id} onChange={e => setForm({ ...form, service_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              <option value="">اختار خدمة...</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name_ar} ({Number(s.price_egp).toLocaleString()} ج)</option>)}
            </select>
          </Field>
          <Field label="اسم العميل *"><input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="موبايل (اختياري)"><input type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" /></Field>
          <Field label="الستايليست (اختياري)">
            <select value={form.employee_id} onChange={e => setForm({ ...form, employee_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              <option value="">بدون تحديد</option>
              {stylists.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
            </select>
          </Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#2B4521] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Plus className="w-4 h-4" /> ابدأ الخدمة</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#2B4521] animate-spin" /></div> }
