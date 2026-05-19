'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, RefreshCw, Plus, X, Scissors, Edit2, Trash2, Save, Clock, Percent } from 'lucide-react'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

const CATEGORIES = [
  { value: 'hair_cut', label: 'قص شعر' },
  { value: 'hair_color', label: 'صبغة' },
  { value: 'hair_treatment', label: 'علاج شعر' },
  { value: 'styling', label: 'سشوار / تسريحة' },
  { value: 'makeup', label: 'مكياج' },
  { value: 'nails', label: 'أظافر' },
  { value: 'skin', label: 'بشرة' },
  { value: 'package', label: 'باقة' },
  { value: 'general', label: 'عام' },
]

export default function ServicesCatalogPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [services, setServices] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [editingService, setEditingService] = useState<any>(null)

  async function load() {
    setLoading(true)
    // @ts-expect-error
    const { data: s } = await supabase.from('suppliers').select('business_name').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error
    const { data: svc } = await supabase.from('services_catalog')
      .select('*')
      .eq('supplier_id', supplierId)
      .neq('status', 'archived')
      .order('category')
      .order('name_ar')
    setServices(svc || [])
    setLoading(false)
  }

  async function deleteService(id: string, name: string) {
    if (!confirm(`متأكد عاوز تأرشف "${name}"؟`)) return
    // @ts-expect-error
    await supabase.rpc('admin_delete_service', { p_service_id: id })
    load()
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  if (!supplier) return <Loader />

  // Group by category
  const grouped: Record<string, any[]> = {}
  services.forEach(s => {
    const cat = s.category || 'general'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(s)
  })

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#1F6F5F] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#1F6F5F] mb-1">B2B PARTNER · SERVICE CATALOG</p>
              <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">قائمة الخدمات · {supplier?.business_name}</h1>
              <p className="text-sm text-[#6B7280] mt-1">{services.length} خدمة نشطة</p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowAdd(true)} className="px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold flex items-center gap-2">
                <Plus className="w-4 h-4" /> خدمة جديدة
              </button>
              <button onClick={load} className="p-2 rounded-xl bg-[#FAFAF7]"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5">
        <section className="bg-[#1F6F5F]/5 border border-[#1F6F5F]/20 rounded-2xl p-4 text-xs text-[#1A2E26]">
          <p className="font-bold mb-1">💡 الخدمات اللي بـ تدخل هنا:</p>
          <p>هـ تظهر تلقائياً للعملاء في الـ Booking Widget على الفرع، وهـ تتسجل عمولات الستايليست بناءً على النسبة المحددة هنا.</p>
        </section>

        {loading ? (
          <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#1F6F5F] animate-spin inline" /></div>
        ) : services.length === 0 ? (
          <div className="py-12 text-center bg-white rounded-2xl border border-gray-100">
            <Scissors className="w-10 h-10 text-[#6B7280] opacity-30 mx-auto mb-2" />
            <p className="text-sm font-bold text-[#1A2E26]">مفيش خدمات لسه</p>
            <button onClick={() => setShowAdd(true)} className="mt-3 px-4 py-2 rounded-xl bg-[#1F6F5F] text-white text-sm font-bold">أضف أول خدمة</button>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <section key={cat} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-3 bg-[#FAFAF7] border-b border-gray-100">
                <h3 className="text-sm font-bold tracking-wider uppercase text-[#6B7280]">
                  {CATEGORIES.find(c => c.value === cat)?.label || cat} · {items.length}
                </h3>
              </div>
              <div className="divide-y divide-gray-100">
                {items.map(svc => (
                  <div key={svc.id} className="px-5 py-3 grid grid-cols-12 gap-3 items-center text-sm hover:bg-[#FAFAF7]/50">
                    <div className="col-span-5">
                      <p className="font-bold text-[#1A2E26]">{svc.name_ar}</p>
                      {svc.description && <p className="text-[10px] text-[#6B7280] mt-0.5 truncate">{svc.description}</p>}
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-[10px] text-[#6B7280]">السعر</p>
                      <p className="font-mono font-black text-[#1F6F5F]">{Number(svc.price_egp).toLocaleString()} ج</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-[10px] text-[#6B7280] flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> المدة</p>
                      <p className="font-mono font-bold">{svc.duration_minutes} د</p>
                    </div>
                    <div className="col-span-2 text-center">
                      <p className="text-[10px] text-[#6B7280] flex items-center justify-center gap-1"><Percent className="w-3 h-3" /> عمولة</p>
                      <p className="font-mono font-bold">{svc.performer_commission_pct || 0}%</p>
                    </div>
                    <div className="col-span-1 flex justify-end gap-1">
                      <button onClick={() => setEditingService(svc)} className="p-1.5 rounded-lg hover:bg-[#1F6F5F]/10 text-[#1F6F5F]"><Edit2 className="w-3.5 h-3.5" /></button>
                      <button onClick={() => deleteService(svc.id, svc.name_ar)} className="p-1.5 rounded-lg hover:bg-red-50 text-red-600"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </main>

      {showAdd && <ServiceModal supplierId={supplierId} onClose={() => setShowAdd(false)} onSaved={() => { setShowAdd(false); load() }} />}
      {editingService && <ServiceModal supplierId={supplierId} service={editingService} onClose={() => setEditingService(null)} onSaved={() => { setEditingService(null); load() }} />}
    </div>
  )
}

function ServiceModal({ supplierId, service, onClose, onSaved }: any) {
  const isEdit = !!service
  const [form, setForm] = useState({
    name_ar: service?.name_ar || '',
    category: service?.category || 'hair_cut',
    price_egp: service?.price_egp?.toString() || '',
    duration_minutes: service?.duration_minutes?.toString() || '60',
    performer_commission_pct: service?.performer_commission_pct?.toString() || '0',
    description: service?.description || '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!form.name_ar || !form.price_egp) return alert('اكتب الاسم والسعر')
    setSaving(true)
    if (isEdit) {
      // @ts-expect-error
      await supabase.rpc('admin_update_service', {
        p_service_id: service.id,
        p_name_ar: form.name_ar,
        p_category: form.category,
        p_price_egp: parseFloat(form.price_egp),
        p_duration_minutes: parseInt(form.duration_minutes) || 60,
        p_performer_commission_pct: parseFloat(form.performer_commission_pct) || 0,
        p_description: form.description || null,
      })
    } else {
      // @ts-expect-error
      await supabase.rpc('admin_create_service', {
        p_supplier_id: supplierId,
        p_name_ar: form.name_ar,
        p_category: form.category,
        p_price_egp: parseFloat(form.price_egp),
        p_duration_minutes: parseInt(form.duration_minutes) || 60,
        p_performer_commission_pct: parseFloat(form.performer_commission_pct) || 0,
        p_description: form.description || null,
      })
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-lg font-black text-[#1A2E26]">{isEdit ? 'تعديل خدمة' : 'خدمة جديدة'}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <Field label="اسم الخدمة *">
            <input type="text" value={form.name_ar} onChange={e => setForm({ ...form, name_ar: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" placeholder="مثلاً: صبغة شعر كاملة" />
          </Field>
          <Field label="الفئة">
            <div className="grid grid-cols-3 gap-1.5">
              {CATEGORIES.map(c => (
                <button key={c.value} onClick={() => setForm({ ...form, category: c.value })} className={`px-2 py-1.5 rounded-lg text-xs font-bold ${
                  form.category === c.value ? 'bg-[#1F6F5F] text-white' : 'bg-[#FAFAF7] text-[#1A2E26]'
                }`}>{c.label}</button>
              ))}
            </div>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="السعر (ج) *">
              <input type="number" value={form.price_egp} onChange={e => setForm({ ...form, price_egp: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
            </Field>
            <Field label="المدة (دقيقة)">
              <input type="number" value={form.duration_minutes} onChange={e => setForm({ ...form, duration_minutes: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" />
            </Field>
          </div>
          <Field label="عمولة الستايليست (%)">
            <input type="number" value={form.performer_commission_pct} onChange={e => setForm({ ...form, performer_commission_pct: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" placeholder="0-100" />
          </Field>
          <Field label="وصف الخدمة (اختياري)">
            <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          <button onClick={save} disabled={saving} className="w-full py-3 rounded-xl bg-[#1F6F5F] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ...</> : <><Save className="w-4 h-4" /> {isEdit ? 'احفظ التعديل' : 'احفظ الخدمة'}</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: any) { return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div> }
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#1F6F5F] animate-spin" /></div> }
