'use client'
// =====================================================================
// 🧩 المنتجات والخدمات — شاشة واحدة بالبابين (٩/٩/٢٠٢٦ — آخر الليل)
//
// محمد: «المنتجات والخدمات بتعلق كل مرة… لازم تتعمل وتدخل جوه السيستم كمنتج نهائي أو خدمة
// نهائية ويبقى ليها احجز/اشتري في واجهة العملاء وتسمع في الماركتبليس».
//
// 🐞 الجذر: الشاشة القديمة كانت مركّبة من /supplier/erp/products (بتعتمد على جلسة Supabase —
//    صاحب البيزنس بتوكن الواتساب مرفوض) وشاشة الخدمات بتقرا suppliers بعميل anon (مقفول من ٢٨/٨
//    → Loader للأبد = «بتعلق»). دي كتابة جديدة كاملة على financeRpc (p_token — البابين):
//    business_catalog_bundle · business_product_save/delete · business_service_save/delete ·
//    toggle_catalog_visibility(p_token) · record_manual_sale · admin_list/set_product_materials.
//
// المنطق: منتج نهائي (sellable) أو خدمة → زرار «يظهر في السوق» بيعمل إعلان منشور (اشتري/احجز
// من واجهة العملاء). الخامات والمستهلكات (material/consumable) داخلية بس وبتتربط بالمنتج/الخدمة.
// =====================================================================
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Plus, X, Eye, EyeOff, ChevronLeft, Trash2, Package, Scissors, Boxes, RefreshCw } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'
import { currencyLabel } from '@/lib/currency'
import ManualSaleModal, { type SaleItem } from '@/components/ManualSaleModal'
import ProductMaterialsModal from '@/components/ProductMaterialsModal'
import CatalogPhotoField from '@/components/CatalogPhotoField'
import ProductsImportModal from '@/components/ProductsImportModal'

type Product = { id: string; name_ar: string; sku: string | null; selling_price_egp: number | null; cost_price_egp: number | null; current_stock: number | null; reorder_threshold: number | null; unit: string | null; active: boolean; notes: string | null; item_class: 'sellable' | 'material' | 'consumable'; publish_to_marketplace: boolean; listing_id: string | null; image_url: string | null }
type Service = { id: string; name_ar: string; category: string | null; price_egp: number | null; duration_minutes: number | null; performer_commission_pct: number | null; status: string; description: string | null; publish_to_marketplace: boolean; listing_id: string | null; image_url: string | null }
type Bundle = { ok: boolean; error?: string; business?: { id: string; business_name: string; industry: string | null; currency: string; is_restaurant: boolean }; products: Product[]; services: Service[] }
type Tab = 'products' | 'services' | 'materials'

const fmt = (n: number | null | undefined) => Number(n || 0).toLocaleString('ar-EG')
const INP = 'w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-[16px] md:text-sm'

export default function ProductsServicesPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [tab, setTab] = useState<Tab>(() => {
    try { const t0 = typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('tab') : null; return t0 === 'services' || t0 === 'materials' ? t0 : 'products' } catch { return 'products' }
  })
  const [b, setB] = useState<Bundle | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [pForm, setPForm] = useState<Partial<Product> | null>(null)
  const [sForm, setSForm] = useState<Partial<Service> | null>(null)
  const [sale, setSale] = useState<SaleItem | null>(null)
  const [comp, setComp] = useState<Product | null>(null)
  const [importOpen, setImportOpen] = useState(false)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    const { data, error } = await financeRpc('business_catalog_bundle', { p_supplier_id: supplierId })
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'مش قادرين نحمّل الكتالوج'); setB({ ok: false, products: [], services: [] }) }
    else setB(data)
    setLoading(false)
  }, [supplierId])
  useEffect(() => { void load() }, [load])

  const flash = (t: string) => { setMsg(t); setTimeout(() => setMsg(null), 6000) }
  const cur = currencyLabel(b?.business?.currency)
  const isRest = !!b?.business?.is_restaurant
  const products = (b?.products || []).filter(p => p.item_class === 'sellable')
  const materials = (b?.products || []).filter(p => p.item_class !== 'sellable')
  const services = b?.services || []

  async function publish(kind: 'product' | 'service', id: string, on: boolean) {
    setBusy(id)
    const { data, error } = await financeRpc('toggle_catalog_visibility', { p_kind: kind, p_item_id: id, p_publish: on })
    setBusy(null)
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتعملش'); return }
    flash(on ? '✅ بقى ظاهر في السوق — العميل يقدر ' + (kind === 'service' ? 'يحجزه' : 'يشتريه') + ' من صفحتك' : 'اتوقف عن العرض في السوق')
    void load()
  }
  async function saveProduct() {
    if (!pForm?.name_ar?.trim()) { alert('اكتب الاسم'); return }
    setBusy('pform')
    const { data, error } = await financeRpc('business_product_save', { p_supplier_id: supplierId, p_product: pForm })
    setBusy(null)
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتحفظش'); return }
    setPForm(null); flash('✅ اتحفظ'); void load()
  }
  async function deleteProduct(p: Product) {
    if (!confirm(`تمسح «${p.name_ar}»؟`)) return
    const { data, error } = await financeRpc('business_product_delete', { p_supplier_id: supplierId, p_id: p.id })
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتمسحش'); return }
    void load()
  }
  async function saveService() {
    if (!sForm?.name_ar?.trim()) { alert('اكتب الاسم'); return }
    setBusy('sform')
    const { data, error } = await financeRpc('business_service_save', { p_supplier_id: supplierId, p_service: sForm })
    setBusy(null)
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتحفظش'); return }
    setSForm(null); flash('✅ اتحفظ'); void load()
  }
  async function deleteService(s: Service) {
    if (!confirm(`تشيل «${s.name_ar}» من القائمة؟`)) return
    const { data, error } = await financeRpc('business_service_delete', { p_supplier_id: supplierId, p_id: s.id })
    if (error || !data?.ok) { alert(error?.message || data?.error || 'ماتشالتش'); return }
    void load()
  }

  const TabBtn = ({ k, label }: { k: Tab; label: string }) => (
    <button onClick={() => setTab(k)} className={`flex-1 py-2.5 rounded-xl text-sm font-black ${tab === k ? 'bg-[#04352A] text-white' : 'bg-white text-[#1A2E26] border border-gray-200'}`}>{label}</button>
  )
  const PublishBtn = ({ kind, id, on }: { kind: 'product' | 'service'; id: string; on: boolean }) => (
    <button onClick={() => void publish(kind, id, !on)} disabled={busy === id}
      className={`shrink-0 flex items-center gap-1 px-2.5 py-2 rounded-xl text-[11px] font-black ${on ? 'bg-[#34D399]/15 text-[#059669]' : 'bg-[#F1EEE6] text-gray-500'}`}>
      {busy === id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : on ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
      {on ? 'في السوق' : 'داخلي'}
    </button>
  )

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] flex items-center gap-1 mb-2"><ChevronLeft className="w-3.5 h-3.5" /> رجوع</Link>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#059669] mb-1">CATALOG</p>
              <h1 className="text-2xl font-black text-[#1A2E26]">المنتجات والخدمات{b?.business?.business_name ? ` · ${b.business.business_name}` : ''}</h1>
              <p className="text-[11px] text-[#6B7280] mt-1">المنتج النهائي والخدمة = اللي العميل بيشتريه أو بيحجزه · الخامة = منتج أولي بيدخل فيهم · «في السوق» = إعلان منشور على مضمونة.</p>
            </div>
            <button onClick={() => void load()} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          <div className="flex gap-2 mt-3">
            <TabBtn k="products" label="📦 المنتجات" />
            <TabBtn k="services" label={isRest ? '🍽️ المنيو' : '✂️ قائمة الخدمات'} />
            <TabBtn k="materials" label="🧱 الخامات (منتج أولي)" />
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-5 space-y-3">
        {msg && <p className="text-xs font-bold text-[#04352A] bg-[#34D399]/20 rounded-xl px-3 py-2">{msg}</p>}
        {err && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">{err}</p>}
        {loading && !b ? <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#059669] animate-spin inline" /></div> : (
          <>
            {tab === 'products' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#6B7280]">{products.length} منتج نهائي · {products.filter(p => p.publish_to_marketplace).length} في السوق</p>
                  <div className="flex gap-2">
                    <button onClick={() => setImportOpen(true)} className="px-3 py-2 rounded-xl bg-white border border-[#059669]/30 text-[#059669] text-sm font-black">📥 استيراد إكسيل</button>
                    <button onClick={() => setPForm({ item_class: 'sellable', unit: 'قطعة', active: true, current_stock: 0 })} className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5"><Plus className="w-4 h-4" /> منتج جديد</button>
                  </div>
                </div>
                {products.length === 0 && <Empty icon={<Package className="w-8 h-8" />} text="مفيش منتجات لسه — ضيف أول منتج وفعّل «في السوق» عشان العميل يشتريه من صفحتك." />}
                {products.map(p => {
                  const low = Number(p.reorder_threshold) > 0 && Number(p.current_stock) <= Number(p.reorder_threshold)
                  return (
                    <div key={p.id} className={`rounded-2xl border bg-white p-3 ${low ? 'border-amber-300' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setPForm(p)} className="min-w-0 flex-1 text-right flex items-center gap-2">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <span className="w-11 h-11 rounded-lg bg-[#FAFAF7] grid place-items-center shrink-0">📷</span>}
                          <span className="min-w-0">
                          <p className="text-[13px] font-black text-[#1A2E26] truncate">{p.name_ar}</p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">{fmt(p.selling_price_egp)} {cur}{p.current_stock != null && <span className={low ? 'text-amber-700 font-bold' : ''}> · متاح {fmt(p.current_stock)} {p.unit || ''}</span>}{p.sku ? ` · ${p.sku}` : ''}</p>
                          </span>
                        </button>
                        <button onClick={() => setComp(p)} title="المكوّنات (الخامات)" className="shrink-0 px-2.5 py-2 rounded-xl text-[11.5px] font-black bg-white border border-gray-200">🧱</button>
                        <button onClick={() => setSale({ id: p.id, name: p.name_ar, unitPrice: p.selling_price_egp, kind: 'product', unit: p.unit })} className="shrink-0 px-3 py-2 rounded-xl text-[11.5px] font-black bg-[#04352A] text-white">بيع</button>
                        <PublishBtn kind="product" id={p.id} on={p.publish_to_marketplace} />
                      </div>
                    </div>
                  )
                })}
              </section>
            )}

            {tab === 'services' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#6B7280]">{services.length} {isRest ? 'صنف' : 'خدمة'} · {services.filter(s => s.publish_to_marketplace).length} في السوق</p>
                  <button onClick={() => setSForm({ status: 'active', duration_minutes: isRest ? 0 : 30, category: 'عام' })} className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5"><Plus className="w-4 h-4" /> {isRest ? 'صنف جديد' : 'خدمة جديدة'}</button>
                </div>
                {services.length === 0 && <Empty icon={<Scissors className="w-8 h-8" />} text={isRest ? 'المنيو فاضي — ضيف أول صنف.' : 'مفيش خدمات لسه — ضيف أول خدمة وفعّل «في السوق» عشان العميل يحجزها.'} />}
                {services.map(s => (
                  <div key={s.id} className="rounded-2xl border border-gray-100 bg-white p-3">
                    <div className="flex items-start justify-between gap-2">
                      <button onClick={() => setSForm(s)} className="min-w-0 flex-1 text-right flex items-center gap-2">
                        {s.image_url ? <img src={s.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <span className="w-11 h-11 rounded-lg bg-[#FAFAF7] grid place-items-center shrink-0">📷</span>}
                        <span className="min-w-0">
                        <p className="text-[13px] font-black text-[#1A2E26] truncate">{s.name_ar}</p>
                        <p className="text-[11px] text-[#6B7280] mt-0.5">{fmt(s.price_egp)} {cur}{!isRest && s.duration_minutes ? ` · ${s.duration_minutes} د` : ''}{s.category ? ` · ${s.category}` : ''}</p>
                        </span>
                      </button>
                      <button onClick={() => setSale({ id: s.id, name: s.name_ar, unitPrice: Number(s.price_egp) || null, kind: 'service' })} className="shrink-0 px-3 py-2 rounded-xl text-[11.5px] font-black bg-[#04352A] text-white">بيع</button>
                      <PublishBtn kind="service" id={s.id} on={s.publish_to_marketplace} />
                    </div>
                  </div>
                ))}
              </section>
            )}

            {tab === 'materials' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-black text-[#6B7280]">{materials.length} خامة/مستهلك — داخلي، مابيتعرضش في السوق</p>
                  <button onClick={() => setPForm({ item_class: 'material', unit: 'كيلو', active: true, current_stock: 0 })} className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5"><Plus className="w-4 h-4" /> خامة جديدة</button>
                </div>
                {materials.length === 0 && <Empty icon={<Boxes className="w-8 h-8" />} text="مفيش خامات لسه — الخامة بتتربط بالمنتج النهائي (🧱) وبتتخصم مع كل بيع." />}
                {materials.map(p => {
                  const low = Number(p.reorder_threshold) > 0 && Number(p.current_stock) <= Number(p.reorder_threshold)
                  return (
                    <div key={p.id} className={`rounded-2xl border bg-white p-3 ${low ? 'border-amber-300' : 'border-gray-100'}`}>
                      <div className="flex items-start justify-between gap-2">
                        <button onClick={() => setPForm(p)} className="min-w-0 flex-1 text-right flex items-center gap-2">
                          {p.image_url ? <img src={p.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <span className="w-11 h-11 rounded-lg bg-[#FAFAF7] grid place-items-center shrink-0">📷</span>}
                          <span className="min-w-0">
                          <p className="text-[13px] font-black text-[#1A2E26] truncate">{p.name_ar} <span className="text-[10px] text-[#6B7280] font-normal">{p.item_class === 'consumable' ? '· مستهلك' : '· خامة'}</span></p>
                          <p className="text-[11px] text-[#6B7280] mt-0.5">تكلفة {fmt(p.cost_price_egp)} {cur} · متاح <span className={low ? 'text-amber-700 font-bold' : ''}>{fmt(p.current_stock)} {p.unit || ''}</span></p>
                          </span>
                        </button>
                        <button onClick={() => void deleteProduct(p)} className="shrink-0 p-2 rounded-xl text-red-600 bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </div>
                  )
                })}
              </section>
            )}
          </>
        )}
      </main>

      {pForm && (
        <Modal title={pForm.id ? 'تعديل' : (pForm.item_class === 'sellable' ? 'منتج نهائي جديد' : 'خامة جديدة')} onClose={() => setPForm(null)}>
          <CatalogPhotoField supplierId={supplierId} value={pForm.image_url} onChange={(url) => setPForm({ ...pForm, image_url: url })} label={pForm.item_class === 'sellable' ? 'صورة المنتج (بتظهر في السوق)' : 'صورة الخامة (اختياري)'} />
          <F label="الاسم *"><input value={pForm.name_ar || ''} onChange={e => setPForm({ ...pForm, name_ar: e.target.value })} className={INP} /></F>
          <F label="النوع">
            <select value={pForm.item_class || 'sellable'} onChange={e => setPForm({ ...pForm, item_class: e.target.value as Product['item_class'] })} className={INP}>
              <option value="sellable">منتج نهائي (بيتباع)</option><option value="material">خامة (منتج أولي)</option><option value="consumable">مستهلك</option>
            </select>
          </F>
          <div className="grid grid-cols-2 gap-2">
            {pForm.item_class === 'sellable' && <F label={`سعر البيع (${cur})`}><input type="number" inputMode="decimal" dir="ltr" value={pForm.selling_price_egp ?? ''} onChange={e => setPForm({ ...pForm, selling_price_egp: Number(e.target.value) })} className={INP} /></F>}
            <F label={`التكلفة (${cur})`}><input type="number" inputMode="decimal" dir="ltr" value={pForm.cost_price_egp ?? ''} onChange={e => setPForm({ ...pForm, cost_price_egp: Number(e.target.value) })} className={INP} /></F>
            <F label="المتاح دلوقتي"><input type="number" inputMode="decimal" dir="ltr" value={pForm.current_stock ?? 0} onChange={e => setPForm({ ...pForm, current_stock: Number(e.target.value) })} className={INP} /></F>
            <F label="الوحدة"><input value={pForm.unit || ''} onChange={e => setPForm({ ...pForm, unit: e.target.value })} className={INP} placeholder="قطعة · كيلو · لتر" /></F>
            <F label="حد إعادة الطلب"><input type="number" inputMode="decimal" dir="ltr" value={pForm.reorder_threshold ?? 0} onChange={e => setPForm({ ...pForm, reorder_threshold: Number(e.target.value) })} className={INP} /></F>
            <F label="كود (SKU)"><input value={pForm.sku || ''} onChange={e => setPForm({ ...pForm, sku: e.target.value })} className={INP} dir="ltr" /></F>
          </div>
          <F label="ملاحظات"><textarea value={pForm.notes || ''} onChange={e => setPForm({ ...pForm, notes: e.target.value })} rows={2} className={INP} /></F>
          <div className="flex gap-2">
            <button onClick={() => void saveProduct()} disabled={busy === 'pform'} className="flex-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">{busy === 'pform' ? '…' : 'احفظ'}</button>
            {pForm.id && <button onClick={() => { const p = pForm as Product; setPForm(null); void deleteProduct(p) }} className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm">مسح</button>}
          </div>
        </Modal>
      )}
      {sForm && (
        <Modal title={sForm.id ? 'تعديل' : (isRest ? 'صنف جديد' : 'خدمة جديدة')} onClose={() => setSForm(null)}>
          <CatalogPhotoField supplierId={supplierId} value={sForm.image_url} onChange={(url) => setSForm({ ...sForm, image_url: url })} label={isRest ? 'صورة الصنف (بتظهر في السوق)' : 'صورة الخدمة (بتظهر في السوق)'} />
          <F label="الاسم *"><input value={sForm.name_ar || ''} onChange={e => setSForm({ ...sForm, name_ar: e.target.value })} className={INP} /></F>
          <div className="grid grid-cols-2 gap-2">
            <F label={`السعر (${cur})`}><input type="number" inputMode="decimal" dir="ltr" value={sForm.price_egp ?? ''} onChange={e => setSForm({ ...sForm, price_egp: Number(e.target.value) })} className={INP} /></F>
            {!isRest && <F label="المدة (دقيقة)"><input type="number" inputMode="numeric" dir="ltr" value={sForm.duration_minutes ?? 30} onChange={e => setSForm({ ...sForm, duration_minutes: Number(e.target.value) })} className={INP} /></F>}
            <F label="القسم"><input value={sForm.category || ''} onChange={e => setSForm({ ...sForm, category: e.target.value })} className={INP} placeholder={isRest ? 'مشويات · مشروبات' : 'عام'} /></F>
            {!isRest && <F label="عمولة الموظف (%)"><input type="number" inputMode="decimal" dir="ltr" value={sForm.performer_commission_pct ?? 0} onChange={e => setSForm({ ...sForm, performer_commission_pct: Number(e.target.value) })} className={INP} /></F>}
          </div>
          <F label="وصف (اختياري)"><textarea value={sForm.description || ''} onChange={e => setSForm({ ...sForm, description: e.target.value })} rows={2} className={INP} /></F>
          <div className="flex gap-2">
            <button onClick={() => void saveService()} disabled={busy === 'sform'} className="flex-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">{busy === 'sform' ? '…' : 'احفظ'}</button>
            {sForm.id && <button onClick={() => { const s = sForm as Service; setSForm(null); void deleteService(s) }} className="px-4 py-3 rounded-xl bg-red-50 text-red-600 font-bold text-sm">شيل</button>}
          </div>
        </Modal>
      )}
      {sale && <ManualSaleModal supplierId={supplierId} item={sale} currency={cur} onClose={() => setSale(null)} onDone={(r) => { setSale(null); flash(`✅ اتسجّل بيع ${sale.name} بـ${fmt(r.amount)} ${cur} في الحسابات${r.stock_left != null ? ` · المتبقي ${fmt(r.stock_left)}` : ''}`); void load() }} />}
      {importOpen && <ProductsImportModal supplierId={supplierId} onClose={() => setImportOpen(false)} onDone={(r) => { setImportOpen(false); flash(`📥 اتستورد: ${r.inserted} جديد · ${r.updated} اتحدّث · ${r.skipped} من غير اسم`); void load() }} />}
      {comp && <ProductMaterialsModal supplierId={supplierId} productId={comp.id} productName={comp.name_ar} onClose={() => setComp(null)} onSaved={(n) => { setComp(null); flash(`🧱 اتربط ${n} خامة بـ«${comp.name_ar}»`) }} />}
    </div>
  )
}

function Empty({ icon, text }: { icon: React.ReactNode; text: string }) {
  return <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-8 text-center text-[#6B7280]"><div className="mx-auto mb-2 opacity-40 w-8">{icon}</div><p className="text-xs">{text}</p></div>
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div>
}
function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between"><h2 className="text-base font-black text-[#1A2E26]">{title}</h2><button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button></header>
        <div className="p-5 space-y-3">{children}</div>
      </div>
    </div>
  )
}
