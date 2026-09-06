'use client'
// ============================================================================
// 🛠️ /admin/supplier-catalog — أدمن يدير منتجات أي مورد
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «ياريت لو يكون ليه تاب الأدمن يقدر يفتح أو
//   يقفل أو يعدّل أي منتج أو خدمة أو سعر أو عدد — سواء المورد أو
//   المطور أو المعرض أو مضمونة».
//
// 🔐 محمي بـAdminGuard (فريق مضمونة بس) + can_edit_supplier_listings
//    في الداتابيز — طبقتين مش واحدة.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Search, Eye, EyeOff, Store, Package, Tag, X, ArrowRight, Boxes,
} from 'lucide-react'
import { priceLabel, currencyLabel } from '@/lib/currency'

type Biz = { id: string; business_name: string; business_model: string | null; listings_count: number | null }
type Item = {
  currency?: string | null
  kind: string; item_id: string; name: string; price: number | null
  unit: string | null; qty: number | null; on_marketplace: boolean; is_active: boolean
}

const KIND: Record<string, { label: string; icon: typeof Package }> = {
  product: { label: 'منتج', icon: Package },
  service: { label: 'خدمة', icon: Tag },
  menu_item: { label: 'صنف منيو', icon: Package },
  rental: { label: 'للإيجار', icon: Store },
}

export default function AdminSupplierCatalog() {
  const [bizList, setBizList] = useState<Biz[]>([])
  const [picked, setPicked] = useState<Biz | null>(null)
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingItems, setLoadingItems] = useState(false)
  const [q, setQ] = useState('')
  const [itemQ, setItemQ] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [edit, setEdit] = useState<Item | null>(null)
  const [draft, setDraft] = useState<{ price: string; qty: string }>({ price: '', qty: '' })

  const db = supabaseBrowser as unknown as {
    from: (t: string) => {
      select: (c: string) => {
        order: (c: string, o?: unknown) => { limit: (n: number) => Promise<{ data: unknown }> }
        eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: unknown }> }
      }
      update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
    }
  }

  useEffect(() => {
    (async () => {
      const { data } = await db.from('v_business').select('id, business_name, business_model, listings_count')
        .order('business_name').limit(500)
      setBizList((data as Biz[]) || [])
      setLoading(false)
    })()
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const openBiz = useCallback(async (b: Biz) => {
    setPicked(b); setLoadingItems(true); setItemQ('')
    const { data } = await db.from('v_sellable_catalog').select('*').eq('supplier_id', b.id).order('name')
    setItems((data as Item[]) || [])
    setLoadingItems(false)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  async function toggle(it: Item) {
    setBusy(it.item_id)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)('toggle_catalog_visibility', {
        p_kind: it.kind, p_item_id: it.item_id, p_publish: !it.on_marketplace,
      })
      const r = data as { ok: boolean; published: boolean }
      if (r?.ok) setItems((l) => l.map((x) => x.item_id === it.item_id ? { ...x, on_marketplace: r.published } : x))
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') }
    setBusy(null)
  }

  async function saveEdit() {
    if (!edit) return
    setBusy(edit.item_id)
    const price = Number(draft.price)
    const qty = Number(draft.qty)
    try {
      if (edit.kind === 'product') {
        await db.from('inventory_products')
          .update({ selling_price_egp: price, current_stock: qty }).eq('id', edit.item_id)
      } else if (edit.kind === 'service') {
        await db.from('services_catalog').update({ price_egp: price }).eq('id', edit.item_id)
      } else {
        await db.from('listings').update({ price_egp: price }).eq('id', edit.item_id)
      }
      setItems((l) => l.map((x) => x.item_id === edit.item_id
        ? { ...x, price, qty: edit.kind === 'product' ? qty : x.qty } : x))
      setEdit(null)
    } catch (e) { alert(e instanceof Error ? e.message : 'حصل خطأ') }
    setBusy(null)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>

  // ── شاشة اختيار البيزنس ──
  if (!picked) {
    const shown = q.trim() ? bizList.filter((b) => (b.business_name || '').includes(q.trim())) : bizList
    return (
      <div className="max-w-4xl mx-auto p-4" dir="rtl">
        <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
          <Store className="w-5 h-5 text-[#059669]" /> كتالوج الموردين
        </h1>
        <p className="text-[11.5px] text-gray-500 mb-3">
          اختار بيزنس عشان تعدّل منتجاته وأسعاره، أو تفتح وتقفل العرض في الماركت بليس.
        </p>
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر باسم البيزنس"
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
        <div className="space-y-1.5">
          {shown.slice(0, 80).map((b) => (
            <button key={b.id} onClick={() => openBiz(b)}
              className="w-full flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3 text-right hover:border-[#34D399]">
              <Store className="w-4 h-4 text-gray-400 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-gray-900 truncate">{b.business_name}</p>
                <p className="text-[11px] text-gray-500">
                  {b.business_model || 'retail'}
                  {b.listings_count ? ` · ${b.listings_count} إعلان` : ''}
                </p>
              </div>
            </button>
          ))}
          {shown.length > 80 && (
            <p className="text-[11px] text-gray-400 text-center py-2">
              فيه {shown.length - 80} بيزنس كمان — دوّر بالاسم عشان توصله.
            </p>
          )}
        </div>
      </div>
    )
  }

  // ── كتالوج البيزنس المختار ──
  const list = itemQ.trim() ? items.filter((i) => (i.name || '').includes(itemQ.trim())) : items
  return (
    <div className="max-w-4xl mx-auto p-4" dir="rtl">
      <button onClick={() => { setPicked(null); setItems([]) }}
        className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
        <ArrowRight className="w-3 h-3" /> كل الموردين
      </button>
      <h1 className="text-lg font-black text-gray-900 mb-1">{picked.business_name}</h1>
      <p className="text-[11.5px] text-gray-500 mb-3">
        {items.length} عنصر · {items.filter((i) => i.on_marketplace).length} ظاهر في الماركت بليس
      </p>

      {items.length > 6 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={itemQ} onChange={(e) => setItemQ(e.target.value)} placeholder="دوّر بالاسم"
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {loadingItems ? (
        <div className="py-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-gray-400" /></div>
      ) : list.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">
            {items.length === 0 ? 'البيزنس ده مالوش منتجات ولا خدمات' : 'مفيش نتايج'}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {list.map((it) => {
            const k = KIND[it.kind] || KIND.product
            return (
              <div key={it.kind + it.item_id} className="flex items-center gap-2.5 rounded-2xl border border-gray-200 bg-white p-3">
                <k.icon className="w-4 h-4 text-gray-400 shrink-0" />
                <button onClick={() => { setEdit(it); setDraft({ price: String(it.price ?? 0), qty: String(it.qty ?? 0) }) }}
                  className="min-w-0 flex-1 text-right">
                  <p className="text-xs font-bold text-gray-900 truncate">{it.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {k.label} · {priceLabel(it.price || 0, it.currency)}
                    {it.qty != null && ` · متاح ${Number(it.qty).toLocaleString('ar-EG')}`}
                  </p>
                </button>
                <button onClick={() => toggle(it)} disabled={busy === it.item_id}
                  className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-black ${
                    it.on_marketplace ? 'bg-[#34D399]/15 text-[#059669]' : 'bg-[#F1EEE6] text-gray-500'}`}>
                  {busy === it.item_id ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    : it.on_marketplace ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                  {it.on_marketplace ? 'ظاهر' : 'مخفي'}
                </button>
              </div>
            )
          })}
        </div>
      )}

      {edit && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setEdit(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-sm truncate">{edit.name}</h2>
              <button onClick={() => setEdit(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="mb-2.5">
              <label className="block text-[11px] font-bold text-gray-600 mb-1">السعر</label>
              <input type="number" value={draft.price} onChange={(e) => setDraft({ ...draft, price: e.target.value })}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
            </div>
            {edit.kind === 'product' && (
              <div className="mb-2.5">
                <label className="block text-[11px] font-bold text-gray-600 mb-1">الكمية المتاحة</label>
                <input type="number" value={draft.qty} onChange={(e) => setDraft({ ...draft, qty: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm" />
              </div>
            )}
            <button onClick={saveEdit} disabled={busy === edit.item_id}
              className="w-full mt-1 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {busy === edit.item_id ? 'بيحفظ…' : 'حفظ'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
