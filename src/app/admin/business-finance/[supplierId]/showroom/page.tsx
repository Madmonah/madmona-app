'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Car, X, User, Plus } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const STATUS: Record<string, { label: string; color: string }> = {
  in_transit: { label: 'في الطريق', color: 'bg-amber-50 text-amber-700' },
  in_stock: { label: 'في المعرض', color: 'bg-[#34D399]/10 text-[#059669]' },
  reserved: { label: 'محجوزة', color: 'bg-blue-50 text-blue-700' },
  sold: { label: 'مباعة', color: 'bg-gray-100 text-gray-500' },
}

const VTYPE: Record<string, string> = {
  motorcycle: 'موتوسيكل', car: 'عربية', jetski: 'جيت سكي', marine: 'مركب',
  tricycle: 'تروسيكل', bicycle: 'دراجة', bus: 'أوتوبيس', watercraft: 'مركب بحري', other: 'أخرى',
}

export default function ShowroomPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string>('all')
  const [sellUnit, setSellUnit] = useState<any>(null)
  const [addOpen, setAddOpen] = useState(false)

  async function load() {
    setLoading(true)
    const { data: s } = await supabase.from('suppliers').select('business_name, theme').eq('id', supplierId).single()
    setSupplier(s)
    const { data: list } = await supabase.rpc('admin_list_vehicle_units', { p_supplier_id: supplierId })
    setUnits(Array.isArray(list) ? list : [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function setStatus(unitId: string, status: string) {
    await rpcSafe(supabase, 'admin_update_unit_status', { p_unit_id: unitId, p_status: status })
    load()
  }

  if (!supplier) return <Loader />

  const accent = supplier?.theme?.accent || '#059669'
  const counts = units.reduce((a: any, u: any) => { a[u.status] = (a[u.status] || 0) + 1; return a }, {})
  const shown = filter === 'all' ? units : units.filter((u) => u.status === filter)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#059669] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase mb-1" style={{ color: accent }}>VEHICLE AGENCY · SHOWROOM</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">المعرض · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{units.length} وحدة</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setAddOpen(true)} className="px-3 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1" style={{ backgroundColor: accent }}><Plus className="w-4 h-4" /> ضيف للمعرض</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
          <div className="flex items-center gap-1 mt-3 flex-wrap">
            {['all', 'in_transit', 'in_stock', 'reserved', 'sold'].map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all"
                style={filter === f ? { backgroundColor: accent, color: '#fff' } : { backgroundColor: '#FAFAF7', color: '#6B7280' }}>
                {f === 'all' ? `الكل (${units.length})` : `${STATUS[f].label} (${counts[f] || 0})`}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {loading ? (
            <div className="col-span-3 py-12 text-center"><Loader2 className="w-6 h-6 animate-spin inline" style={{ color: accent }} /></div>
          ) : shown.length === 0 ? (
            <div className="col-span-3 py-12 text-center bg-white rounded-2xl border border-gray-100">
              <Car className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
              <p className="text-sm font-bold text-[#1A2E26]">مفيش وحدات</p>
              <p className="text-xs text-[#6B7280] mt-1">ضيف وحدة من زر «ضيف للمعرض» فوق، أو هتيجي من تاب «الاستيراد» بعد الإفراج</p>
            </div>
          ) : shown.map((u: any) => {
            const st = STATUS[u.status] || { label: u.status, color: 'bg-gray-100 text-gray-600' }
            return (
              <div key={u.id} className="bg-white rounded-2xl border border-gray-100 p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-black text-[#1A2E26] truncate">{u.brand || '—'} · {u.model || '—'}</h3>
                    <p className="text-xs text-[#6B7280]">{u.model_year || ''} {u.color ? `· ${u.color}` : ''} {u.vehicle_type ? `· ${VTYPE[u.vehicle_type] || u.vehicle_type}` : ''}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${st.color}`}>{st.label}</span>
                </div>
                <div className="space-y-0.5 text-[11px] text-[#6B7280] font-mono">
                  {u.chassis_no && <p>شاسيه: {u.chassis_no}</p>}
                  {u.engine_no && <p>موتور: {u.engine_no}</p>}
                  {u.consignment_ref && <p>شحنة: {u.consignment_ref}</p>}
                </div>
                <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                  <div>
                    <p className="text-[9px] text-[#6B7280] uppercase">سعر البيع</p>
                    <p className="text-sm font-mono font-black" style={{ color: accent }}>{u.sale_price_egp ? `${Number(u.sale_price_egp).toLocaleString('ar-EG')} ج` : '—'}</p>
                  </div>
                  {u.customer_name && (
                    <div className="text-left">
                      <p className="text-[9px] text-[#6B7280] uppercase flex items-center gap-1 justify-end"><User className="w-2.5 h-2.5" /> العميل</p>
                      <p className="text-xs text-[#1A2E26]">{u.customer_name}</p>
                    </div>
                  )}
                </div>
                {u.status !== 'sold' && (
                  <div className="mt-3 flex items-center gap-1.5">
                    {u.status !== 'in_stock' && <button onClick={() => setStatus(u.id, 'in_stock')} className="flex-1 py-1.5 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#1A2E26]">للمعرض</button>}
                    {u.status !== 'reserved' && <button onClick={() => setStatus(u.id, 'reserved')} className="flex-1 py-1.5 rounded-lg bg-[#FAFAF7] text-[11px] font-bold text-[#1A2E26]">احجز</button>}
                    <button onClick={() => setSellUnit(u)} className="flex-1 py-1.5 rounded-lg text-[11px] font-bold text-white" style={{ backgroundColor: accent }}>بيع</button>
                  </div>
                )}
              </div>
            )
          })}
        </section>
      </main>

      {sellUnit && <SellModal unit={sellUnit} accent={accent} onClose={() => setSellUnit(null)} onSaved={() => { setSellUnit(null); load() }} />}
      {addOpen && <AddModal supplierId={supplierId} accent={accent} onClose={() => setAddOpen(false)} onSaved={() => { setAddOpen(false); load() }} />}
    </div>
  )
}

function SellModal({ unit, accent = '#059669', onClose, onSaved }: any) {
  const [form, setForm] = useState({ sale_price_egp: unit.sale_price_egp || '', customer_name: '', customer_phone: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.sale_price_egp) return alert('اكتب سعر البيع')
    setSaving(true)
    await rpcSafe(supabase, 'admin_update_unit_status', {
      p_unit_id: unit.id,
      p_status: 'sold',
      p_sale_price_egp: Number(form.sale_price_egp),
      p_customer_name: form.customer_name || null,
      p_customer_phone: form.customer_phone || null,
    })
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">بيع: {unit.brand} {unit.model}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="سعر البيع (ج) *"><input type="number" value={form.sale_price_egp} onChange={e => setForm({ ...form, sale_price_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <Field label="اسم العميل"><input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <Field label="موبايل العميل"><input type="tel" value={form.customer_phone} onChange={e => setForm({ ...form, customer_phone: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-50" style={{ backgroundColor: accent }}>{saving ? 'جاري الحفظ...' : 'أكّد البيع'}</button>
        </div>
      </div>
    </div>
  )
}

function AddModal({ supplierId, accent = '#059669', onClose, onSaved }: any) {
  const [form, setForm] = useState({ vehicle_type: 'motorcycle', brand: '', model: '', model_year: '', color: '', sale_price_egp: '', chassis_no: '', engine_no: '', image_url: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.brand && !form.model) return alert('اكتب الماركة أو الموديل على الأقل')
    setSaving(true)
    const { error } = await supabase.rpc('admin_add_vehicle_unit', {
      p_supplier_id: supplierId,
      p_vehicle_type: form.vehicle_type,
      p_brand: form.brand || null,
      p_model: form.model || null,
      p_model_year: form.model_year ? Number(form.model_year) : null,
      p_color: form.color || null,
      p_sale_price_egp: form.sale_price_egp ? Number(form.sale_price_egp) : null,
      p_chassis_no: form.chassis_no || null,
      p_engine_no: form.engine_no || null,
      p_image_url: form.image_url || null,
      p_status: 'in_stock',
    })
    setSaving(false)
    if (error) return alert('خطأ: ' + error.message)
    onSaved()
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 shadow-2xl max-h-[90vh] overflow-y-auto">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white">
          <h2 className="text-lg font-black text-[#1A2E26]">ضيف وحدة للمعرض</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="نوع المركبة *">
            <select value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              <option value="motorcycle">موتوسيكل</option>
              <option value="jetski">جيت سكي</option>
              <option value="marine">مركب</option>
              <option value="watercraft">مركب بحري</option>
              <option value="car">عربية</option>
              <option value="tricycle">تروسيكل</option>
              <option value="bicycle">دراجة</option>
              <option value="bus">أوتوبيس</option>
              <option value="other">أخرى</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="الماركة"><input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
            <Field label="الموديل"><input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السنة"><input type="number" value={form.model_year} onChange={e => setForm({ ...form, model_year: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
            <Field label="اللون"><input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          </div>
          <Field label="سعر البيع (ج)"><input type="number" value={form.sale_price_egp} onChange={e => setForm({ ...form, sale_price_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="رقم الشاسيه"><input type="text" value={form.chassis_no} onChange={e => setForm({ ...form, chassis_no: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
            <Field label="رقم الموتور"><input type="text" value={form.engine_no} onChange={e => setForm({ ...form, engine_no: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
          </div>
          <Field label="رابط الصورة — لو حطيتها الوحدة هتتنشر على الموقع كمان"><input type="url" dir="ltr" value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl text-white font-black text-sm disabled:opacity-50" style={{ backgroundColor: accent }}>{saving ? 'جاري الحفظ...' : 'ضيف للمعرض'}</button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#059669] animate-spin" /></div> }
