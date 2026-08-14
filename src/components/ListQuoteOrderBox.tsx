'use client'

// ============================================================================
// ListQuoteOrderBox — طلب بقائمة لفئات order_mode='list_quote'
// (سوبر ماركت / صيدليات / خضار). العميل يكتب طلبه بدون أسعار، المحل يسعّر،
// العميل يتابع ويقبل ويدفع. كله inline عبر RPCs:
//   create_list_order → get_order_public (polling) → accept_quote
// ============================================================================

import { useEffect, useRef, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, Plus, X, ShoppingBasket, CheckCircle, RefreshCw, Clock, Wallet } from 'lucide-react'

const supa = supabaseBrowser as any
const INSTAPAY = '5220001000009207'

type Line = { name: string; qty: string; notes: string }
type Step = 'list' | 'sent' | 'quoted' | 'paid'

type OrderView = {
  status: string
  reference_code: string
  subtotal_amount: number
  delivery_fee: number
  total_amount: number
  items: { id: string; name: string; quantity: number; unit_price: number; line_total: number; item_notes: string | null }[]
}

export default function ListQuoteOrderBox({
  supplierId, listingId, listingTitle,
}: { supplierId: string; listingId: string; listingTitle: string }) {
  const [step, setStep] = useState<Step>('list')
  const [lines, setLines] = useState<Line[]>([{ name: '', qty: '1', notes: '' }])
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [city, setCity] = useState('')
  const [district, setDistrict] = useState('')
  const [notes, setNotes] = useState('')

  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [orderId, setOrderId] = useState<string | null>(null)
  const [ref, setRef] = useState<string | null>(null)
  const [order, setOrder] = useState<OrderView | null>(null)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // prefill from session profile (optional)
  useEffect(() => {
    (async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return
        const { data: p } = await supa.from('profiles').select('full_name, phone').eq('id', session.user.id).maybeSingle()
        if (p?.full_name && !name) setName(p.full_name)
        if (p?.phone && !phone) setPhone(p.phone)
      } catch {}
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current) }, [])

  function setLine(i: number, patch: Partial<Line>) {
    setLines(ls => ls.map((l, idx) => idx === i ? { ...l, ...patch } : l))
  }
  function addLine() { setLines(ls => [...ls, { name: '', qty: '1', notes: '' }]) }
  function removeLine(i: number) { setLines(ls => ls.length === 1 ? ls : ls.filter((_, idx) => idx !== i)) }

  async function refresh(oid: string, rc: string) {
    try {
      const { data } = await supa.rpc('get_order_public', { p_order_id: oid, p_reference_code: rc })
      if (!data) return
      setOrder(data as OrderView)
      const st = (data as any).status as string
      if (st === 'quoted') setStep('quoted')
      else if (['pending_payment', 'paid', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'completed'].includes(st)) setStep('paid')
    } catch {}
  }

  function startPolling(oid: string, rc: string) {
    if (pollRef.current) clearInterval(pollRef.current)
    pollRef.current = setInterval(() => refresh(oid, rc), 12000)
  }

  async function submit() {
    setErr(null)
    const cleanLines = lines
      .filter(l => l.name.trim())
      .map(l => ({ name: l.name.trim(), quantity: Math.max(1, parseInt(l.qty || '1', 10) || 1), notes: l.notes.trim() || null }))
    if (cleanLines.length === 0) { setErr('اكتب طلبك الأول — صنف واحد على الأقل'); return }
    if (!name.trim()) { setErr('اكتب اسمك'); return }
    if (!phone.trim()) { setErr('اكتب رقم تليفونك'); return }
    if (!address.trim()) { setErr('اكتب عنوان التوصيل'); return }

    setBusy(true)
    try {
      const { data, error } = await supa.rpc('create_list_order', {
        p_supplier_id: supplierId, p_listing_id: listingId, p_lines: cleanLines,
        p_guest_name: name.trim(), p_guest_phone: phone.trim(), p_delivery_address: address.trim(),
        p_delivery_phone: phone.trim(), p_delivery_city: city.trim() || null,
        p_delivery_district: district.trim() || null, p_delivery_notes: null,
        p_customer_notes: notes.trim() || null,
      })
      setBusy(false)
      if (error) { setErr(error.message || 'حصل خطأ'); return }
      if (!data?.ok) { setErr(data?.error || data?.message || 'حصل خطأ'); return }
      setOrderId(data.order_id); setRef(data.reference_code); setStep('sent')
      startPolling(data.order_id, data.reference_code)
    } catch (e) {
      setBusy(false); setErr(e instanceof Error ? e.message : 'حصل خطأ')
    }
  }

  async function accept() {
    if (!orderId || !ref) return
    setBusy(true); setErr(null)
    try {
      const { data, error } = await supa.rpc('accept_quote', { p_order_id: orderId, p_reference_code: ref, p_payment_reference: null })
      setBusy(false)
      if (error) { setErr(error.message); return }
      if (!data?.ok) { setErr(data?.error || 'حصل خطأ'); return }
      setStep('paid'); await refresh(orderId, ref)
    } catch (e) {
      setBusy(false); setErr(e instanceof Error ? e.message : 'حصل خطأ')
    }
  }

  const fld = 'w-full px-3 py-2.5 bg-[#FAFAF7] border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-[#059669]/50 focus:bg-white'

  // ---------- SENT / QUOTED / PAID ----------
  if (step !== 'list') {
    return (
      <div className="bg-white rounded-3xl shadow-card p-6">
        <div className="flex items-center gap-2 mb-1">
          <ShoppingBasket className="w-5 h-5 text-[#059669]" />
          <h3 className="font-black text-gray-900">طلبك من {listingTitle}</h3>
        </div>
        {ref && <p className="text-xs text-gray-500 mb-4">رقم الطلب: <b className="font-mono">{ref}</b></p>}

        {step === 'sent' && (
          <div className="text-center py-4">
            <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Clock className="w-7 h-7 text-amber-500" />
            </div>
            <p className="text-sm font-bold text-gray-900 mb-1">استلمنا طلبك ✅</p>
            <p className="text-xs text-gray-500 leading-relaxed mb-4">المحل بيراجع الطلب وهيسعّرلك ويبعتلك الإجمالي. سيب الصفحة مفتوحة أو ارجعلها بعد شوية.</p>
            <button onClick={() => orderId && ref && refresh(orderId, ref)} className="inline-flex items-center gap-2 text-xs font-bold text-[#059669] hover:underline">
              <RefreshCw className="w-3.5 h-3.5" /> حدّث الحالة
            </button>
          </div>
        )}

        {(step === 'quoted' || step === 'paid') && order && (
          <>
            <div className="space-y-1.5 mb-3">
              {order.items.map(it => (
                <div key={it.id} className="flex items-center justify-between text-sm border-b border-gray-50 pb-1.5">
                  <span className="text-gray-700">{it.name}{it.quantity > 1 ? ` ×${it.quantity}` : ''}</span>
                  <span className="font-bold text-gray-900 tabular">{Number(it.line_total).toLocaleString('ar-EG')} ج</span>
                </div>
              ))}
            </div>
            <div className="space-y-1 text-sm mb-4">
              <div className="flex justify-between text-gray-500"><span>المجموع</span><span className="tabular">{Number(order.subtotal_amount).toLocaleString('ar-EG')} ج</span></div>
              {Number(order.delivery_fee) > 0 && <div className="flex justify-between text-gray-500"><span>التوصيل</span><span className="tabular">{Number(order.delivery_fee).toLocaleString('ar-EG')} ج</span></div>}
              <div className="flex justify-between font-black text-[#059669] text-base pt-1 border-t border-gray-100"><span>الإجمالي</span><span className="tabular">{Number(order.total_amount).toLocaleString('ar-EG')} ج</span></div>
            </div>

            {step === 'quoted' && (
              <button onClick={accept} disabled={busy} className="w-full flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:-translate-y-0.5 transition-all disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wallet className="w-4 h-4" />}
                اقبل وادفع
              </button>
            )}

            {step === 'paid' && (
              <div className="bg-[#34D399]/5 border border-[#059669]/15 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-[#059669]" />
                  <p className="text-sm font-black text-[#059669]">اتأكد الطلب — باقي الدفع</p>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed mb-2">حوّل <b>{Number(order.total_amount).toLocaleString('ar-EG')} ج</b> على إنستاباي:</p>
                <p className="font-mono font-black text-lg text-gray-900 select-all bg-white rounded-xl py-2 text-center border border-gray-100" dir="ltr">{INSTAPAY}</p>
                <p className="text-[11px] text-gray-500 mt-2 leading-relaxed">بعد التحويل المحل بيأكّد ويجهّز طلبك ويتحرك للتوصيل.</p>
              </div>
            )}
          </>
        )}

        {err && <p className="text-xs text-red-600 mt-3">{err}</p>}
      </div>
    )
  }

  // ---------- LIST FORM ----------
  return (
    <div className="bg-white rounded-3xl shadow-card p-6">
      <div className="flex items-center gap-2 mb-1">
        <ShoppingBasket className="w-5 h-5 text-[#059669]" />
        <h3 className="font-black text-gray-900">اطلب من {listingTitle}</h3>
      </div>
      <p className="text-xs text-gray-500 mb-4 leading-relaxed">اكتب اللي عايزه والمحل هيسعّرلك ويبعتلك الإجمالي — تدفع بعد ما توافق.</p>

      <div className="space-y-2 mb-3">
        {lines.map((l, i) => (
          <div key={i} className="flex items-start gap-2">
            <input className={fld} placeholder="مثلاً: ٢ كيلو طماطم" value={l.name} onChange={e => setLine(i, { name: e.target.value })} />
            <input className={`${fld} w-16 text-center flex-shrink-0`} inputMode="numeric" placeholder="كمية" value={l.qty} onChange={e => setLine(i, { qty: e.target.value.replace(/\D/g, '') })} />
            <button onClick={() => removeLine(i)} className="w-9 h-9 flex-shrink-0 rounded-xl bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 flex items-center justify-center transition-colors" title="شيل">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
      <button onClick={addLine} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#059669] hover:underline mb-4">
        <Plus className="w-3.5 h-3.5" /> ضيف صنف
      </button>

      <div className="space-y-2 pt-3 border-t border-gray-100">
        <div className="grid grid-cols-2 gap-2">
          <input className={fld} placeholder="اسمك" value={name} onChange={e => setName(e.target.value)} />
          <input className={fld} placeholder="تليفونك" inputMode="tel" dir="ltr" value={phone} onChange={e => setPhone(e.target.value)} />
        </div>
        <input className={fld} placeholder="عنوان التوصيل بالتفصيل" value={address} onChange={e => setAddress(e.target.value)} />
        <div className="grid grid-cols-2 gap-2">
          <input className={fld} placeholder="المدينة (اختياري)" value={city} onChange={e => setCity(e.target.value)} />
          <input className={fld} placeholder="المنطقة (اختياري)" value={district} onChange={e => setDistrict(e.target.value)} />
        </div>
        <textarea className={`${fld} resize-none`} rows={2} placeholder="ملاحظات للمحل (اختياري)" value={notes} onChange={e => setNotes(e.target.value)} />
      </div>

      {err && <p className="text-xs text-red-600 mt-3">{err}</p>}

      <button onClick={submit} disabled={busy} className="mt-4 w-full flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-3.5 rounded-2xl font-bold text-sm shadow-elevated hover:shadow-luxe hover:-translate-y-0.5 transition-all disabled:opacity-50">
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingBasket className="w-4 h-4" />}
        ابعت الطلب للمحل
      </button>
      <p className="text-[11px] text-gray-400 mt-2 text-center leading-relaxed">معاملاتك مضمونة · الدفع بعد موافقتك على السعر</p>
    </div>
  )
}
