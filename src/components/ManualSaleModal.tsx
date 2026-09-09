'use client'
// =====================================================================
// 🧾 ManualSaleModal — «سجّل بيع» يدوي لمنتج أو خدمة (٩/٩/٢٠٢٦ — آخر الليل)
// محمد: «المنتج أو الخدمة لو هيتم تسجيلهم يدوي مش عن طريق إدارة الحجوزات هيحصل ده إزاي؟»
// البيع في المحل (كاش/كارت) بيتسجّل من هنا → record_manual_sale: قيد دخل «مبيعات» في
// الحسابات + خصم من مخزون المنتج. نفس الكومبوننت في شاشة المنتجات وشاشة الخدمات.
// =====================================================================
import { useState } from 'react'
import { Loader2, X, ShoppingBag } from 'lucide-react'
import { financeRpc } from '@/lib/financeRpc'

export type SaleItem = { id: string; name: string; unitPrice: number | null; kind: 'product' | 'service'; unit?: string | null }

export default function ManualSaleModal({ supplierId, item, currency, onClose, onDone }: {
  supplierId: string; item: SaleItem; currency?: string; onClose: () => void; onDone: (r: { amount: number; stock_left: number | null }) => void
}) {
  const [qty, setQty] = useState('1')
  const [amount, setAmount] = useState(item.unitPrice != null ? String(item.unitPrice) : '')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [method, setMethod] = useState('cash')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const cur = currency || 'ج'
  const onQty = (v: string) => { setQty(v); if (item.unitPrice != null) setAmount(String((Number(v) || 0) * item.unitPrice)) }
  async function submit() {
    setBusy(true); setErr(null)
    const { data, error } = await financeRpc('record_manual_sale', {
      p_supplier_id: supplierId, p_kind: item.kind, p_item_id: item.id, p_qty: Number(qty) || 1,
      p_amount: amount ? Number(amount) : null, p_customer_name: name || null, p_customer_phone: phone || null,
      p_payment_method: method, p_note: note || null,
    })
    setBusy(false)
    if (error || !data?.ok) { setErr(error?.message || data?.error || 'ماتسجّلش'); return }
    onDone({ amount: Number(data.amount || 0), stock_left: data.stock_left ?? null })
  }
  const I = 'w-full px-3 py-2 rounded-xl bg-[#FAFAF7] text-[16px] md:text-sm'
  return (
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center" dir="rtl">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-t-3xl md:rounded-3xl w-full md:max-w-md md:mx-4 max-h-[90vh] overflow-y-auto shadow-2xl">
        <header className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-black text-[#1A2E26] flex items-center gap-2"><ShoppingBag className="w-4 h-4 text-[#059669]" /> سجّل بيع — {item.name}</h2>
          <button onClick={onClose}><X className="w-5 h-5 text-[#6B7280]" /></button>
        </header>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="text-[10px] font-bold text-[#6B7280]">الكمية{item.unit ? ` (${item.unit})` : ''}</span>
              <input type="number" inputMode="decimal" value={qty} onChange={e => onQty(e.target.value)} className={I} dir="ltr" /></label>
            <label className="block"><span className="text-[10px] font-bold text-[#6B7280]">الإجمالي ({cur})</span>
              <input type="number" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} className={I} dir="ltr" /></label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <label className="block"><span className="text-[10px] font-bold text-[#6B7280]">اسم العميل (اختياري)</span><input value={name} onChange={e => setName(e.target.value)} className={I} /></label>
            <label className="block"><span className="text-[10px] font-bold text-[#6B7280]">رقمه (اختياري)</span><input value={phone} onChange={e => setPhone(e.target.value)} className={I} dir="ltr" inputMode="tel" /></label>
          </div>
          <label className="block"><span className="text-[10px] font-bold text-[#6B7280]">طريقة الدفع</span>
            <select value={method} onChange={e => setMethod(e.target.value)} className={I}>
              <option value="cash">كاش</option><option value="card">كارت</option><option value="instapay">إنستاباي</option><option value="transfer">تحويل</option>
            </select></label>
          <label className="block"><span className="text-[10px] font-bold text-[#6B7280]">ملاحظة</span><input value={note} onChange={e => setNote(e.target.value)} className={I} /></label>
          {err && <p className="text-xs text-red-600">{err}</p>}
          <button onClick={submit} disabled={busy || !(Number(amount) > 0)} className="w-full py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50 flex items-center justify-center gap-2">
            {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> جاري التسجيل…</> : 'سجّل البيع في الحسابات'}
          </button>
          <p className="text-[10px] text-[#6B7280] text-center">بيتسجّل دخل «مبيعات» في الحسابات{item.kind === 'product' ? ' وبيتخصم من المخزون' : ''}.</p>
        </div>
      </div>
    </div>
  )
}
