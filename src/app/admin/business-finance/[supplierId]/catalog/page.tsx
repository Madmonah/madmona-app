'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@supabase/supabase-js'
import { ChevronLeft, Loader2, Plus, Trash2, RefreshCw, ImageIcon } from 'lucide-react'
// 🔴 rpcSafe: نفس السلوك، بس الخطأ مبيعدّيش في صمت (13 Jul 2026)
import { rpcSafe } from '@/lib/rpc'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

type Cat = { id: string; name_ar: string; group_name_ar?: string | null }
type Item = {
  id: string
  title: string
  status: string
  price_egp: number | null
  price_on_request: boolean
  category_ar: string | null
  photo_url: string | null
}

export default function CatalogPage({ params }: { params: { supplierId: string } }) {
  const { supplierId } = params
  const [supplier, setSupplier] = useState<any>(null)
  const [cats, setCats] = useState<Cat[]>([])
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ title: '', category_id: '', price: '', on_request: false, image_url: '' })

  async function load() {
    setLoading(true)
    // @ts-expect-error rpc typing
    const { data: s } = await supabase.from('suppliers').select('business_name, contact_phone').eq('id', supplierId).single()
    setSupplier(s)
    // @ts-expect-error rpc typing
    const { data: c } = await supabase.rpc('admin_supplier_catalog_categories', { p_supplier_id: supplierId })
    setCats(Array.isArray(c) ? (c as Cat[]) : [])
    // @ts-expect-error rpc typing
    const { data: l } = await supabase.rpc('admin_supplier_list_listings', { p_supplier_id: supplierId })
    setItems(Array.isArray(l) ? (l as Item[]) : [])
    setLoading(false)
  }

  useEffect(() => { load() /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [supplierId])

  async function addListing() {
    if (!form.title.trim() || !form.category_id) return alert('اكتب الاسم واختر الفئة')
    if (!form.on_request && !form.price) return alert('اكتب السعر أو فعّل "اتصل للسعر"')
    setSaving(true)
    // @ts-expect-error rpc typing
    const { error } = await supabase.rpc('admin_supplier_add_listing', {
      p_supplier_id: supplierId,
      p_title: form.title.trim(),
      p_category_id: form.category_id,
      p_price_egp: form.on_request ? null : Number(form.price),
      p_price_on_request: form.on_request,
      p_image_url: form.image_url.trim() || null,
      p_contact_phone: supplier?.contact_phone || null,
      p_district: null,
      p_description: null,
    })
    setSaving(false)
    if (error) return alert('خطأ: ' + error.message)
    setForm({ title: '', category_id: '', price: '', on_request: false, image_url: '' })
    load()
  }

  async function removeListing(id: string) {
    if (!confirm('متأكد تمسح المنتج ده؟')) return
    await rpcSafe(supabase, 'admin_supplier_delete_listing', { p_listing_id: id })
    load()
  }

  if (!supplier && loading) return <Loader />

  return (
    <div className="min-h-screen bg-[#FAFAF7]" dir="rtl">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <Link href={`/admin/business-finance/${supplierId}`} className="text-xs font-bold text-[#6B7280] hover:text-[#FA8125] flex items-center gap-1 mb-2">
            <ChevronLeft className="w-3.5 h-3.5" /> رجوع
          </Link>
          <p className="text-[10px] font-bold tracking-[0.3em] uppercase text-[#FA8125] mb-1">CATALOG</p>
          <h1 className="text-2xl md:text-3xl font-black text-[#1A2E26]">الكتالوج · {supplier?.business_name || ''}</h1>
          <p className="text-sm text-[#6B7280] mt-1">{items.length} منتج · ضيف منتج / موتوسيكل / قطعة على المعرض</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">
        <section className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3">
          <h2 className="text-sm font-black text-[#1A2E26] flex items-center gap-1.5"><Plus className="w-4 h-4 text-[#FA8125]" /> ضيف جديد</h2>
          <Field label="الاسم *">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="مثال: BMW S1000RR 2024" className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" />
          </Field>
          <Field label="الفئة *">
            <select value={form.category_id} onChange={e => setForm({ ...form, category_id: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm">
              <option value="">اختر الفئة</option>
              {cats.map(c => <option key={c.id} value={c.id}>{c.group_name_ar ? `${c.name_ar} — ${c.group_name_ar}` : c.name_ar}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={form.on_request} onChange={e => setForm({ ...form, on_request: e.target.checked })} className="w-4 h-4 accent-[#FA8125]" />
            <span className="text-xs font-bold text-[#1A2E26]">اتصل للسعر (من غير رقم)</span>
          </label>
          {!form.on_request && (
            <Field label="السعر (ج)">
              <input type="number" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm font-mono" dir="ltr" />
            </Field>
          )}
          <Field label="رابط الصورة (اختياري — لازم عشان يتنشر)">
            <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://..." className="w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-sm" dir="ltr" />
          </Field>
          <button onClick={addListing} disabled={saving} className="w-full py-3 rounded-xl bg-[#FA8125] text-white font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الإضافة...</> : <><Plus className="w-4 h-4" /> ضيف للمعرض</>}
          </button>
          <p className="text-[10px] text-[#6B7280]">من غير صورة هيتسجّل كـ draft (مش هيظهر للناس لحد ما تضيف صورة).</p>
        </section>

        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-black text-[#1A2E26]">المنتجات ({items.length})</h2>
            <button onClick={load} className="p-2 rounded-xl bg-white border border-gray-100"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
          </div>
          {loading ? (
            <div className="py-12 text-center"><Loader2 className="w-6 h-6 text-[#FA8125] animate-spin inline" /></div>
          ) : items.length === 0 ? (
            <div className="py-12 text-center bg-white rounded-2xl border border-gray-100"><p className="text-sm text-[#6B7280]">مفيش منتجات لسه</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {items.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                  <div className="aspect-[4/3] bg-gray-100 relative">
                    {u.photo_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={u.photo_url} alt={u.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center"><ImageIcon className="w-8 h-8 text-gray-300" /></div>
                    )}
                    <span className={`absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold ${u.status === 'published' ? 'bg-[#FA8125] text-white' : 'bg-amber-100 text-amber-700'}`}>
                      {u.status === 'published' ? 'منشور' : 'draft'}
                    </span>
                  </div>
                  <div className="p-3">
                    <p className="text-sm font-bold text-[#1A2E26] line-clamp-1">{u.title}</p>
                    <p className="text-[10px] text-[#6B7280] mt-0.5">{u.category_ar || ''}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-sm font-mono font-black text-[#FA8125]">
                        {u.price_on_request ? 'اتصل للسعر' : u.price_egp ? `${Number(u.price_egp).toLocaleString('ar-EG')} ج` : '—'}
                      </span>
                      <button onClick={() => removeListing(u.id)} className="p-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

function Field({ label, children }: { label: string; children: any }) {
  return <div><label className="text-[10px] font-bold tracking-wider uppercase text-[#6B7280] mb-1.5 block">{label}</label>{children}</div>
}
function Loader() { return <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl"><Loader2 className="w-8 h-8 text-[#FA8125] animate-spin" /></div> }
