'use client'
// ============================================================================
// 🧰 /supplier/erp/materials — المواد والأدوات (مخزون داخلي)
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز أتأكد إن أي بيزنس يكون ليه مخزون منتج
//   نهائي ومخزون مواد أولية قابل للتعديل، والكلام ده **مش بس للتصنيع
//   كمان للخدمات** اللي ممكن تكون محتاجة منتجات أو أدوات زي إيليت».
//
// الفرق عن /products: ده المخزون **الداخلي** — بتستهلكه في شغلك
// مش بتبيعه. الصالون: صبغة وأسيتون. المطعم: خامات طبخ. المصنع: أخشاب.
// 🔒 حارس في الداتابيز بيمنع عرض أي حاجة هنا في الماركت بليس.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { useT } from '@/lib/i18n/LanguageProvider'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { resolveBusiness, type Business } from '@/lib/business-access'
import { Loader2, Plus, Boxes, ArrowRight, X, AlertTriangle, Search, Wrench } from 'lucide-react'

type Item = {
  id: string
  name_ar: string
  sku: string | null
  unit: string | null
  current_stock: number | null
  reorder_threshold: number | null
  cost_price_egp: number | null
  item_class: string
  notes: string | null
  active: boolean | null
}

const CLASS_LABEL: Record<string, string> = {
  material: 'خامة',
  consumable: 'مستهلك',
  asset: 'أداة / جهاز',
}

export default function MaterialsPage() {
  // 🌍 (٢ سبتمبر ٢٠٢٦) ترجمة شاشات الإدارة
  const { t } = useT()
  const [biz, setBiz] = useState<Business | null>(null)
  const [rows, setRows] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [form, setForm] = useState<Partial<Item> | null>(null)
  const [saving, setSaving] = useState(false)

  const db = supabaseBrowser as unknown as {
    from: (t: string) => {
      select: (c: string) => { eq: (a: string, b: unknown) => { in: (c: string, v: string[]) => { order: (c: string) => Promise<{ data: unknown }> } } }
      insert: (v: unknown) => Promise<{ error: { message: string } | null }>
      update: (v: unknown) => { eq: (a: string, b: unknown) => Promise<{ error: { message: string } | null }> }
    }
  }

  const load = useCallback(async (sid: string) => {
    const { data } = await db.from('inventory_products').select('*')
      .eq('supplier_id', sid).in('item_class', ['material', 'consumable', 'asset']).order('name_ar')
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
    if (!biz || !form?.name_ar?.trim()) { alert('اكتب اسم الصنف'); return }
    setSaving(true)
    const payload = {
      supplier_id: biz.id,
      name_ar: form.name_ar.trim(),
      sku: form.sku || null,
      unit: form.unit || t('erp.unit_piece'),
      current_stock: Number(form.current_stock) || 0,
      reorder_threshold: Number(form.reorder_threshold) || 0,
      cost_price_egp: Number(form.cost_price_egp) || 0,
      item_class: form.item_class || 'material',
      notes: form.notes || null,
      active: true,
      publish_to_marketplace: false,   // 🔒 المخزون الداخلي مايتعرضش أبدًا
    }
    const { error } = form.id
      ? await db.from('inventory_products').update(payload).eq('id', form.id)
      : await db.from('inventory_products').insert(payload)
    setSaving(false)
    if (error) { alert(error.message); return }
    setForm(null); await load(biz.id)
  }

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>
  if (!biz) return (
    <div className="max-w-md mx-auto py-20 px-4 text-center" dir="rtl">
      <h1 className="font-black text-lg mb-2">{t('erp.suppliers_only')}</h1>
      <Link href="/marketplace" className="text-[#059669] font-bold text-sm">{t('erp.back_market')}</Link>
    </div>
  )

  const isLow = (r: Item) => Number(r.reorder_threshold) > 0 && Number(r.current_stock) <= Number(r.reorder_threshold)
  const low = rows.filter(isLow)
  const shown = rows
    .filter((r) => !onlyLow || isLow(r))
    .filter((r) => !q.trim() || (r.name_ar || '').includes(q.trim()))

  return (
    <div className="max-w-4xl mx-auto p-4 pb-24" dir="rtl">
      <div className="flex items-center justify-between mb-2 gap-2">
        <div>
          <Link href="/supplier/erp" className="text-[11px] text-gray-500 font-bold flex items-center gap-1 mb-1">
            <ArrowRight className="w-3 h-3" /> نظام الإدارة
          </Link>
          <h1 className="text-lg font-black text-gray-900 flex items-center gap-2">
            <Wrench className="w-5 h-5 text-[#059669]" /> المواد والأدوات
          </h1>
        </div>
        <button onClick={() => setForm({ unit: t('erp.unit_piece'), current_stock: 0, item_class: 'material' })}
          className="px-3 py-2 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-black flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> صنف جديد
        </button>
      </div>

      <p className="text-[11.5px] text-gray-500 mb-4 leading-relaxed">
        ده مخزونك <b>الداخلي</b> — اللي بتستهلكه في شغلك مش بتبيعه.
        <br />
        🔒 مابيظهرش في الماركت بليس أبدًا. لو عايز تبيع حاجة، حطها في <b>منتجاتي</b>.
      </p>

      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stat label={t('erp.all_items')} v={rows.length} />
        <Stat label={t('erp.materials')} v={rows.filter((r) => r.item_class !== 'asset').length} />
        <Stat label={t('erp.needs_reorder')} v={low.length} warn={low.length > 0} />
      </div>

      {low.length > 0 && !onlyLow && (
        <button onClick={() => setOnlyLow(true)}
          className="w-full rounded-2xl bg-amber-50 border border-amber-200 p-3 mb-3 text-right">
          <p className="text-xs font-black text-amber-900 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> {low.length} صنف وصل حد إعادة الطلب — اضغط للعرض
          </p>
        </button>
      )}
      {onlyLow && (
        <button onClick={() => setOnlyLow(false)} className="text-[11.5px] font-bold text-[#059669] mb-2">
          ← عرض الكل
        </button>
      )}

      {rows.length > 6 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('erp.search_name')}
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Boxes className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">
            {rows.length === 0 ? t('erp.no_materials') : t('erp.no_results')}
          </p>
          {rows.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
              سجّل خاماتك وأدواتك — والنظام هينبّهك لما حاجة تقرب تخلص.
            </p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white">
          <table className="w-full text-xs">
            <thead className="bg-[#F5F4F0] text-gray-600">
              <tr><Th>{t('erp.item')}</Th><Th>{t('erp.type')}</Th><Th>{t('erp.available')}</Th><Th>{t('erp.reorder_short')}</Th><Th>{t('erp.cost')}</Th><Th></Th></tr>
            </thead>
            <tbody>
              {shown.map((r) => (
                <tr key={r.id} className={`border-t border-gray-100 ${isLow(r) ? 'bg-amber-50/50' : ''}`}>
                  <td className="px-2.5 py-2.5">
                    <p className="font-bold text-gray-900">{r.name_ar}</p>
                    {r.sku && <p className="text-[10.5px] text-gray-400" dir="ltr">{r.sku}</p>}
                  </td>
                  <td className="px-2.5 py-2.5 text-gray-500">{CLASS_LABEL[r.item_class] || r.item_class}</td>
                  <td className="px-2.5 py-2.5 tabular font-bold">
                    <span className={isLow(r) ? 'text-amber-700' : ''}>
                      {Number(r.current_stock || 0).toLocaleString('ar-EG')}
                    </span>
                    <span className="text-gray-400 text-[10.5px]"> {r.unit}</span>
                  </td>
                  <td className="px-2.5 py-2.5 tabular text-gray-500">{Number(r.reorder_threshold || 0).toLocaleString('ar-EG')}</td>
                  <td className="px-2.5 py-2.5 tabular text-gray-600">{Number(r.cost_price_egp || 0).toLocaleString('ar-EG')}</td>
                  <td className="px-2.5 py-2.5">
                    <button onClick={() => setForm(r)} className="text-[11px] font-bold text-[#059669]">{t('erp.edit')}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {form && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setForm(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4 max-h-[88vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-black text-base">{form.id ? t('erp.edit_item') : t('erp.new_item')}</h2>
              <button onClick={() => setForm(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <F label="الاسم *"><input value={form.name_ar || ''} onChange={(e) => setForm({ ...form, name_ar: e.target.value })} className={INP} /></F>
            <F label={t('erp.type')}>
              <select value={form.item_class || 'material'} onChange={(e) => setForm({ ...form, item_class: e.target.value })} className={INP}>
                <option value="material">خامة (بتدخل في المنتج)</option>
                <option value="consumable">مستهلك (بيتستخدم ويخلص)</option>
                <option value="asset">أداة أو جهاز</option>
              </select>
            </F>
            <div className="grid grid-cols-2 gap-2">
              <F label={t('erp.qty_available')}><input type="number" value={form.current_stock ?? 0} onChange={(e) => setForm({ ...form, current_stock: Number(e.target.value) })} className={INP} /></F>
              <F label={t('erp.unit')}><input value={form.unit || ''} onChange={(e) => setForm({ ...form, unit: e.target.value })} className={INP} placeholder="قطعة · لتر · كيلو · متر" /></F>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <F label={t('erp.reorder_level')}><input type="number" value={form.reorder_threshold ?? 0} onChange={(e) => setForm({ ...form, reorder_threshold: Number(e.target.value) })} className={INP} /></F>
              <F label={t('erp.cost_price')}><input type="number" value={form.cost_price_egp ?? 0} onChange={(e) => setForm({ ...form, cost_price_egp: Number(e.target.value) })} className={INP} /></F>
            </div>
            <F label="كود (اختياري)"><input value={form.sku || ''} onChange={(e) => setForm({ ...form, sku: e.target.value })} className={INP} dir="ltr" /></F>
            <button onClick={save} disabled={saving}
              className="w-full mt-2 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {saving ? t('erp.saving') : t('erp.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

const INP = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm'
function Th({ children }: { children?: React.ReactNode }) {
  return <th className="px-2.5 py-2 text-right font-bold whitespace-nowrap">{children}</th>
}
function F({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="mb-2.5"><label className="block text-[11px] font-bold text-gray-600 mb-1">{label}</label>{children}</div>
}
function Stat({ label, v, warn }: { label: string; v: number; warn?: boolean }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-3">
      <p className="text-[11px] text-gray-500 font-bold mb-0.5">{label}</p>
      <p className={`font-black tabular text-lg ${warn ? 'text-amber-700' : 'text-gray-900'}`}>{v}</p>
    </div>
  )
}
