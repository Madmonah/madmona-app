'use client'
// ============================================================================
// 🔀 /supplier/erp/catalog — إيه اللي يظهر في الماركت بليس
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «خلي فيه تاب من الـB2B تفعّل عرض المنتجات
//   على الماركت بليس أو لا».
//
// المورد بيشوف كل منتجاته وخدماته في مكان واحد، وقدام كل واحد مفتاح.
// ⚠️ الافتراضي **مخفي** — عشان المخزون الداخلي مايتعرضش بالغلط.
//    (مخزون صالون Elite: ٢٤٠ صنف شامبو وصبغة بيستهلكهم في الشغل،
//     مش للبيع.)
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import { Loader2, ArrowRight, Store, Eye, EyeOff, Package, Tag, Search, AlertCircle } from 'lucide-react'

type Item = {
  kind: 'product' | 'service' | 'menu_item' | 'rental'
  item_id: string
  name: string
  price: number | null
  listing_id: string | null
  on_marketplace: boolean
  is_active: boolean
}

const KIND: Record<string, { label: string; icon: typeof Package }> = {
  product: { label: 'منتج', icon: Package },
  service: { label: 'خدمة', icon: Tag },
  menu_item: { label: 'صنف منيو', icon: Package },
  rental: { label: 'للإيجار', icon: Store },
}

export default function CatalogPage() {
  // 🌍 (٢ سبتمبر ٢٠٢٦) ترجمة شاشات الإدارة
  const { t } = useT()
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [q, setQ] = useState('')
  const [filter, setFilter] = useState<'all' | 'shown' | 'hidden'>('all')

  const load = useCallback(async (sid: string) => {
    const { data } = await (supabaseBrowser as unknown as {
      from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { order: (c: string) => Promise<{ data: unknown }> } } }
    }).from('v_sellable_catalog').select('*').eq('supplier_id', sid).order('name')
    setRows((data as Item[]) || [])
  }, [])

  useEffect(() => {
    (async () => {
      const acc = await resolveBusiness()
      if (!acc.business) { setLoading(false); return }
      setBiz(acc.business); await load(acc.business.id); setLoading(false)
    })()
  }, [load])

  async function toggle(it: Item) {
    if (it.kind === 'menu_item') return   // المنيو بيتدار من شاشة المنيو
    setBusy(it.item_id)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)('toggle_catalog_visibility', {
        p_kind: it.kind, p_item_id: it.item_id, p_publish: !it.on_marketplace,
      })
      const r = data as { ok: boolean; published: boolean }
      if (r?.ok) {
        setRows((list) => list.map((x) =>
          x.item_id === it.item_id ? { ...x, on_marketplace: r.published } : x))
      }
    } catch (e) {
      alert(e instanceof Error ? e.message : t('erp.error'))
    }
    setBusy(null)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">{t('erp.suppliers_only')}</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">{t('erp.back_market')}</Link>
    </div>
  )

  const shown = rows
    .filter((r) => filter === 'all' ? true : filter === 'shown' ? r.on_marketplace : !r.on_marketplace)
    .filter((r) => !q.trim() || (r.name || '').includes(q.trim()))
  const onCount = rows.filter((r) => r.on_marketplace).length

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24" dir="rtl">
      <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
        <ArrowRight className="w-3 h-3" /> نظام الإدارة
      </Link>
      <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
        <Store className="w-5 h-5 text-[#059669]" /> العرض في الماركت بليس
      </h1>
      <p className="text-[11.5px] text-gray-500 mb-4 leading-relaxed">
        اختار إيه اللي يشوفه العملاء وإيه اللي يفضل داخلي عندك.
        <b> المخفي مايظهرش لحد</b> — مفيد للخامات والمخزون اللي بتستهلكه في شغلك.
      </p>

      <div className="grid grid-cols-2 gap-2 mb-4">
        <Stat label={t('erp.visible_to_customers')} v={onCount} good />
        <Stat label={t('erp.internal')} v={rows.length - onCount} />
      </div>

      <div className="flex gap-1.5 mb-3 overflow-x-auto pb-1">
        {([['all', t('erp.all')], ['shown', t('erp.visible')], ['hidden', t('erp.internal')]] as const).map(([k, l]) => (
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
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('erp.search_name')}
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">
            {rows.length === 0 ? t('erp.no_catalog') : t('erp.no_results')}
          </p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {shown.map((it) => {
            const k = KIND[it.kind] || KIND.product
            const isMenu = it.kind === 'menu_item'
            return (
              <div key={it.kind + it.item_id}
                className="flex items-center gap-3 rounded-2xl border border-gray-200 bg-white p-3">
                <k.icon className="w-4 h-4 text-gray-400 shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-gray-900 truncate">{it.name}</p>
                  <p className="text-[11px] text-gray-500">
                    {k.label}
                    {it.price ? ` · ${Number(it.price).toLocaleString('ar-EG')} ج.م` : ''}
                  </p>
                </div>
                {isMenu ? (
                  <span className="text-[10.5px] font-bold text-gray-400 shrink-0">{t('erp.from_menu')}</span>
                ) : (
                  <button onClick={() => toggle(it)} disabled={busy === it.item_id}
                    className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-[11.5px] font-black transition ${
                      it.on_marketplace
                        ? 'bg-[#34D399]/15 text-[#059669]'
                        : 'bg-[#F1EEE6] text-gray-500'}`}>
                    {busy === it.item_id
                      ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      : it.on_marketplace ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    {it.on_marketplace ? t('erp.visible') : t('erp.internal')}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 mt-4 flex items-start gap-2">
        <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-[11px] text-amber-900 leading-relaxed">
          لما تفعّل العرض، بيتعمل إعلان في الماركت بليس بنفس الاسم والسعر.
          ولو أوقفته، الإعلان بيتوقف <b>مش بيتمسح</b> — تقدر ترجّعه أي وقت.
        </p>
      </div>
    </div>
  )
}

function Stat({ label, v, good }: { label: string; v: number; good?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <p className="text-[11px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`font-black tabular text-lg ${good ? 'text-[#059669]' : 'text-gray-800'}`}>{v}</p>
    </div>
  )
}
