'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, ShieldCheck, Plus, X, Package, Banknote, CheckCircle2, User } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const KINDS = [
  { value: 'item', label: 'عهدة عينية (جهاز/معدة)' },
  { value: 'cash', label: 'عهدة نقدية' },
]

export default function CustodyPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.from('custody_items').select('*').eq('supplier_id', supplierId).order('created_at', { ascending: false })
    setItems(list || [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function markReturned(id: string) {
    // @ts-expect-error
    await supabase.from('custody_items').update({ status: 'returned', returned_at: new Date().toISOString() }).eq('id', id)
    load()
  }

  if (!supplier) return <Loader />

  const open = items.filter(i => i.status !== 'returned')
  const returned = items.filter(i => i.status === 'returned')
  const totalOpenValue = open.reduce((s, i) => s + (Number(i.value_egp) || 0), 0)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">B2B PARTNER · CUSTODY</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">العهدة · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{open.length} عهدة مفتوحة · {returned.length} مسترجعة · إجمالي المفتوح {totalOpenValue.toLocaleString()} ج</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> عهدة جديدة</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : items.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <ShieldCheck className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش عهد مسجّلة</p>
              <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#FA8125] text-white text-sm font-bold">سجّل أول عهدة</button>
            </div>
          ) : items.map(i => {
            const isReturned = i.status === 'returned'
            return (
              <div key={i.id} className={`bg-white rounded-2xl border p-4 ${isReturned ? 'border-gray-100 opacity-70' : 'border-[#FA8125]/20'}`}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FA8125]/10 text-[#FA8125] grid place-items-center">
                    {i.kind === 'cash' ? <Banknote className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase text-[#6B7280]">{i.kind === 'cash' ? 'عهدة نقدية' : 'عهدة عينية'}</p>
                    <h3 className="text-sm font-black text-[#1A2E26] truncate">{i.title}</h3>
                  </div>
                  {isReturned
                    ? <span className="text-[10px] font-bold text-green-700 bg-green-50 px-2 py-1 rounded-full">مسترجعة</span>
                    : <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded-full">مفتوحة</span>}
                </div>
                <div className="text-xs text-[#6B7280] space-y-1">
                  {i.employee_name && <p className="flex items-center gap-1"><User className="w-3 h-3" /> {i.employee_name}</p>}
                  {i.value_egp != null && <p>القيمة: <b className="text-[#1A2E26]">{Number(i.value_egp).toLocaleString()} ج</b></p>}
                  {i.serial_no && <p>سيريال: {i.serial_no}</p>}
                  {i.due_back_at && <p>ترجيع بحد أقصى: {new Date(i.due_back_at).toLocaleDateString('ar-EG')}</p>}
                  {i.notes && <p className="text-[#6B7280]">{i.notes}</p>}
                </div>
                {!isReturned && (
                  <button onClick={() => markReturned(i.id)} className="w-full mt-3 px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-[#FA8125] text-xs font-bold flex items-center justify-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> تسجيل استرجاع
                  </button>
                )}
              </div>
            )
          })}
        </section>
      </main>

      {showAdd && <AddCustodyModal supplierId={supplierId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
    </div>
  )
}

function AddCustodyModal({ supplierId, onClose, onSaved }: any) {
  const [form, setForm] = useState({ kind: 'item', title: '', employee_name: '', value_egp: '', serial_no: '', due_back_at: '', notes: '' })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.title) return alert('اكتب وصف العهدة')
    setSaving(true)
    // @ts-expect-error
    const { error } = await supabase.from('custody_items').insert({
      supplier_id: supplierId,
      kind: form.kind,
      title: form.title,
      employee_name: form.employee_name || null,
      value_egp: form.value_egp ? Number(form.value_egp) : null,
      serial_no: form.serial_no || null,
      due_back_at: form.due_back_at || null,
      notes: form.notes || null,
      status: 'assigned',
      assigned_at: new Date().toISOString(),
    })
    setSaving(false)
    if (error) { alert('فشل الحفظ: ' + error.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">تسجيل عهدة جديدة</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="النوع">
            <select value={form.kind} onChange={e => setForm({ ...form, kind: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              {KINDS.map(k => <option key={k.value} value={k.value}>{k.label}</option>)}
            </select>
          </Field>
          <Field label="الوصف *"><input type="text" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" placeholder="مثال: لابتوب Dell / عهدة نقدية للمشتريات" /></Field>
          <Field label="الموظف المسؤول"><input type="text" value={form.employee_name} onChange={e => setForm({ ...form, employee_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="القيمة (ج)"><input type="number" value={form.value_egp} onChange={e => setForm({ ...form, value_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="رقم السيريال (للعهدة العينية)"><input type="text" value={form.serial_no} onChange={e => setForm({ ...form, serial_no: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="تاريخ الترجيع (اختياري)"><input type="date" value={form.due_back_at} onChange={e => setForm({ ...form, due_back_at: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="ملاحظات"><textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Plus className="w-4 h-4" /> حفظ العهدة</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
