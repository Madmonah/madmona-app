'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Building2, Clock, Users, Save, X, Power, Copy, CheckCircle2 } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

export default function BranchesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState<any>(null)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: br } = await supabase.from('supplier_branches')
      .select('*, business_employees(count)')
      .eq('supplier_id', supplierId)
      .order('code')
    setBranches(br || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  function copyBookingLink(code: string) {
    const link = `https://madmonacairo.com/book/${code}`
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#2B4521] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#2B4521] mb-1">B2B PARTNER · BRANCHES</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الفروع · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{branches.length} فرع · إعدادات الحجز وساعات العمل</p>
            </div>
            <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {loading ? (
            <div className="col-span-2 py-12 text-center"><Loader2 className="w-6 h-6 text-[#2B4521] animate-spin inline" /></div>
          ) : branches.map(b => {
            const empCount = b.business_employees?.[0]?.count || 0
            return (
              <div key={b.id} className="bg-white rounded-2xl border border-gray-100 p-5">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-[#2B4521]/10 text-[#2B4521] grid place-items-center"><Building2 className="w-5 h-5" /></div>
                    <div>
                      <h3 className="text-base font-black text-[#1A2E26]">{b.name}</h3>
                      <p className="text-[10px] text-[#6B7280] font-mono">{b.code}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {b.booking_enabled !== false ? (
                      <span className="px-2 py-0.5 rounded bg-[#2B4521]/10 text-[#2B4521] text-[10px] font-bold flex items-center gap-1"><Power className="w-3 h-3" /> حجز مفتوح</span>
                    ) : (
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-500 text-[10px] font-bold">حجز مقفول</span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mb-3">
                  <div className="bg-[#FAFAF7] rounded-xl p-2">
                    <p className="text-[10px] text-[#6B7280] flex items-center justify-center gap-1"><Users className="w-3 h-3" /> موظفين</p>
                    <p className="text-lg font-black text-[#1A2E26]">{empCount}</p>
                  </div>
                  <div className="bg-[#FAFAF7] rounded-xl p-2">
                    <p className="text-[10px] text-[#6B7280] flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> ساعات</p>
                    <p className="text-xs font-black text-[#1A2E26] font-mono">{(b.opens_at || '09:00').slice(0,5)}-{(b.closes_at || '21:00').slice(0,5)}</p>
                  </div>
                  <div className="bg-[#FAFAF7] rounded-xl p-2">
                    <p className="text-[10px] text-[#6B7280]">سعة/موعد</p>
                    <p className="text-lg font-black text-[#1A2E26]">{b.max_concurrent_bookings || 3}</p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button onClick={() => setEditing(b)} className="flex-1 px-3 py-2 rounded-xl bg-[#2B4521] text-white text-xs font-bold">تعديل الإعدادات</button>
                  <button onClick={() => copyBookingLink(b.code)} className="px-3 py-2 rounded-xl bg-[#FAFAF7] text-[#1A2E26] text-xs font-bold flex items-center gap-1">
                    {copiedCode === b.code ? <><CheckCircle2 className="w-3.5 h-3.5 text-[#2B4521]" /> اتنسخ</> : <><Copy className="w-3.5 h-3.5" /> رابط الحجز</>}
                  </button>
                </div>
                <p className="text-[10px] text-[#6B7280] mt-2 font-mono text-center">madmonacairo.com/book/{b.code}</p>
              </div>
            )
          })}
        </section>
      </main>

      {editing && (
        <BranchSettingsModal branch={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load() }} />
      )}
    </div>
  )
}

function BranchSettingsModal({ branch, onClose, onSaved }: any) {
  const [form, setForm] = useState({
    opens_at: (branch.opens_at || '09:00').slice(0, 5),
    closes_at: (branch.closes_at || '21:00').slice(0, 5),
    max_concurrent_bookings: branch.max_concurrent_bookings?.toString() || '3',
    slot_interval_minutes: branch.slot_interval_minutes?.toString() || '30',
    booking_enabled: branch.booking_enabled !== false,
    phone: branch.phone || '',
    manager_name: branch.manager_name || '',
    manager_phone: branch.manager_phone || '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    await rpcSafe(supabase, 'admin_update_branch_settings', {
      p_branch_id: branch.id,
      p_opens_at: form.opens_at + ':00',
      p_closes_at: form.closes_at + ':00',
      p_max_concurrent_bookings: parseInt(form.max_concurrent_bookings) || 3,
      p_slot_interval_minutes: parseInt(form.slot_interval_minutes) || 30,
      p_booking_enabled: form.booking_enabled,
      p_phone: form.phone || null,
      p_manager_name: form.manager_name || null,
      p_manager_phone: form.manager_phone || null,
    })
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">إعدادات {branch.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          {/* Booking toggle */}
          <button onClick={() => setForm({ ...form, booking_enabled: !form.booking_enabled })} className={`w-full p-3 rounded-xl border-2 flex items-center justify-between transition-all ${form.booking_enabled ? 'border-[#2B4521] bg-[#2B4521]/5' : 'border-gray-200 bg-gray-50'}`}>
            <div className="flex items-center gap-2">
              <Power className={`w-4 h-4 ${form.booking_enabled ? 'text-[#2B4521]' : 'text-gray-400'}`} />
              <span className="text-sm font-bold text-[#1A2E26]">الحجز الأونلاين</span>
            </div>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${form.booking_enabled ? 'bg-[#2B4521] text-white' : 'bg-gray-200 text-gray-500'}`}>
              {form.booking_enabled ? 'مفتوح' : 'مقفول'}
            </span>
          </button>

          <div className="grid grid-cols-2 gap-3">
            <Field label="يفتح الساعة"><input type="time" value={form.opens_at} onChange={e => setForm({ ...form, opens_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
            <Field label="يقفل الساعة"><input type="time" value={form.closes_at} onChange={e => setForm({ ...form, closes_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="عدد الحجوزات/موعد"><input type="number" value={form.max_concurrent_bookings} onChange={e => setForm({ ...form, max_concurrent_bookings: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
            <Field label="الفترة بين المواعيد (دقيقة)">
              <select value={form.slot_interval_minutes} onChange={e => setForm({ ...form, slot_interval_minutes: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
                <option value="15">15</option><option value="30">30</option><option value="45">45</option><option value="60">60</option>
              </select>
            </Field>
          </div>
          <hr className="border-gray-100" />
          <Field label="تليفون الفرع"><input type="tel" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="اسم المدير"><input type="text" value={form.manager_name} onChange={e => setForm({ ...form, manager_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
            <Field label="موبايل المدير"><input type="tel" value={form.manager_phone} onChange={e => setForm({ ...form, manager_phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          </div>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#2B4521] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4" /> احفظ الإعدادات</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#2B4521] animate-spin" /></div> }
