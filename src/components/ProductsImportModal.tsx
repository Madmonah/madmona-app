'use client'
// =====================================================================
// 📥 استيراد المنتجات من إكسيل/CSV (٩/٩/٢٠٢٦ — آخر الليل)
// محمد: «تاب استيراد إكسيل للمنتجات علشان صاحب البيزنس مايضفش واحد واحد».
// الملف بيتقرا في المتصفح (xlsx — موجود أصلًا في الويزارد)، الأعمدة بتتعرف بأسمائها العربي/الإنجليزي،
// معاينة أول ٥ صفوف، وبعدين business_products_import (upsert بالاسم أو SKU) عبر financeRpc.
// =====================================================================
import { useState } from 'react'
import { Loader2, X, FileSpreadsheet } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

type Row = { name_ar: string; selling_price_egp?: number | null; cost_price_egp?: number | null; current_stock?: number | null; reorder_threshold?: number | null; unit?: string | null; sku?: string | null; item_class?: string | null; notes?: string | null; image_url?: string | null; category?: string | null }

const HEADERS: Record<keyof Row, string[]> = {
  name_ar: ['الاسم', 'اسم المنتج', 'المنتج', 'الصنف', 'name', 'product', 'item', 'name_ar'],
  selling_price_egp: ['سعر البيع', 'السعر', 'البيع', 'price', 'selling_price', 'sell price', 'selling_price_egp'],
  cost_price_egp: ['التكلفة', 'سعر التكلفة', 'الشراء', 'cost', 'cost_price', 'cost_price_egp'],
  current_stock: ['المخزون', 'المتاح', 'الكمية', 'الرصيد', 'stock', 'qty', 'quantity', 'current_stock'],
  reorder_threshold: ['حد الطلب', 'حد إعادة الطلب', 'reorder', 'reorder_threshold', 'min'],
  unit: ['الوحدة', 'unit'],
  sku: ['الكود', 'كود', 'sku', 'code', 'barcode', 'باركود'],
  item_class: ['النوع', 'نوع', 'type', 'class', 'item_class'],
  notes: ['ملاحظات', 'وصف', 'notes', 'description'],
  image_url: ['الصورة', 'رابط الصورة', 'image', 'image_url', 'photo'],
  category: ['القسم', 'التصنيف', 'الفئة', 'قسم السوق', 'category', 'cat', 'section'],
}
const norm = (s: string) => String(s || '').trim().toLowerCase().replace(/[_\-\s]+/g, ' ')
function mapHeader(h: string): keyof Row | null {
  const n = norm(h)
  for (const k of Object.keys(HEADERS) as (keyof Row)[]) if (HEADERS[k].some(a => norm(a) === n)) return k
  for (const k of Object.keys(HEADERS) as (keyof Row)[]) if (HEADERS[k].some(a => n.includes(norm(a)))) return k
  return null
}
const num = (v: unknown) => { const x = Number(String(v ?? '').replace(/[^\d.\-]/g, '')); return Number.isFinite(x) ? x : null }

export default function ProductsImportModal({ supplierId, onClose, onDone }: { supplierId: string; onClose: () => void; onDone: (r: { inserted: number; updated: number; skipped: number; guessed: number }) => void }) {
  const [rows, setRows] = useState<Row[]>([])
  const [cols, setCols] = useState<string[]>([])
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; e.target.value = ''
    if (!f) return
    setErr(null); setBusy(true)
    try {
      const XLSX = await import('xlsx')
      const buf = await f.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: '' })
      if (!raw.length) { setErr('الملف فاضي'); return }
      const headers = Object.keys(raw[0])
      const map: Record<string, keyof Row | null> = {}
      headers.forEach(h => { map[h] = mapHeader(h) })
      if (!Object.values(map).includes('name_ar')) { setErr('مش لاقي عمود الاسم — سمّي العمود «الاسم» أو name'); return }
      const out: Row[] = raw.map(r => {
        const o: Partial<Row> = {}
        for (const h of headers) {
          const k = map[h]; if (!k) continue
          const v = r[h]
          if (k === 'name_ar' || k === 'unit' || k === 'sku' || k === 'item_class' || k === 'notes' || k === 'image_url' || k === 'category') (o as Record<string, unknown>)[k] = String(v ?? '').trim() || null
          else (o as Record<string, unknown>)[k] = num(v)
        }
        return o as Row
      }).filter(o => o.name_ar)
      setCols(Object.keys(map).filter(h => map[h]).map(h => `${h} → ${map[h]}`))
      setRows(out)
    } catch { setErr('مقدرناش نقرا الملف — جرّب .xlsx أو .csv') } finally { setBusy(false) }
  }
  async function submit() {
    setBusy(true); setErr(null)
    const { data, error } = await financeRpc('business_products_import', { p_supplier_id: supplierId, p_rows: rows })
    setBusy(false)
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'الاستيراد ماتمّش'); return }
    onDone({ inserted: Number(data.inserted || 0), updated: Number(data.updated || 0), skipped: Number(data.skipped || 0), guessed: Number(data.guessed_category || 0) })
  }
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-lg md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-black text-[#1A2E26] flex items-center gap-2"><FileSpreadsheet className="w-4 h-4 text-[#059669]" /> استيراد منتجات من إكسيل</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <p className="text-[12px] text-[#6B7280] leading-relaxed">الملف (.xlsx أو .csv) أول صف فيه أسماء الأعمدة. المطلوب عمود <b>الاسم</b> بس، والباقي اختياري: <b>سعر البيع · التكلفة · المخزون · الوحدة · الكود · النوع</b> (منتج/خامة/مستهلك) · <b>القسم</b> (اسم قسم السوق — لو ناقص بنحدده من اسم المنتج) · ملاحظات · رابط الصورة. المنتج اللي اسمه أو كوده موجود بيتحدّث مش بيتكرر.</p>
          <label className="block">
            <span className="px-3 py-2 rounded-xl border border-[#059669]/30 text-[#059669] text-[12px] font-black inline-flex items-center gap-1.5 cursor-pointer">{busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />} اختار الملف</span>
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={onFile} />
          </label>
          {cols.length > 0 && <p className="text-[10px] text-[#6B7280]">الأعمدة اللي اتعرفت: {cols.join(' · ')}</p>}
          {rows.length > 0 && (
            <div className="rounded-xl border border-gray-100 overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead className="bg-[#FAFAF7]"><tr><th className="p-2 text-right">الاسم</th><th className="p-2">البيع</th><th className="p-2">التكلفة</th><th className="p-2">المخزون</th><th className="p-2">الوحدة</th><th className="p-2">النوع</th></tr></thead>
                <tbody>{rows.slice(0, 5).map((r, i) => <tr key={i} className="border-t border-gray-50"><td className="p-2">{r.name_ar}</td><td className="p-2 text-center font-mono">{r.selling_price_egp ?? '—'}</td><td className="p-2 text-center font-mono">{r.cost_price_egp ?? '—'}</td><td className="p-2 text-center font-mono">{r.current_stock ?? '—'}</td><td className="p-2 text-center">{r.unit || '—'}</td><td className="p-2 text-center">{r.item_class || 'منتج'}</td></tr>)}</tbody>
              </table>
              {rows.length > 5 && <p className="text-[10px] text-[#6B7280] p-2">… و{rows.length - 5} صف كمان</p>}
            </div>
          )}
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button onClick={submit} disabled={busy || rows.length === 0} className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري الاستيراد…</> : `استورد ${rows.length} صف`}
          </button>
        </div>
      </div>
    </div>
  )
}
