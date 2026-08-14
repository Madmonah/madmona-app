'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import {
  Calendar, ChevronLeft, ChevronRight, Loader2, Plus, RefreshCw,
  Clock, User as UserIcon, Phone, X, Building2,
} from 'lucide-react'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Appointment = {
  id: string
  service: string
  customer_name: string
  customer_phone: string
  scheduled_at: string
  duration_minutes: number
  price_egp: number
  status: string
  stylist: string | null
  branch_name: string | null
}

type Service = { id: string; name_ar: string; price_egp: number; duration_minutes: number; category: string }
type Branch = { id: string; name: string; code: string | null }
type Employee = { id: string; full_name: string; role_ar: string | null }

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-amber-50 border-amber-200 text-amber-900',
  confirmed: 'bg-blue-50 border-blue-200 text-blue-900',
  in_progress: 'bg-[#34D399]/10 border-[#059669]/30 text-[#059669]',
  completed: 'bg-[#34D399]/5 border-[#059669]/20 text-[#059669]/80',
  cancelled: 'bg-red-50 border-red-200 text-red-700',
  no_show: 'bg-gray-100 border-gray-300 text-gray-500',
}
const STATUS_LABELS: Record<string, string> = {
  scheduled: 'متحجزة', confirmed: 'مؤكدة', in_progress: 'بتتعمل', completed: 'خلصت', cancelled: 'اتلغت', no_show: 'لم تحضر',
}

export default function AppointmentsPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<{ business_name: string } | null>(null)
  const [date, setDate] = useState(new Date())
  const [branches, setBranches] = useState<Branch[]>([])
  const [services, setServices] = useState<Service[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [appointments, setAppointments] = useState<Appointment[]>([])
  const [stats, setStats] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showNew, setShowNew] = useState(false)

  async function load() {
    setLoading(true)
    const [{ data: sup }, { data: br }, { data: sv }, { data: emp }] = await Promise.all([
      supabase.from('suppliers').select('business_name').eq('id', supplierId).single(),
      supabase.from('supplier_branches').select('id, name, code').eq('supplier_id', supplierId).order('code'),
      supabase.from('services_catalog').select('id, name_ar, price_egp, duration_minutes, category').eq('supplier_id', supplierId).eq('status', 'active'),
      supabase.from('business_employees').select('id, full_name, role_ar').eq('supplier_id', supplierId),
    ])
    setSupplier(sup as any)
    setBranches((br || []) as Branch[])
    setServices((sv || []) as Service[])
    setEmployees((emp || []) as Employee[])

    const dateStr = date.toISOString().slice(0, 10)
    const { data: result } = await supabase.rpc('admin_get_appointments', {
      p_supplier_id: supplierId,
      p_branch_id: selectedBranch,
      p_date: dateStr,
    })
    if (result) {
      setAppointments((result.appointments || []) as Appointment[])
      setStats(result.stats)
    }
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId, date, selectedBranch])

  const isToday = date.toDateString() === new Date().toDateString()
  const apptsByHour = useMemo(() => {
    const map = new Map<number, Appointment[]>()
    for (const a of appointments) {
      const hour = new Date(a.scheduled_at).getHours()
      if (!map.has(hour)) map.set(hour, [])
      map.get(hour)!.push(a)
    }
    return map
  }, [appointments])

  const hours = Array.from({ length: 14 }, (_, i) => i + 9) // 9 AM - 10 PM

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع للـ finance
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">B2B PARTNER · APPOINTMENTS</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26] tracking-tight">مواعيد {supplier?.business_name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowNew(true)} className="px-4 py-2 rounded-xl bg-[#34D399] hover:opacity-90 text-[#04352A] text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> حجز جديد
              </button>
              <button onClick={load} className="px-4 py-2 rounded-xl bg-[#FAFAF7] hover:bg-gray-100 text-sm font-bold text-[#1A2E26] flex items-center gap-2">
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* Date navigator */}
        <section className="bg-white rounded-2xl border border-gray-100 p-4 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <button onClick={() => setDate(new Date(date.getTime() - 86400000))}
              className="p-2 rounded-lg bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26]">
              <ChevronRight className="w-4 h-4" />
            </button>
            <div className="text-center px-4">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                {isToday ? 'اليوم' : ''}
              </p>
              <p className="text-base font-black text-[#1A2E26]">
                {date.toLocaleDateString('ar-EG', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
            <button onClick={() => setDate(new Date(date.getTime() + 86400000))}
              className="p-2 rounded-lg bg-[#FAFAF7] hover:bg-gray-100 text-[#1A2E26]">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {!isToday && (
              <button onClick={() => setDate(new Date())} className="text-xs font-bold text-[#059669] hover:underline mr-2">
                ارجع لليوم
              </button>
            )}
          </div>

          <div className="flex gap-2 flex-wrap">
            <button onClick={() => setSelectedBranch(null)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                selectedBranch === null ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#1A2E26]'
              }`}>
              <Building2 className="w-3.5 h-3.5" /> كل الفروع
            </button>
            {branches.map((b) => (
              <button key={b.id} onClick={() => setSelectedBranch(b.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                  selectedBranch === b.id ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#FAFAF7] text-[#1A2E26]'
                }`}>
                {b.code || b.name}
              </button>
            ))}
          </div>
        </section>

        {/* Stats */}
        {stats && (
          <section className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <StatCard label="إجمالي" value={stats.total} />
            <StatCard label="متحجزة" value={stats.scheduled} tone="amber" />
            <StatCard label="مكتملة" value={stats.completed} tone="positive" />
            <StatCard label="ملغية" value={stats.cancelled} tone="negative" />
            <StatCard label="إيراد" value={`${Number(stats.revenue).toLocaleString()} ج`} primary />
          </section>
        )}

        {/* Calendar grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-[#059669] animate-spin" /></div>
        ) : (
          <section className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-black text-[#1A2E26]">
                {appointments.length === 0 ? 'مفيش حجوزات في اليوم ده' : `${appointments.length} حجز`}
              </h3>
            </div>
            <div className="divide-y divide-gray-100">
              {hours.map((hour) => {
                const slots = apptsByHour.get(hour) || []
                return (
                  <div key={hour} className="flex">
                    <div className="w-20 p-3 bg-[#FAFAF7] border-l border-gray-100 flex items-start justify-center">
                      <span className="text-xs font-bold text-[#6B7280] font-mono">
                        {hour > 12 ? `${hour - 12}م` : hour === 12 ? '12م' : `${hour}ص`}
                      </span>
                    </div>
                    <div className="flex-1 p-2 min-h-[60px]">
                      {slots.length === 0 ? (
                        <div className="h-full opacity-30 text-xs text-[#6B7280] flex items-center px-2">—</div>
                      ) : (
                        <div className="space-y-1.5">
                          {slots.map((a) => (
                            <AppointmentCard key={a.id} a={a} onUpdate={load} />
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        )}
      </main>

      {showNew && (
        <NewAppointmentModal
          supplierId={supplierId}
          branches={branches}
          services={services}
          employees={employees}
          onClose={() => setShowNew(false)}
          onCreated={() => { setShowNew(false); load(); }}
        />
      )}
    </div>
  )
}

function AppointmentCard({ a, onUpdate }: { a: Appointment; onUpdate: () => void }) {
  const colorClass = STATUS_COLORS[a.status] || STATUS_COLORS.scheduled
  const time = new Date(a.scheduled_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })

  async function updateStatus(newStatus: string) {
    await supabase.from('branch_bookings').update({
      status: newStatus,
      completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
    }).eq('id', a.id)
    onUpdate()
  }

  return (
    <div className={`rounded-xl p-3 border ${colorClass} group`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-black truncate">{a.service}</p>
          <div className="flex items-center gap-3 mt-1 text-xs">
            <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {time} · {a.duration_minutes}د</span>
            <span className="flex items-center gap-1"><UserIcon className="w-3 h-3" /> {a.customer_name}</span>
            {a.stylist && <span className="opacity-70">مع {a.stylist}</span>}
          </div>
        </div>
        <div className="text-left flex-shrink-0">
          <p className="text-sm font-black">{Number(a.price_egp).toLocaleString()} ج</p>
          <p className="text-[10px] font-bold opacity-80 mt-0.5">{STATUS_LABELS[a.status] || a.status}</p>
        </div>
      </div>
      {a.status === 'scheduled' && (
        <div className="mt-2 pt-2 border-t border-current/10 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => updateStatus('completed')} className="text-[10px] font-bold px-2 py-1 rounded bg-[#34D399] text-[#04352A]">✓ تمت</button>
          <button onClick={() => updateStatus('in_progress')} className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-current">⏳ بدأت</button>
          <button onClick={() => updateStatus('cancelled')} className="text-[10px] font-bold px-2 py-1 rounded bg-white border border-current">إلغاء</button>
        </div>
      )}
    </div>
  )
}

function NewAppointmentModal({ supplierId, branches, services, employees, onClose, onCreated }: {
  supplierId: string; branches: Branch[]; services: Service[]; employees: Employee[];
  onClose: () => void; onCreated: () => void;
}) {
  const [form, setForm] = useState({
    customer_name: '', customer_phone: '',
    branch_id: branches[0]?.id || '',
    service_id: '',
    scheduled_at: '',
    assigned_employee_id: '',
  })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function create() {
    if (!form.customer_name || !form.customer_phone || !form.service_id || !form.scheduled_at || !form.branch_id) {
      setError('املي كل الحقول'); return
    }
    setSaving(true); setError('')
    try {
      const { error: rpcErr } = await supabase.rpc('admin_create_appointment', {
        p_supplier_id: supplierId,
        p_branch_id: form.branch_id,
        p_customer_name: form.customer_name,
        p_customer_phone: form.customer_phone,
        p_service_id: form.service_id,
        p_scheduled_at: form.scheduled_at,
        p_assigned_employee_id: form.assigned_employee_id || null,
      })
      if (rpcErr) { setError(rpcErr.message); setSaving(false); return }
      onCreated()
    } catch (e: any) {
      setError(e.message); setSaving(false)
    }
  }

  const stylists = employees.filter((e) => e.role_ar?.includes('Stylist') || e.role_ar?.includes('MUA') || e.role_ar?.includes('Nail') || e.role_ar?.includes('استايلست'))

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-[#FAFAF7] rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 max-h-[90vh] flex flex-col shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 bg-white rounded-t-3xl flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">حجز جديد</h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#FAFAF7] text-[#6B7280]"><X className="w-5 h-5" /></button>
        </header>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <Input label="اسم العميلة" value={form.customer_name} onChange={(v) => setForm({...form, customer_name: v})} />
          <Input label="رقم الموبايل" value={form.customer_phone} onChange={(v) => setForm({...form, customer_phone: v})} placeholder="+201..." />
          
          <Select label="الفرع" value={form.branch_id} onChange={(v) => setForm({...form, branch_id: v})}
            options={branches.map(b => ({ v: b.id, label: b.name }))} />
          
          <Select label="الخدمة" value={form.service_id} onChange={(v) => setForm({...form, service_id: v})}
            options={[{ v: '', label: '— اختار خدمة —' }, ...services.map(s => ({ v: s.id, label: `${s.name_ar} (${s.price_egp} ج · ${s.duration_minutes}د)` }))]} />
          
          <Select label="الاستايلست" value={form.assigned_employee_id} onChange={(v) => setForm({...form, assigned_employee_id: v})}
            options={[{ v: '', label: 'بدون تخصيص' }, ...stylists.map(e => ({ v: e.id, label: `${e.full_name} (${e.role_ar})` }))]} />
          
          <div>
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1">موعد الحجز</p>
            <input type="datetime-local" value={form.scheduled_at} onChange={(e) => setForm({...form, scheduled_at: e.target.value})}
              className="w-full px-3 py-2 bg-white rounded-lg text-sm text-[#1A2E26] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]" />
          </div>
          {error && <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">{error}</div>}
        </div>
        <footer className="px-5 py-3 border-t border-gray-100 bg-white flex gap-2">
          <button onClick={onClose} className="flex-1 px-4 py-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] text-sm font-bold">إلغاء</button>
          <button onClick={create} disabled={saving} className="flex-1 px-4 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold disabled:opacity-50">
            {saving ? 'حفظ...' : 'احفظ الحجز'}
          </button>
        </footer>
      </div>
    </div>
  )
}

function Input({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1">{label}</p>
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder}
        className="w-full px-3 py-2 bg-white rounded-lg text-sm text-[#1A2E26] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]" />
    </div>
  )
}
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { v: string; label: string }[] }) {
  return (
    <div>
      <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1">{label}</p>
      <select value={value} onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white rounded-lg text-sm text-[#1A2E26] border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#059669]">
        {options.map(o => <option key={o.v} value={o.v}>{o.label}</option>)}
      </select>
    </div>
  )
}

function StatCard({ label, value, tone, primary }: { label: string; value: number | string; tone?: 'positive' | 'negative' | 'amber'; primary?: boolean }) {
  const toneClass = tone === 'positive' ? 'text-[#059669]' : tone === 'negative' ? 'text-red-600' : tone === 'amber' ? 'text-amber-700' : 'text-[#1A2E26]'
  return (
    <div className={`rounded-2xl p-3 border ${primary ? 'bg-[#34D399] border-[#059669] text-[#04352A]' : 'bg-white border-gray-100'}`}>
      <p className={`text-[10px] font-bold tracking-wider uppercase mb-1 ${primary ? 'text-white/90' : 'text-[#6B7280]'}`}>{label}</p>
      <p className={`text-xl font-black ${primary ? 'text-white' : toneClass}`}>{value}</p>
    </div>
  )
}
