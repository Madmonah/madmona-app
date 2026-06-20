'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Plus, X, Ship, ChevronDown, ArrowLeft, FileText, Pencil } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const num = (n: any) => Number(n || 0).toLocaleString()

const STAGES: [string, string][] = [
  ['proforma', 'عرض سعر'],
  ['lc', 'اعتماد'],
  ['form4', 'استمارة 4'],
  ['nafeza', 'نافذة'],
  ['shipping', 'شحن'],
  ['customs', 'جمارك'],
  ['released', 'إفراج'],
]
const stageIndex = (s: string) => STAGES.findIndex(([k]) => k === s)

export default function ImportPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [rows, setRows] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [addUnitFor, setAddUnitFor] = useState<string | null>(null)
  const [editFor, setEditFor] = useState<any | null>(null)
  const [expanded, setExpanded] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: list } = await supabase.rpc('admin_list_import_consignments', { p_supplier_id: supplierId })
    setRows(Array.isArray(list) ? list : [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function advance(c: any) {
    const i = stageIndex(c.stage)
    if (i < 0 || i >= STAGES.length - 1) return
    const next = STAGES[i + 1][0]
    // @ts-expect-error
    await supabase.rpc('admin_update_consignment_stage', { p_consignment_id: c.id, p_stage: next })
    load()
  }

  if (!supplier) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">VEHICLE AGENCY · IMPORT</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الاستيراد · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{rows.length} شحنة · proforma ← اعتماد L/C ← استمارة 4 ← نافذة ← شحن ← جمارك ← إفراج</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2"><Plus className="w-4 h-4" /> شحنة جديدة</button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-3">
        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
        ) : rows.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
            <Ship className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش شحنات استيراد</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">أضف أول شحنة</button>
          </div>
        ) : rows.map((c: any) => {
          const ci = stageIndex(c.stage)
          const isOpen = expanded === c.id
          return (
            <div key={c.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-[#1A2E26]">{c.ref || 'بدون رقم'}</h3>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#FAFAF7] text-[#1A2E26]">{c.vehicle_type === 'motorcycle' ? 'موتوسيكلات' : 'عربيات'}</span>
                    </div>
                    <p className="text-xs text-[#6B7280] mt-0.5">
                      {c.foreign_supplier || '—'} {c.origin_country ? `· ${c.origin_country}` : ''} · {c.units_count} وحدة
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-[#6B7280] uppercase">قيمة الـ proforma</p>
                    <p className="text-sm font-mono font-black text-[#1A2E26]">{c.proforma_amount ? `${num(c.proforma_amount)} ${c.currency}` : '—'}</p>
                  </div>
                </div>

                {/* Stage pipeline */}
                <div className="flex items-center gap-1 mb-3 overflow-x-auto pb-1">
                  {STAGES.map(([k, label], i) => (
                    <div key={k} className="flex items-center gap-1 shrink-0">
                      <div className={`px-2.5 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap ${
                        i < ci ? 'bg-[#1F6F5F]/10 text-[#1F6F5F]' :
                        i === ci ? 'bg-[#1F6F5F] text-white' :
                        'bg-[#FAFAF7] text-[#6B7280]'
                      }`}>{label}</div>
                      {i < STAGES.length - 1 && <div className={`w-3 h-0.5 ${i < ci ? 'bg-[#1F6F5F]' : 'bg-gray-200'}`} />}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {c.stage !== 'released' && (
                    <button onClick={() => advance(c)} className="px-3 py-1.5 rounded-lg bg-[#1F6F5F] text-white text-xs font-bold flex items-center gap-1">
                      <ArrowLeft className="w-3 h-3" /> المرحلة التالية
                    </button>
                  )}
                  <button onClick={() => setEditFor(c)} className="px-3 py-1.5 rounded-lg bg-[#1F6F5F]/10 text-[#1F6F5F] text-xs font-bold flex items-center gap-1">
                    <Pencil className="w-3 h-3" /> تعديل التفاصيل
                  </button>
                  <button onClick={() => setAddUnitFor(c.id)} className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-[#1A2E26] text-xs font-bold flex items-center gap-1">
                    <Plus className="w-3 h-3" /> أضف وحدة
                  </button>
                  <button onClick={() => setExpanded(isOpen ? null : c.id)} className="px-3 py-1.5 rounded-lg bg-[#FAFAF7] text-[#6B7280] text-xs font-bold flex items-center gap-1">
                    <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} /> {isOpen ? 'إخفاء' : 'عرض'} الملف
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-gray-100 bg-[#FAFAF7]/40">
                  {/* import file: proforma + L/C + form4 + nafeza + shipping + customs */}
                  <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    <Section title="الـ Proforma (تفصيلي)" icon={<FileText className="w-3.5 h-3.5" />}>
                      <Row label="المورّد الأجنبي" value={c.foreign_supplier} />
                      <Row label="بلد المنشأ" value={c.origin_country} />
                      <Row label="رقم الـ proforma" value={c.proforma_no} />
                      <Row label="التاريخ" value={c.proforma_date} />
                      <Row label="القيمة" value={c.proforma_amount ? `${num(c.proforma_amount)} ${c.currency || ''}` : ''} />
                      <Row label="Incoterm" value={c.incoterm} />
                      <Row label="ميناء الشحن ← الوصول" value={[c.port_loading, c.port_discharge].filter(Boolean).join(' ← ')} />
                      <Row label="شروط الدفع" value={c.payment_terms} />
                      <Row label="بنك المستفيد" value={c.beneficiary_bank} />
                    </Section>
                    <Section title="الاعتماد المستندي L/C">
                      <Row label="رقم L/C" value={c.lc_no} />
                      <Row label="البنك" value={c.lc_bank} />
                      <Row label="التاريخ" value={c.lc_date} />
                      <Row label="قيمة الاعتماد" value={c.lc_amount ? `${num(c.lc_amount)} ${c.currency || ''}` : ''} />
                    </Section>
                    <Section title="استمارة ٤">
                      <Row label="رقم الاستمارة" value={c.form4_no} />
                      <Row label="التاريخ" value={c.form4_date} />
                    </Section>
                    <Section title="نافذة · NAFEZA / ACID">
                      <Row label="رقم ACID" value={c.nafeza_acid} />
                      <Row label="التاريخ" value={c.nafeza_date} />
                    </Section>
                    <Section title="الشحن">
                      <Row label="بوليصة الشحن B/L" value={c.bl_no} />
                      <Row label="الباخرة" value={c.vessel} />
                      <Row label="ETD ← ETA" value={[c.etd, c.eta].filter(Boolean).join(' ← ')} />
                    </Section>
                    <Section title="الجمارك">
                      <Row label="رقم البيان الجمركي" value={c.customs_decl_no} />
                      <Row label="الرسوم" value={c.customs_fees_egp ? `${num(c.customs_fees_egp)} ج` : ''} />
                      <Row label="تاريخ الإفراج" value={c.release_date} />
                    </Section>
                  </div>

                  {/* line items (units) */}
                  <div className="px-4 pb-2">
                    <p className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1 flex items-center justify-between">
                      <span>بنود الـ proforma (الوحدات)</span>
                      <span className="font-mono text-[#1F6F5F]">إجمالي FOB: {c.total_fob ? `${num(c.total_fob)} ${c.currency || ''}` : '—'}</span>
                    </p>
                  </div>
                  <div className="border-t border-gray-100 divide-y divide-gray-100">
                    {(c.units || []).length === 0 ? (
                      <p className="px-4 py-3 text-xs text-[#6B7280]">مفيش وحدات مضافة بعد.</p>
                    ) : (c.units || []).map((u: any) => (
                      <div key={u.id} className="px-4 py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-[#1A2E26]">{u.brand || '—'} {u.model || ''}</span>
                          <span className="text-[#6B7280]"> · {u.model_year || ''} {u.color ? `· ${u.color}` : ''}</span>
                          {u.chassis_no && <span className="text-[#6B7280] font-mono block text-[10px]">شاسيه: {u.chassis_no}</span>}
                        </div>
                        <span className="font-mono text-[#1F6F5F] font-bold">{u.unit_fob ? `${num(u.unit_fob)} fob` : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </main>

      {showAdd && <AddConsignmentModal supplierId={supplierId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {addUnitFor && <AddUnitModal consignmentId={addUnitFor} onClose={() => setAddUnitFor(null)} onSaved={() => { setAddUnitFor(null); load() }} />}
      {editFor && <EditDetailsModal consignment={editFor} onClose={() => setEditFor(null)} onSaved={() => { setEditFor(null); load() }} />}
    </div>
  )
}

function AddConsignmentModal({ supplierId, onClose, onSaved }: any) {
  const [form, setForm] = useState({ ref: '', vehicle_type: 'motorcycle', foreign_supplier: '', origin_country: '', currency: 'USD', proforma_no: '', proforma_amount: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.ref) return alert('اكتب رقم/مرجع الشحنة')
    setSaving(true)
    // @ts-expect-error
    await supabase.rpc('admin_create_import_consignment', {
      p_supplier_id: supplierId,
      p_ref: form.ref,
      p_vehicle_type: form.vehicle_type,
      p_foreign_supplier: form.foreign_supplier || null,
      p_origin_country: form.origin_country || null,
      p_currency: form.currency || 'USD',
      p_proforma_no: form.proforma_no || null,
      p_proforma_amount: form.proforma_amount ? Number(form.proforma_amount) : null,
    })
    onSaved()
  }
  return (
    <Modal title="شحنة استيراد جديدة" onClose={onClose}>
      <Field label="رقم/مرجع الشحنة *"><input type="text" value={form.ref} onChange={e => setForm({ ...form, ref: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      <Field label="نوع المركبة">
        <select value={form.vehicle_type} onChange={e => setForm({ ...form, vehicle_type: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
          <option value="motorcycle">موتوسيكلات</option>
          <option value="car">عربيات</option>
        </select>
      </Field>
      <Field label="المورّد الأجنبي"><input type="text" value={form.foreign_supplier} onChange={e => setForm({ ...form, foreign_supplier: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="بلد المنشأ"><input type="text" value={form.origin_country} onChange={e => setForm({ ...form, origin_country: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
        <Field label="العملة"><input type="text" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="رقم الـ proforma"><input type="text" value={form.proforma_no} onChange={e => setForm({ ...form, proforma_no: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
        <Field label="قيمة الـ proforma"><input type="number" value={form.proforma_amount} onChange={e => setForm({ ...form, proforma_amount: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
      </div>
      <p className="text-[10px] text-[#6B7280]">باقي التفاصيل (L/C · استمارة ٤ · نافذة · شحن · جمارك) تتسجّل من «تعديل التفاصيل» بعد الإنشاء.</p>
      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'احفظ'}</button>
    </Modal>
  )
}

function EditDetailsModal({ consignment: c, onClose, onSaved }: any) {
  const [f, setF] = useState<any>({
    foreign_supplier: c.foreign_supplier || '', origin_country: c.origin_country || '', currency: c.currency || 'USD',
    proforma_no: c.proforma_no || '', proforma_date: c.proforma_date || '', proforma_amount: c.proforma_amount || '',
    incoterm: c.incoterm || '', port_loading: c.port_loading || '', port_discharge: c.port_discharge || '',
    payment_terms: c.payment_terms || '', beneficiary_bank: c.beneficiary_bank || '',
    lc_no: c.lc_no || '', lc_bank: c.lc_bank || '', lc_date: c.lc_date || '', lc_amount: c.lc_amount || '',
    form4_no: c.form4_no || '', form4_date: c.form4_date || '',
    nafeza_acid: c.nafeza_acid || '', nafeza_date: c.nafeza_date || '',
    bl_no: c.bl_no || '', vessel: c.vessel || '', etd: c.etd || '', eta: c.eta || '',
    customs_decl_no: c.customs_decl_no || '', customs_fees_egp: c.customs_fees_egp || '', release_date: c.release_date || '',
    notes: c.notes || '',
  })
  const [saving, setSaving] = useState(false)
  const set = (k: string) => (e: any) => setF({ ...f, [k]: e.target.value })
  async function save() {
    setSaving(true)
    // @ts-expect-error
    await supabase.rpc('admin_update_consignment_details', { p_consignment_id: c.id, p_patch: f })
    onSaved()
  }
  return (
    <Modal title={`تفاصيل ملف الاستيراد · ${c.ref || ''}`} onClose={onClose}>
      <Group title="الـ Proforma (تفصيلي)">
        <Field label="المورّد الأجنبي"><input value={f.foreign_supplier} onChange={set('foreign_supplier')} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="بلد المنشأ"><input value={f.origin_country} onChange={set('origin_country')} className={inp} /></Field>
          <Field label="العملة"><input value={f.currency} onChange={set('currency')} className={inpMono} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="رقم الـ proforma"><input value={f.proforma_no} onChange={set('proforma_no')} className={inp} /></Field>
          <Field label="تاريخ الـ proforma"><input type="date" value={f.proforma_date} onChange={set('proforma_date')} className={inpMono} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="القيمة"><input type="number" value={f.proforma_amount} onChange={set('proforma_amount')} className={inpMono} /></Field>
          <Field label="Incoterm (FOB/CIF…)"><input value={f.incoterm} onChange={set('incoterm')} className={inp} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="ميناء الشحن"><input value={f.port_loading} onChange={set('port_loading')} className={inp} /></Field>
          <Field label="ميناء الوصول"><input value={f.port_discharge} onChange={set('port_discharge')} className={inp} /></Field>
        </div>
        <Field label="شروط الدفع"><input value={f.payment_terms} onChange={set('payment_terms')} className={inp} placeholder="مثال: 100% L/C at sight" /></Field>
        <Field label="بنك المستفيد"><input value={f.beneficiary_bank} onChange={set('beneficiary_bank')} className={inp} /></Field>
      </Group>

      <Group title="الاعتماد المستندي L/C">
        <div className="grid grid-cols-2 gap-2">
          <Field label="رقم L/C"><input value={f.lc_no} onChange={set('lc_no')} className={inp} /></Field>
          <Field label="البنك الفاتح"><input value={f.lc_bank} onChange={set('lc_bank')} className={inp} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="تاريخ الفتح"><input type="date" value={f.lc_date} onChange={set('lc_date')} className={inpMono} /></Field>
          <Field label="قيمة الاعتماد"><input type="number" value={f.lc_amount} onChange={set('lc_amount')} className={inpMono} /></Field>
        </div>
      </Group>

      <Group title="استمارة ٤">
        <div className="grid grid-cols-2 gap-2">
          <Field label="رقم الاستمارة"><input value={f.form4_no} onChange={set('form4_no')} className={inp} /></Field>
          <Field label="التاريخ"><input type="date" value={f.form4_date} onChange={set('form4_date')} className={inpMono} /></Field>
        </div>
      </Group>

      <Group title="نافذة · NAFEZA / ACID">
        <div className="grid grid-cols-2 gap-2">
          <Field label="رقم ACID"><input value={f.nafeza_acid} onChange={set('nafeza_acid')} className={inpMono} /></Field>
          <Field label="التاريخ"><input type="date" value={f.nafeza_date} onChange={set('nafeza_date')} className={inpMono} /></Field>
        </div>
      </Group>

      <Group title="الشحن">
        <div className="grid grid-cols-2 gap-2">
          <Field label="بوليصة الشحن B/L"><input value={f.bl_no} onChange={set('bl_no')} className={inp} /></Field>
          <Field label="الباخرة"><input value={f.vessel} onChange={set('vessel')} className={inp} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="ETD"><input type="date" value={f.etd} onChange={set('etd')} className={inpMono} /></Field>
          <Field label="ETA"><input type="date" value={f.eta} onChange={set('eta')} className={inpMono} /></Field>
        </div>
      </Group>

      <Group title="الجمارك">
        <Field label="رقم البيان الجمركي"><input value={f.customs_decl_no} onChange={set('customs_decl_no')} className={inp} /></Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="الرسوم (ج)"><input type="number" value={f.customs_fees_egp} onChange={set('customs_fees_egp')} className={inpMono} /></Field>
          <Field label="تاريخ الإفراج"><input type="date" value={f.release_date} onChange={set('release_date')} className={inpMono} /></Field>
        </div>
      </Group>

      <Field label="ملاحظات"><textarea value={f.notes} onChange={set('notes')} rows={2} className={inp} /></Field>
      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 sticky bottom-0">{saving ? 'جاري الحفظ...' : 'احفظ التفاصيل'}</button>
    </Modal>
  )
}

function AddUnitModal({ consignmentId, onClose, onSaved }: any) {
  const [form, setForm] = useState({ brand: '', model: '', model_year: '', color: '', chassis_no: '', engine_no: '', unit_fob: '', sale_price_egp: '' })
  const [saving, setSaving] = useState(false)
  async function save() {
    if (!form.model && !form.brand) return alert('اكتب البراند أو الموديل')
    setSaving(true)
    // @ts-expect-error
    await supabase.rpc('admin_add_import_unit', {
      p_consignment_id: consignmentId,
      p_brand: form.brand || null,
      p_model: form.model || null,
      p_model_year: form.model_year ? Number(form.model_year) : null,
      p_color: form.color || null,
      p_chassis_no: form.chassis_no || null,
      p_engine_no: form.engine_no || null,
      p_unit_fob: form.unit_fob ? Number(form.unit_fob) : null,
      p_sale_price_egp: form.sale_price_egp ? Number(form.sale_price_egp) : null,
    })
    onSaved()
  }
  return (
    <Modal title="إضافة وحدة للشحنة" onClose={onClose}>
      <div className="grid grid-cols-2 gap-2">
        <Field label="البراند"><input type="text" value={form.brand} onChange={e => setForm({ ...form, brand: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
        <Field label="الموديل"><input type="text" value={form.model} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Field label="سنة الصنع"><input type="number" value={form.model_year} onChange={e => setForm({ ...form, model_year: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
        <Field label="اللون"><input type="text" value={form.color} onChange={e => setForm({ ...form, color: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" /></Field>
      </div>
      <Field label="رقم الشاسيه"><input type="text" value={form.chassis_no} onChange={e => setForm({ ...form, chassis_no: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
      <Field label="رقم الموتور"><input type="text" value={form.engine_no} onChange={e => setForm({ ...form, engine_no: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
      <div className="grid grid-cols-2 gap-2">
        <Field label="تكلفة FOB"><input type="number" value={form.unit_fob} onChange={e => setForm({ ...form, unit_fob: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
        <Field label="سعر البيع (ج)"><input type="number" value={form.sale_price_egp} onChange={e => setForm({ ...form, sale_price_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" /></Field>
      </div>
      <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50">{saving ? 'جاري الحفظ...' : 'احفظ'}</button>
    </Modal>
  )
}

const inp = 'w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm'
const inpMono = 'w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono'

function Group({ title, children }: any) {
  return (
    <div className="rounded-2xl border border-gray-100 p-3 space-y-3">
      <p className="text-[11px] font-black text-[#1F6F5F]">{title}</p>
      {children}
    </div>
  )
}
function Section({ title, icon, children }: any) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-3">
      <p className="text-[10px] font-black tracking-wider uppercase text-[#1F6F5F] mb-2 flex items-center gap-1">{icon} {title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  )
}
function Row({ label, value }: any) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[#6B7280]">{label}</span>
      <span className={`font-bold ${value ? 'text-[#1A2E26]' : 'text-gray-300'}`}>{value || '—'}</span>
    </div>
  )
}

function Modal({ title, onClose, children }: any) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
          <h2 className="text-lg font-black text-[#1A2E26]">{title}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
