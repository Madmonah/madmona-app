'use client'
// ============================================================================
// 📦 /supplier/erp/products — منتجاتي وخدماتي
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «واجهة العملاء في البيزنس B2B المفروض بتاخد
//   الشغل من المنتجات أو الخدمات اللي في الـERP، واللي نقدر نضيف أو
//   نعدّل منها، ونربط الخدمة أو المنتج بالمخزون… ونختار إذا هنعرضه
//   في الماركت بليس ولا لا».
//
// 🔍 المشكلة اللي بتحلها: الاتجاه كان معكوس — الإعلانات بتتعمل مباشرة
//    في الماركت بليس من غير ما تعدّي على المخزون، فالسيستم فاضي.
//    دلوقتي **المنتج هو الأصل والإعلان انعكاس له**:
//    تعدّل الاسم أو السعر هنا → يتغيّر في الماركت بليس تلقائيًا.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import {
  Loader2, Plus, Package, ArrowRight, X, Search, Eye, EyeOff,
  AlertTriangle, Boxes, Tag,
} from 'lucide-react'

type Item = {
  id: string
  name_ar: string
  sku: string | null
  selling_price_egp: number | null
  cost_price_egp: number | null
  qty_on_hand: number | null
  reorder_level: number | null
  unit: string | null
  listing_id: string | null
  publish_to_marketplace: boolean | null
  active: boolean | null
  notes: string | null
}

export default function ProductsPage() {
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'shown' | 'hidden' | 'low'>('all')
  const [form, setForm] = useState<Partial<Item> | null>(null)
  const [saving, setSaving] = useState(false)
  const [busy, setBusy] = useState<string | null>(null)

  const db = supabaseBrowser as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: unknown }> } }
      insert: (v: unknown) => Promise<{ error: { message: string } | null }>
      update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
    }
  }

  const load = useCallback(async (sid: string) => {
    const { data } = await db.from('inventory_products').select('*').eq('supplier_id', sid).order('name_ar')
    setRows((data as Item[]) || [])
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business); await load(acc.business.id); setLoading(false)
    })()
  }, [load])

  async function save() {
    if (!biz || !form?.name_ar?.trim()) { alert('اكتب اسم المنتج'); return }
    setSaving(true)
    const payload = {
      supplier_id: biz.id,
      name_ar: form.name_ar.trim(),
      sku: form.sku || null,
      selling_price_egp: Number(form.selling_price_egp) || 0,
      cost_price_egp: Number(form.cost_price_egp) || 0,
      qty_on_hand: Number(form.qty_on_hand) || 0,
      reorder_level: Number(form.reorder_level) || 0,
      unit: form.unit || 'قطعة',
      active: form.active ?? true,
      notes: form.notes || null,
    }
    const { error } = form.id
      ? await db.from('inventory_products').update(payload).eq('id', form.id)
      : await db.from('inventory_products').insert(payload)
    setSaving(false)
    if (error) { alert(error.message); return }
    setForm(null); await load(biz.id)
  }

  /** 🔀 عرض/إخفاء في الماركت بليس — الدالة بتعمل الإعلان أو توقفه */
  async function togglePublish(it: Item) {
    setBusy(it.id)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)('toggle_catalog_visibility', {
        p_kind: 'product', p_item_id: it.id, p_publish: !it.publish_to_marketplace,
      })
      const r = data as { ok: boolean; published: boolean }
      if (r?.ok) setRows((l) => l.map((x) => x.id === it.id ? { ...x, publish_to_marketplace: r.published } : x))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'حصل خطأ')
    }
    setBusy(null)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">الصفحة دي للموردين</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">ارجع للماركت بليس</Link>
    </div>
  )

  const low = rows.filter((r) => Number(r.reorder_level) > 0 && Number(r.qty_on_hand) <= Number(r.reorder_level))
  const shown = rows
    .filter((r) => filter === 'all' ? true
      : filter === 'shown' ? r.publish_to_marketplace
      : filter === 'hidden' ? !r.publish_to_marketplace
      : Number(r.reorder_level) > 0 && Number(r.qty_on_hand) <= Number(r.reorder_level))
    .filter((r) => !q.trim() || (r.name_ar || '').includes(q.trim()))

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-3 gap-2">
        <div>
          <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
            <ArrowRight className="w-3 h-3" /> نظام الإدارة
          </Link>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-[#059669]" /> منتجاتي
          </h1>
        </div>
        <button onClick={() => setForm({ unit: 'قطعة', qty_on_hand: 0, active: true })}
          className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> منتج جديد
        </button>
      </div>

      <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
        ده مصدر منتجاتك. تعدّل الاسم أو السعر هنا <b>فيتغيّر في الماركت بليس تلقائيًا</b>،
        وتقرر إيه اللي يظهر للعملاء وإيه اللي يفضل داخلي.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label="كل المنتجات" v={rows.length} />
        <Stat label="ظاهر للعملاء" v={rows.filter((r) => r.publish_to_marketplace).length} good />
        <Stat label="محتاج طلب" v={low.length} warn={low.length > 0} />
      </div>

      {low.length > 0 && filter !== 'low' && (
        <button onClick={() => setFilter('low')}
          className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-3 text-right">
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {low.length} منتج وصل حد إعادة الطلب — اضغط للعرض
          </p>
        </button>
      )}

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([['all', 'الكل'], ['shown', 'ظاهر'], ['hidden', 'داخلي'], ['low', 'محتاج طلب']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setFilter(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap ${
              filter === k ? 'bg-[#04352A] text-white' : 'bg-[#F1EEE6] text-gray-600'}`}>
            {l}
          </button>
        ))}
      </div>

      {rows.length > 6 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالاسم"
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">
            {rows.length === 0 ? 'مفيش منتجات لسه' : 'مفيش نتايج'}
          </p>
          {rows.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1">ابدأ بأول منتج — وهيظهر في الماركت بليس لو فعّلته.</p>
          )}
        </div>
      ) : (
        <div className="space-y-1.5">
          {shown.map((r) => {
            const isLow = Number(r.reorder_level) > 0 && Number(r.qty_on_hand) <= Number(r.reorder_level)
            return (
              <div key={r.id} className={`rounded-2xl border bg-white p-3 ${isLow ? 'border-amber-300' : 'border-gray-200'}`}>
                <div className="flex items-start justify-between gap-2">
                  <button onClick={() => setForm(r)} className="min-w-0 flex-1 text-right">
                    <p className="text-xs font-black text-gray-900 truncate">{r.name_ar}</p>
                    <p className="text-[11px] text-gray-500 mt-0.5">
                      {Number(r.selling_price_egp || 0).toLocaleString('ar-EG')} ج.م
                      {r.qty_on_hand != null && (
                        <span className={isLow ? 'text-amber-700 font-bold' : ''}>
                          {' · '}متاح {Number(r.qty_on_hand).toLocaleString('ar-EG')} {r.unit}
                        </span>
                      )}
                      {r.sku ? ` · ${r.sku}` : ''}
                    </p>
                  </button>
                  <button onClick={() => togglePublish(r)} disabled={busy === r.id}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-black ${
                      r.publish_to_marketplace ? 'bg-[#34D399]/15 text-[#059669]' : 'bg-[#F1EEE6] text-gray-500'}`}>
                    {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : r.publish_to_marketplace ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {r.publish_to_marketplace ? 'ظاهر' : 'داخلي'}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">{form.id ? 'تعديل منتج' : 'منتج جديد'}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <F label="الاسم *"><input value={form.name_ar || ''} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className={INP} /></F>
            <div className="grid grid-cols-2 gap-2">
              <F label="سعر البيع"><input type="number" value={form.selling_price_egp ?? 0} onChange={(e) => setForm({ ...form, selling_price_egp: Number(e.target.value) })} className={INP} /></F>
              <F label="سعر التكلفة"><input type="number" value={form.cost_price_egp ?? 0} onChange={(e) => setForm({ ...form, cost_price_egp: Number(e.target.value) })} className={INP} /></F>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F label="الكمية المتاحة"><input type="number" value={form.qty_on_hand ?? 0} onChange={(e) => setForm({ ...form, qty_on_hand: Number(e.target.value) })} className={INP} /></F>
              <F label="الوحدة"><input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={INP} placeholder="قطعة · متر · كيلو" /></F>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F label="حد إعادة الطلب"><input type="number" value={form.reorder_level ?? 0} onChange={(e) => setForm({ ...form, reorder_level: Number(e.target.value) })} className={INP} /></F>
              <F label="كود المنتج (SKU)"><input value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={INP} dir="ltr" /></F>
            </div>
            {form.listing_id && (
              <p className="text-[11px] text-[#059669] font-bold mb-2 flex items-center gap-1">
                <Tag className="w-3 h-3" /> مربوط بإعلان — التعديل هيظهر في الماركت بليس
              </p>
            )}
            <button onClick={save} disabled={saving}
              className="w-full mt-2 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {saving ? 'بيحفظ…' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const INP = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm'
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-2.5"><label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>{children}</div>
}
function Stat({ label, v, good, warn }: { label: string; v: number; good?: boolean; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <p className="text-[11px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`font-black tabular text-lg ${warn ? 'text-amber-700' : good ? 'text-[#059669]' : 'text-gray-900'}`}>{v}</p>
    </div>
  )
}
