'use client'
// =====================================================================
// 🧱 ProductMaterialsModal — ربط المنتج النهائي بالمنتج الأولي (الخامات) (٩/٩/٢٠٢٦ — آخر الليل)
// محمد: «لازم يكون فيه تاب لمنتج أولي بيدخل في خدمة أو منتج نهائي ونربط المنتج النهائي
// أو الخدمة بالمنتج الأولي». الخامات = inventory_products بـitem_class material/consumable
// (تاب «الخامات»). الربط في product_material_consumption — والبيع اليدوي بيخصم الخامات
// المربوطة تلقائيًا. الخدمات ليها نفس الربط في «استهلاك الخدمة من المخزون».
// =====================================================================
import { useEffect, useState } from 'react'
import { Loader2, X, Boxes } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

type Mat = { id: string; name: string; unit: string | null; stock: number | null; cost: number | null; item_class: string | null }

export default function ProductMaterialsModal({ supplierId, productId, productName, onClose, onSaved }: {
  supplierId: string; productId: string; productName: string; onClose: () => void; onSaved: (n: number) => void
}) {
  const [mats, setMats] = useState<Mat[]>([])
  const [qty, setQty] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    (async () => {
      const { data, error } = await financeRpc('admin_list_product_materials', { p_supplier_id: supplierId, p_product_id: productId })
      if (error || !data?.ok) { setErr(error?.message || data?.error || 'مش قادرين نحمّل الخامات'); setLoading(false); return }
      setMats(data.materials || [])
      const q: Record<string, string> = {}
      for (const l of (data.links || []) as { material_id: string; qty: number }[]) q[l.material_id] = String(l.qty)
      setQty(q); setLoading(false)
    })()
  }, [supplierId, productId])
  async function save() {
    setBusy(true); setErr(null)
    const mappings = Object.entries(qty).filter(([, v]) => Number(v) > 0).map(([material_id, v]) => ({ material_id, qty: Number(v) }))
    const { data, error } = await financeRpc('admin_set_product_materials', { p_supplier_id: supplierId, p_product_id: productId, p_mappings: mappings })
    setBusy(false)
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'ماتحفظش'); return }
    onSaved(Number(data.links || 0))
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-black text-[#1A2E26] flex items-center gap-2"><Boxes className="w-4 h-4 text-[#059669]" /> مكوّنات «{productName}»</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <p className="text-[11px] text-[#6B7280]">اكتب كمية كل خامة بتدخل في <b>وحدة واحدة</b> من المنتج. لما تسجّل بيع، الخامات دي بتتخصم من المخزون لوحدها.</p>
          {loading ? <div className="py-6 text-center"><Loader2 className="w-5 h-5 animate-spin inline text-[#059669]" /></div>
            : mats.length === 0 ? <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">مفيش خامات مسجّلة — ضيفها من تاب «الخامات (منتج أولي)» الأول.</p>
            : mats.map(m => (
              <div key={m.id} className="flex items-center gap-2 rounded-xl bg-[#FAFAF7] px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-bold text-[#1A2E26] truncate">{m.name}</p>
                  <p className="text-[10px] text-[#6B7280]">{m.item_class === 'consumable' ? 'مستهلك' : 'خامة'} · متاح {Number(m.stock || 0).toLocaleString('ar-EG')} {m.unit || ''}</p>
                </div>
                <input type="number" inputMode="decimal" dir="ltr" placeholder="0" value={qty[m.id] || ''} onChange={e => setQty(q => ({ ...q, [m.id]: e.target.value }))}
                  className="w-20 px-2 py-1.5 rounded-lg bg-white border border-gray-200 text-[16px] md:text-sm font-mono" />
                <span className="text-[10px] text-[#6B7280] w-10">{m.unit || 'وحدة'}</span>
              </div>
            ))}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button onClick={save} disabled={busy || loading} className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحفظ…</> : 'احفظ المكوّنات'}
          </button>
        </div>
      </div>
    </div>
  )
}
