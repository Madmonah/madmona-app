'use client'
// ============================================================================
// 🚚 النقل والشحن — سيارات الشركة · أوامر تشغيل السيارات · شحنات للعملاء (١٢ سبتمبر ٢٠٢٦)
// محمد: «هل بند المواصلات وأوامر تشغيل السيارات والشحن معمول حسابه في الموديل؟» — ماكانوش → ده الموديول.
// البابين (financeRpc + p_token): business_transport_bundle · business_vehicle_save/delete ·
// business_vehicle_order_save/delete · business_shipment_save/delete.
// أمر التشغيل لما يخلص (done) وفيه تكلفة → مصروف «مواصلات» في المصاريف لوحده (مرة واحدة).
// شحنة بشركة خارجية لما تتسلّم وفيها تكلفة → مصروف «مواصلات» كمان. صفر أرقام مخترعة.
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, X, ChevronLeft, Trash2, RefreshCw, Truck, Route, PackageCheck } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'
import { currencyLabel } from '@/lib/currency'

type Tab = 'vehicles' | 'orders' | 'shipments'
type Emp = { id: string; name: string }
type Vehicle = { id: string; name: string; plate: string | null; vehicle_type: string; driver_employee_id: string | null; driver_name: string | null; license_expiry: string | null; insurance_expiry: string | null; odometer_km: number | null; status: string; notes: string | null }
type VOrder = { id: string; vehicle_id: string | null; vehicle_name: string | null; driver_employee_id: string | null; driver_name: string | null; purpose: string; from_location: string | null; to_location: string | null; scheduled_at: string | null; ended_at: string | null; km_start: number | null; km_end: number | null; km: number | null; fuel_cost: number; allowance_amount: number; other_cost: number; total_cost: number; status: string; expense_id: string | null; notes: string | null; order_id: string | null }
type Shipment = { id: string; order_id: string | null; customer_name: string | null; customer_phone: string | null; address: string | null; city: string | null; carrier_type: string; vehicle_order_id: string | null; carrier_name: string | null; tracking_no: string | null; cost: number; charged_to_customer: number; status: string; expense_id: string | null; notes: string | null; shipped_at: string | null; delivered_at: string | null }
type OpenOrder = { id: string; label: string; address: string | null; city: string | null; phone: string | null }
type Bundle = { ok: boolean; error?: string; business?: { business_name: string; currency: string }; employees: Emp[]; vehicles: Vehicle[]; orders: VOrder[]; shipments: Shipment[]; open_orders: OpenOrder[]; month_cost: number }

const VT: Record<string, string> = { car: 'ملاكي', van: 'فان', truck: 'نقل', motorcycle: 'موتوسيكل', other: 'أخرى' }
const PURPOSE: Record<string, string> = { delivery: 'توصيل لعميل', transport: 'نقل بضاعة/خامات', errand: 'مأمورية', site: 'موقع/فرع', other: 'أخرى' }
const OST: Record<string, string> = { planned: 'مخطط', running: 'ماشي', done: 'خلص ✓', cancelled: 'ملغي' }
const CARRIER: Record<string, string> = { own_vehicle: 'عربية الشركة', madmona_rider: 'طيار مضمونة', external: 'شركة شحن' }
const SST: Record<string, string> = { pending: 'مستني', shipped: 'اتشحن', delivered: 'اتسلّم ✓', returned: 'مرتجع', cancelled: 'ملغي' }
const INP = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-[16px] bg-white'
const F = ({ label, children }: { label: string; children: React.ReactNode }) => (<label className="block text-sm"><span className="block text-xs font-bold text-gray-600 mb-1">{label}</span>{children}</label>)
const fmt = (n: number | null | undefined) => Number(n || 0).toLocaleString('ar-EG')
const dt = (s: string | null | undefined) => s ? new Date(s).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : '—'
const toLocal = (s: string | null | undefined) => s ? new Date(s).toISOString().slice(0, 16) : ''

export default function TransportPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [tab, setTab] = useState<Tab>(() => { try { const t = new URLSearchParams(window.location.search).get('tab'); return t === 'orders' || t === 'shipments' ? t : 'vehicles' } catch { return 'vehicles' } })
  const [b, setB] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [vForm, setVForm] = useState<Partial<Vehicle> | null>(null)
  const [oForm, setOForm] = useState<Partial<VOrder> | null>(null)
  const [sForm, setSForm] = useState<Partial<Shipment> | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const { data, error } = await financeRpc('business_transport_bundle', { p_supplier_id: supplierId })
    if (error || !data?.ok) setErr(error?.message || data?.error || 'مش قادرين نحمّل')
    else setB(data)
    setLoading(false)
  }, [supplierId])
  useEffect(() => { void load() }, [load])
  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 6000) }
  const cur = currencyLabel(b?.business?.currency)

  async function call(fn: string, args: Record<string, unknown>, ok: string) {
    setBusy(true)
    const { data, error } = await financeRpc(fn, { p_supplier_id: supplierId, ...args })
    setBusy(false)
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتعملش'); return false }
    flash(ok); void load(); return true
  }
  const saveVehicle = async () => { if (!vForm?.name?.trim()) return alert('اكتب اسم العربية'); if (await call('business_vehicle_save', { p_vehicle: vForm }, '✅ اتحفظت')) setVForm(null) }
  const saveOrder = async () => {
    if (await call('business_vehicle_order_save', { p_order: oForm }, oForm?.status === 'done' ? '✅ خلص — التكلفة اتقيّدت في المصاريف (مواصلات)' : '✅ اتحفظ')) setOForm(null)
  }
  const saveShip = async () => { if (await call('business_shipment_save', { p_ship: sForm }, '✅ اتحفظت')) setSForm(null) }

  const TabBtn = ({ k, label }: { k: Tab; label: string }) => (
    <button onClick={() => setTab(k)} className={`flex-1 py-2.5 rounded-xl text-sm font-black ${tab === k ? 'bg-[#04352A] text-white' : 'bg-white text-[#1A2E26] border border-gray-200'}`}>{label}</button>
  )
  const Modal = ({ title, onClose, onSave, children }: { title: string; onClose: () => void; onSave: () => void; children: React.ReactNode }) => (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-3" onClick={onClose}>
      <div className="bg-white rounded-3xl w-full max-w-lg max-h-[92vh] overflow-y-auto p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between"><h3 className="font-black">{title}</h3><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        {children}
        <button disabled={busy} onClick={onSave} className="w-full bg-[#04352A] text-white font-black rounded-2xl py-3 disabled:opacity-50">{busy ? '…' : 'حفظ'}</button>
      </div>
    </div>
  )
  const Empty = ({ icon, text }: { icon: React.ReactNode; text: string }) => (<div className="rounded-2xl border border-dashed border-gray-300 p-8 text-center text-gray-500 text-sm"><div className="flex justify-center mb-2 text-gray-400">{icon}</div>{text}</div>)
  const Del = ({ onClick }: { onClick: () => void }) => (<button onClick={onClick} className="p-2 rounded-xl text-red-500 hover:bg-red-50"><Trash2 className="w-4 h-4" /></button>)

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">TRANSPORT</p>
              <h1 className="text-2xl font-black text-[#1A2E26]">النقل والشحن{b?.business?.business_name ? ` · ${b.business.business_name}` : ''}</h1>
              <p className="text-[11px] text-[#6B7280] mt-1">سيارات الشركة → أمر تشغيل لكل مشوار (بنزين · بدل · كيلومترات) → التكلفة بتتقيّد في المصاريف لوحدها · شحنات العملاء بعربيتك أو طيار مضمونة أو شركة شحن.</p>
            </div>
            <div className="text-left">
              <p className="text-[10px] text-gray-500">مواصلات الشهر</p>
              <p className="font-black text-[#04352A]">{fmt(b?.month_cost)} {cur}</p>
            </div>
            <button onClick={() => void load()} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="flex gap-2 mt-3">
            <TabBtn k="vehicles" label="🚗 السيارات" />
            <TabBtn k="orders" label="🧭 أوامر التشغيل" />
            <TabBtn k="shipments" label="📦 الشحنات" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-3">
        {msg && <p className="text-xs font-bold text-[#04352A] bg-[#34D399]/20 rounded-xl px-3 py-2">{msg}</p>}
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{err}</p>}
        {loading && !b ? <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#059669] animate-spin inline" /></div> : b && (
          <>
            {tab === 'vehicles' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#6B7280]">{b.vehicles.length} عربية</p>
                  <button onClick={() => setVForm({ vehicle_type: 'car', status: 'active', odometer_km: 0 })} className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1"><Plus className="w-4 h-4" /> ضيف عربية</button>
                </div>
                {b.vehicles.length === 0 && <Empty icon={<Truck className="w-8 h-8" />} text="مفيش عربيات لسه — ضيف أول عربية بسائقها ورخصتها" />}
                {b.vehicles.map(v => {
                  const soon = [v.license_expiry, v.insurance_expiry].some(d => d && (new Date(d).getTime() - Date.now()) < 30 * 86400000)
                  return (
                    <div key={v.id} className={`rounded-2xl border bg-white p-3 flex items-start gap-3 ${soon ? 'border-amber-300' : 'border-gray-100'}`}>
                      <button className="flex-1 text-right" onClick={() => setVForm(v)}>
                        <p className="font-black">{v.name} <span className="text-xs text-gray-500 font-bold">· {VT[v.vehicle_type] || v.vehicle_type}{v.plate ? ` · ${v.plate}` : ''}</span></p>
                        <p className="text-xs text-gray-600 mt-1">السائق: {v.driver_name || '—'} · العدّاد {fmt(v.odometer_km)} كم · {v.status === 'active' ? 'شغّالة' : v.status === 'maintenance' ? 'في الصيانة' : 'واقفة'}</p>
                        <p className="text-[11px] text-gray-500 mt-0.5">رخصة: {v.license_expiry || '—'} · تأمين: {v.insurance_expiry || '—'}{soon && <span className="text-amber-700 font-bold"> · قرب يخلص</span>}</p>
                      </button>
                      <Del onClick={() => { if (confirm(`تمسح «${v.name}»؟`)) void call('business_vehicle_delete', { p_id: v.id }, 'اتمسحت') }} />
                    </div>
                  )
                })}
              </section>
            )}

            {tab === 'orders' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#6B7280]">{b.orders.length} أمر · {b.orders.filter(o => o.status === 'running').length} ماشي دلوقتي</p>
                  <button onClick={() => setOForm({ purpose: 'transport', status: 'planned', fuel_cost: 0, allowance_amount: 0, other_cost: 0, vehicle_id: b.vehicles[0]?.id || null, driver_employee_id: b.vehicles[0]?.driver_employee_id || null })} className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1"><Plus className="w-4 h-4" /> أمر تشغيل</button>
                </div>
                {b.orders.length === 0 && <Empty icon={<Route className="w-8 h-8" />} text="مفيش أوامر تشغيل — كل مشوار عربية: من فين لفين، السائق، البنزين والبدل، وتتقيّد لوحدها في المصاريف" />}
                {b.orders.map(o => (
                  <div key={o.id} className="rounded-2xl border border-gray-100 bg-white p-3 flex items-start gap-3">
                    <button className="flex-1 text-right" onClick={() => setOForm({ ...o, scheduled_at: toLocal(o.scheduled_at), ended_at: toLocal(o.ended_at) })}>
                      <p className="font-black">{o.vehicle_name || 'بدون عربية'} <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${o.status === 'done' ? 'bg-emerald-100 text-emerald-800' : o.status === 'running' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{OST[o.status]}</span></p>
                      <p className="text-xs text-gray-600 mt-1">{PURPOSE[o.purpose] || o.purpose} · {o.from_location || '—'} ← {o.to_location || '—'} · السائق {o.driver_name || '—'}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">{dt(o.scheduled_at)}{o.km != null ? ` · ${fmt(o.km)} كم` : ''} · التكلفة {fmt(o.total_cost)} {cur}{o.expense_id ? ' · اتقيّدت ✓' : ''}</p>
                    </button>
                    {!o.expense_id && <Del onClick={() => { if (confirm('تمسح الأمر؟')) void call('business_vehicle_order_delete', { p_id: o.id }, 'اتمسح') }} />}
                  </div>
                ))}
              </section>
            )}

            {tab === 'shipments' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#6B7280]">{b.shipments.length} شحنة · {b.shipments.filter(s => s.status === 'pending' || s.status === 'shipped').length} في الطريق</p>
                  <button onClick={() => setSForm({ carrier_type: 'own_vehicle', status: 'pending', cost: 0, charged_to_customer: 0 })} className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1"><Plus className="w-4 h-4" /> شحنة</button>
                </div>
                {b.shipments.length === 0 && <Empty icon={<PackageCheck className="w-8 h-8" />} text="مفيش شحنات — أي أوردر بيخرج لعميل سجّله هنا: بعربيتك، أو طيار مضمونة، أو شركة شحن برقم البوليصة" />}
                {b.shipments.map(s => (
                  <div key={s.id} className="rounded-2xl border border-gray-100 bg-white p-3 flex items-start gap-3">
                    <button className="flex-1 text-right" onClick={() => setSForm(s)}>
                      <p className="font-black">{s.customer_name || 'عميل'} <span className={`text-[11px] px-2 py-0.5 rounded-lg font-bold ${s.status === 'delivered' ? 'bg-emerald-100 text-emerald-800' : s.status === 'shipped' ? 'bg-amber-100 text-amber-800' : 'bg-gray-100 text-gray-600'}`}>{SST[s.status]}</span></p>
                      <p className="text-xs text-gray-600 mt-1">{CARRIER[s.carrier_type]}{s.carrier_name ? ` · ${s.carrier_name}` : ''}{s.tracking_no ? ` · بوليصة ${s.tracking_no}` : ''} · {s.city || ''} {s.address || ''}</p>
                      <p className="text-[11px] text-gray-500 mt-0.5">التكلفة {fmt(s.cost)} {cur} · على العميل {fmt(s.charged_to_customer)} {cur}{s.customer_phone ? ` · ${s.customer_phone}` : ''}</p>
                    </button>
                    {!s.expense_id && <Del onClick={() => { if (confirm('تمسح الشحنة؟')) void call('business_shipment_delete', { p_id: s.id }, 'اتمسحت') }} />}
                  </div>
                ))}
              </section>
            )}
          </>
        )}
      </main>

      {vForm && (
        <Modal title={vForm.id ? 'تعديل عربية' : 'عربية جديدة'} onClose={() => setVForm(null)} onSave={saveVehicle}>
          <F label="الاسم *"><input value={vForm.name || ''} onChange={e => setVForm({ ...vForm, name: e.target.value })} className={INP} placeholder="مثال: بيك أب أبيض" /></F>
          <div className="grid grid-cols-2 gap-2">
            <F label="اللوحة"><input value={vForm.plate || ''} onChange={e => setVForm({ ...vForm, plate: e.target.value })} className={INP} /></F>
            <F label="النوع"><select value={vForm.vehicle_type || 'car'} onChange={e => setVForm({ ...vForm, vehicle_type: e.target.value })} className={INP}>{Object.entries(VT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
          </div>
          <F label="السائق"><select value={vForm.driver_employee_id || ''} onChange={e => setVForm({ ...vForm, driver_employee_id: e.target.value || null })} className={INP}><option value="">—</option>{b?.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></F>
          <div className="grid grid-cols-2 gap-2">
            <F label="انتهاء الرخصة"><input type="date" value={vForm.license_expiry || ''} onChange={e => setVForm({ ...vForm, license_expiry: e.target.value || null })} className={INP} /></F>
            <F label="انتهاء التأمين"><input type="date" value={vForm.insurance_expiry || ''} onChange={e => setVForm({ ...vForm, insurance_expiry: e.target.value || null })} className={INP} /></F>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <F label="العدّاد (كم)"><input type="number" inputMode="decimal" value={vForm.odometer_km ?? 0} onChange={e => setVForm({ ...vForm, odometer_km: Number(e.target.value) })} className={INP} /></F>
            <F label="الحالة"><select value={vForm.status || 'active'} onChange={e => setVForm({ ...vForm, status: e.target.value })} className={INP}><option value="active">شغّالة</option><option value="maintenance">في الصيانة</option><option value="inactive">واقفة</option></select></F>
          </div>
          <F label="ملاحظات"><input value={vForm.notes || ''} onChange={e => setVForm({ ...vForm, notes: e.target.value })} className={INP} /></F>
        </Modal>
      )}

      {oForm && (
        <Modal title={oForm.id ? 'أمر تشغيل' : 'أمر تشغيل جديد'} onClose={() => setOForm(null)} onSave={saveOrder}>
          <div className="grid grid-cols-2 gap-2">
            <F label="العربية"><select value={oForm.vehicle_id || ''} onChange={e => { const v = b?.vehicles.find(x => x.id === e.target.value); setOForm({ ...oForm, vehicle_id: e.target.value || null, driver_employee_id: v?.driver_employee_id || oForm.driver_employee_id || null, km_start: oForm.km_start ?? v?.odometer_km ?? null }) }} className={INP}><option value="">—</option>{b?.vehicles.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}</select></F>
            <F label="السائق"><select value={oForm.driver_employee_id || ''} onChange={e => setOForm({ ...oForm, driver_employee_id: e.target.value || null })} className={INP}><option value="">—</option>{b?.employees.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}</select></F>
          </div>
          <F label="الغرض"><select value={oForm.purpose || 'transport'} onChange={e => setOForm({ ...oForm, purpose: e.target.value })} className={INP}>{Object.entries(PURPOSE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
          <div className="grid grid-cols-2 gap-2">
            <F label="من"><input value={oForm.from_location || ''} onChange={e => setOForm({ ...oForm, from_location: e.target.value })} className={INP} /></F>
            <F label="إلى"><input value={oForm.to_location || ''} onChange={e => setOForm({ ...oForm, to_location: e.target.value })} className={INP} /></F>
          </div>
          <F label="الميعاد"><input type="datetime-local" value={(oForm.scheduled_at as string) || ''} onChange={e => setOForm({ ...oForm, scheduled_at: e.target.value })} className={INP} /></F>
          <div className="grid grid-cols-2 gap-2">
            <F label="عدّاد البداية (كم)"><input type="number" inputMode="decimal" value={oForm.km_start ?? ''} onChange={e => setOForm({ ...oForm, km_start: e.target.value === '' ? null : Number(e.target.value) })} className={INP} /></F>
            <F label="عدّاد النهاية (كم)"><input type="number" inputMode="decimal" value={oForm.km_end ?? ''} onChange={e => setOForm({ ...oForm, km_end: e.target.value === '' ? null : Number(e.target.value) })} className={INP} /></F>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <F label={`بنزين (${cur})`}><input type="number" inputMode="decimal" value={oForm.fuel_cost ?? 0} onChange={e => setOForm({ ...oForm, fuel_cost: Number(e.target.value) })} className={INP} /></F>
            <F label={`بدل السائق (${cur})`}><input type="number" inputMode="decimal" value={oForm.allowance_amount ?? 0} onChange={e => setOForm({ ...oForm, allowance_amount: Number(e.target.value) })} className={INP} /></F>
            <F label={`أخرى (${cur})`}><input type="number" inputMode="decimal" value={oForm.other_cost ?? 0} onChange={e => setOForm({ ...oForm, other_cost: Number(e.target.value) })} className={INP} /></F>
          </div>
          <F label="الحالة"><select value={oForm.status || 'planned'} onChange={e => setOForm({ ...oForm, status: e.target.value })} className={INP} disabled={!!oForm.expense_id}>{Object.entries(OST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
          {oForm.status === 'done' && !oForm.expense_id && <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">لما تحفظ «خلص» التكلفة ({fmt((oForm.fuel_cost || 0) + (oForm.allowance_amount || 0) + (oForm.other_cost || 0))} {cur}) بتتقيّد في المصاريف تحت «مواصلات» وعدّاد العربية بيتحدّث.</p>}
          <F label="ملاحظات"><input value={oForm.notes || ''} onChange={e => setOForm({ ...oForm, notes: e.target.value })} className={INP} /></F>
        </Modal>
      )}

      {sForm && (
        <Modal title={sForm.id ? 'شحنة' : 'شحنة جديدة'} onClose={() => setSForm(null)} onSave={saveShip}>
          {!!b?.open_orders.length && (
            <F label="من أوردر مفتوح (اختياري)"><select value={sForm.order_id || ''} onChange={e => { const o = b.open_orders.find(x => x.id === e.target.value); setSForm({ ...sForm, order_id: e.target.value || null, address: o?.address || sForm.address, city: o?.city || sForm.city, customer_phone: o?.phone || sForm.customer_phone }) }} className={INP}><option value="">—</option>{b.open_orders.map(o => <option key={o.id} value={o.id}>{o.label}</option>)}</select></F>
          )}
          <div className="grid grid-cols-2 gap-2">
            <F label="اسم العميل"><input value={sForm.customer_name || ''} onChange={e => setSForm({ ...sForm, customer_name: e.target.value })} className={INP} /></F>
            <F label="موبايله"><input value={sForm.customer_phone || ''} onChange={e => setSForm({ ...sForm, customer_phone: e.target.value })} inputMode="tel" className={INP} /></F>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <F label="المدينة"><input value={sForm.city || ''} onChange={e => setSForm({ ...sForm, city: e.target.value })} className={INP} /></F>
            <F label="العنوان"><input value={sForm.address || ''} onChange={e => setSForm({ ...sForm, address: e.target.value })} className={INP} /></F>
          </div>
          <F label="طريقة الشحن"><select value={sForm.carrier_type || 'own_vehicle'} onChange={e => setSForm({ ...sForm, carrier_type: e.target.value })} className={INP}>{Object.entries(CARRIER).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
          {sForm.carrier_type === 'own_vehicle' && (
            <F label="أمر التشغيل (العربية والمشوار)"><select value={sForm.vehicle_order_id || ''} onChange={e => setSForm({ ...sForm, vehicle_order_id: e.target.value || null })} className={INP}><option value="">— من غير ربط —</option>{b?.orders.filter(o => o.status !== 'cancelled').map(o => <option key={o.id} value={o.id}>{o.vehicle_name || 'عربية'} · {o.to_location || ''} · {dt(o.scheduled_at)}</option>)}</select></F>
          )}
          {sForm.carrier_type === 'external' && (
            <div className="grid grid-cols-2 gap-2">
              <F label="شركة الشحن"><input value={sForm.carrier_name || ''} onChange={e => setSForm({ ...sForm, carrier_name: e.target.value })} className={INP} /></F>
              <F label="رقم البوليصة"><input value={sForm.tracking_no || ''} onChange={e => setSForm({ ...sForm, tracking_no: e.target.value })} className={INP} dir="ltr" /></F>
            </div>
          )}
          {sForm.carrier_type === 'madmona_rider' && <p className="text-[11px] text-gray-600 bg-[#FAFAF7] rounded-xl px-3 py-2">طيارين مضمونة بيتسعّروا بالمسافة ونوع المركبة من أوردر السوق — سجّل الشحنة هنا للمتابعة.</p>}
          <div className="grid grid-cols-2 gap-2">
            <F label={`تكلفة الشحن عليك (${cur})`}><input type="number" inputMode="decimal" value={sForm.cost ?? 0} onChange={e => setSForm({ ...sForm, cost: Number(e.target.value) })} className={INP} /></F>
            <F label={`المحصّل من العميل (${cur})`}><input type="number" inputMode="decimal" value={sForm.charged_to_customer ?? 0} onChange={e => setSForm({ ...sForm, charged_to_customer: Number(e.target.value) })} className={INP} /></F>
          </div>
          <F label="الحالة"><select value={sForm.status || 'pending'} onChange={e => setSForm({ ...sForm, status: e.target.value })} className={INP} disabled={!!sForm.expense_id}>{Object.entries(SST).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></F>
          {sForm.status === 'delivered' && sForm.carrier_type === 'external' && !sForm.expense_id && Number(sForm.cost) > 0 && <p className="text-[11px] text-emerald-700 bg-emerald-50 rounded-xl px-3 py-2">تكلفة شركة الشحن بتتقيّد في المصاريف تحت «مواصلات» لما تحفظ.</p>}
          <F label="ملاحظات"><input value={sForm.notes || ''} onChange={e => setSForm({ ...sForm, notes: e.target.value })} className={INP} /></F>
        </Modal>
      )}
    </div>
  )
}
