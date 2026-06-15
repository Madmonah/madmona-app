'use client'

// ============================================================================
// /admin/business-finance/[supplierId]/quote-orders
// شاشة تسعير المحل: طلبات «اكتب طلبك» (سوبر ماركت/صيدلية/خضار).
// المحل يحط سعر كل صنف + توصيل ويبعت → العميل يدفع. محمي بالـlayout.
// RPCs: madmona_list_quote_orders / madmona_quote_order (token المالك أو is_admin).
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Loader2, ArrowRight, ShoppingBasket, RefreshCw, Send, CheckCircle, Clock, MapPin, Phone, StickyNote } from 'lucide-react'

const supa = supabaseBrowser as any

type Item = { item_id: string; name: string; quantity: number; unit_price: number; line_total: number; notes: string | null }
type Order = {
  id: string; reference_code: string; status: string
  customer_name: string; customer_phone: string | null
  delivery_address: string | null; delivery_city: string | null; delivery_district: string | null
  customer_notes: string | null; subtotal_amount: number; delivery_fee: number; total_amount: number
  created_at: string; items: Item[]
}
type Draft = { prices: Record<string, string>; qtys: Record<string, string>; fee: string; notes: string }

export default function QuoteOrdersPage() {
  const { supplierId } = useParams() as { supplierId: string }
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, Draft>>({})
  const [busy, setBusy] = useState<string | null>(null)
  const [flash, setFlash] = useState<string | null>(null)

  const token = () => (typeof window !== 'undefined' ? localStorage.getItem('madmona_token') : null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const { data, error } = await supa.rpc('madmona_list_quote_orders', { p_token: token(), p_supplier_id: supplierId })
      setLoading(false)
      if (error) { setErr(error.message); return }
      if (!data?.ok) { setErr(data?.error || 'حصل خطأ'); return }
      const list = (data.orders || []) as Order[]
      setOrders(list)
      // seed drafts from items
      setDrafts(prev => {
        const next = { ...prev }
        for (const o of list) {
          if (!next[o.id]) {
            const prices: Record<string, string> = {}; const qtys: Record<string, string> = {}
            for (const it of o.items || []) {
              prices[it.item_id] = it.unit_price ? String(it.unit_price) : ''
              qtys[it.item_id] = String(it.quantity || 1)
            }
            next[o.id] = { prices, qtys, fee: o.delivery_fee ? String(o.delivery_fee) : '', notes: '' }
          }
        }
        return next
      })
    } catch (e) {
      setLoading(false); setErr(e instanceof Error ? e.message : 'حصل خطأ')
    }
  }, [supplierId])

  useEffect(() => { load() }, [load])

  function setPrice(oid: string, iid: string, v: string) {
    setDrafts(d => ({ ...d, [oid]: { ...d[oid], prices: { ...d[oid].prices, [iid]: v.replace(/[^\d.]/g, '') } } }))
  }
  function setQty(oid: string, iid: string, v: string) {
    setDrafts(d => ({ ...d, [oid]: { ...d[oid], qtys: { ...d[oid].qtys, [iid]: v.replace(/\D/g, '') } } }))
  }
  function setFee(oid: string, v: string) {
    setDrafts(d => ({ ...d, [oid]: { ...d[oid], fee: v.replace(/[^\d.]/g, '') } }))
  }
  function setNote(oid: string, v: string) {
    setDrafts(d => ({ ...d, [oid]: { ...d[oid], notes: v } }))
  }

  function draftTotal(o: Order): number {
    const d = drafts[o.id]; if (!d) return 0
    let sub = 0
    for (const it of o.items) {
      const p = parseFloat(d.prices[it.item_id] || '0') || 0
      const q = parseInt(d.qtys[it.item_id] || String(it.quantity), 10) || it.quantity
      sub += p * q
    }
    return sub + (parseFloat(d.fee || '0') || 0)
  }

  async function sendQuote(o: Order) {
    const d = drafts[o.id]; if (!d) return
    const lines = o.items.map(it => ({
      item_id: it.item_id,
      unit_price: parseFloat(d.prices[it.item_id] || '0') || 0,
      quantity: parseInt(d.qtys[it.item_id] || String(it.quantity), 10) || it.quantity,
    }))
    if (lines.every(l => l.unit_price <= 0)) { setFlash('سعّر صنف واحد على الأقل'); return }
    setBusy(o.id); setFlash(null)
    try {
      const { data, error } = await supa.rpc('madmona_quote_order', {
        p_token: token(), p_order_id: o.id, p_lines: lines,
        p_delivery_fee: parseFloat(d.fee || '0') || 0, p_supplier_notes: d.notes.trim() || null,
      })
      setBusy(null)
      if (error) { setFlash('خطأ: ' + error.message); return }
      if (!data?.ok) { setFlash(data?.error || 'حصل خطأ'); return }
      setFlash(`تم تسعير الطلب وإرساله للعميل — إجمالي ${Number(data.total).toLocaleString('ar-EG')} ج ✅`)
      await load()
    } catch (e) {
      setBusy(null); setFlash(e instanceof Error ? e.message : 'حصل خطأ')
    }
  }

  const awaiting = orders.filter(o => o.status === 'awaiting_quote')
  const quoted = orders.filter(o => o.status === 'quoted')

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-16" dir="rtl">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href={`/admin/business-finance/${supplierId}`} className="w-9 h-9 bg-white shadow-sm rounded-full flex items-center justify-center">
            <ArrowRight className="w-4 h-4 text-gray-700" />
          </Link>
          <div className="flex items-center gap-2 flex-1">
            <ShoppingBasket className="w-5 h-5 text-[#1F6F5F]" />
            <h1 className="text-lg font-black text-gray-900">طلبات التسعير</h1>
          </div>
          <button onClick={load} className="w-9 h-9 bg-white shadow-sm rounded-full flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-5 space-y-4">
        {flash && <div className="bg-[#1F6F5F]/10 text-[#1F6F5F] text-sm font-bold px-4 py-3 rounded-2xl">{flash}</div>}
        {err && <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-2xl">{err === 'مالكش صلاحية' ? 'مالكش صلاحية على المحل ده.' : err}</div>}

        {loading && orders.length === 0 && (
          <div className="text-center py-16"><Loader2 className="w-7 h-7 text-[#1F6F5F] animate-spin mx-auto" /></div>
        )}

        {!loading && orders.length === 0 && !err && (
          <div className="bg-white rounded-3xl border border-dashed border-gray-200 p-10 text-center">
            <ShoppingBasket className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">مفيش طلبات تسعير حاليًا. أول ما عميل يبعت طلب هيظهر هنا.</p>
          </div>
        )}

        {awaiting.length > 0 && (
          <p className="text-[11px] font-black tracking-widest uppercase text-amber-600 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> محتاج تسعير ({awaiting.length})</p>
        )}
        {awaiting.map(o => (
          <OrderCard key={o.id} o={o} draft={drafts[o.id]} busy={busy === o.id} editable
            total={draftTotal(o)} onPrice={setPrice} onQty={setQty} onFee={setFee} onNote={setNote} onSend={() => sendQuote(o)} />
        ))}

        {quoted.length > 0 && (
          <p className="text-[11px] font-black tracking-widest uppercase text-[#1F6F5F] flex items-center gap-1.5 pt-2"><Send className="w-3.5 h-3.5" /> اتبعت للعميل ({quoted.length})</p>
        )}
        {quoted.map(o => (
          <OrderCard key={o.id} o={o} draft={drafts[o.id]} busy={busy === o.id} editable={false}
            total={Number(o.total_amount)} onPrice={setPrice} onQty={setQty} onFee={setFee} onNote={setNote} onSend={() => sendQuote(o)} />
        ))}
      </main>
    </div>
  )
}

function OrderCard({ o, draft, busy, editable, total, onPrice, onQty, onFee, onNote, onSend }: {
  o: Order; draft: Draft | undefined; busy: boolean; editable: boolean; total: number
  onPrice: (oid: string, iid: string, v: string) => void
  onQty: (oid: string, iid: string, v: string) => void
  onFee: (oid: string, v: string) => void
  onNote: (oid: string, v: string) => void
  onSend: () => void
}) {
  const fld = 'px-2 py-1.5 bg-[#FAFAF7] border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#1F6F5F]/50 focus:bg-white'
  return (
    <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="font-black text-gray-900">{o.customer_name}</p>
          <p className="text-xs text-gray-500 font-mono">{o.reference_code}</p>
        </div>
        {o.status === 'quoted' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#1F6F5F] bg-[#1F6F5F]/10 px-2.5 py-1 rounded-full"><CheckCircle className="w-3 h-3" /> مسعّر</span>
        )}
      </div>

      <div className="space-y-1.5 mb-3 text-xs text-gray-600">
        {o.customer_phone && <p className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-gray-400" /><span dir="ltr">{o.customer_phone}</span></p>}
        {(o.delivery_address || o.delivery_city) && (
          <p className="flex items-start gap-1.5"><MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5" /><span>{[o.delivery_address, o.delivery_district, o.delivery_city].filter(Boolean).join('، ')}</span></p>
        )}
        {o.customer_notes && <p className="flex items-start gap-1.5"><StickyNote className="w-3.5 h-3.5 text-gray-400 mt-0.5" /><span>{o.customer_notes}</span></p>}
      </div>

      <div className="border-t border-gray-100 pt-3 space-y-2">
        {o.items.map(it => {
          const price = draft?.prices[it.item_id] ?? ''
          const qty = draft?.qtys[it.item_id] ?? String(it.quantity)
          const lineTotal = (parseFloat(price || '0') || 0) * (parseInt(qty || '1', 10) || 1)
          return (
            <div key={it.item_id} className="flex items-center gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-800 truncate">{it.name}</p>
                {it.notes && <p className="text-[11px] text-gray-400 truncate">{it.notes}</p>}
              </div>
              {editable ? (
                <>
                  <input className={`${fld} w-14 text-center`} inputMode="numeric" value={qty} onChange={e => onQty(o.id, it.item_id, e.target.value)} title="كمية" />
                  <span className="text-gray-300">×</span>
                  <input className={`${fld} w-20 text-center`} inputMode="decimal" placeholder="سعر" value={price} onChange={e => onPrice(o.id, it.item_id, e.target.value)} />
                  <span className="text-xs text-gray-400 w-16 text-left tabular">{lineTotal ? `${lineTotal.toLocaleString('ar-EG')} ج` : ''}</span>
                </>
              ) : (
                <span className="text-sm font-bold text-gray-900 tabular">{it.quantity > 1 ? `${it.quantity}× ` : ''}{Number(it.line_total).toLocaleString('ar-EG')} ج</span>
              )}
            </div>
          )
        })}
      </div>

      <div className="border-t border-gray-100 mt-3 pt-3 space-y-2">
        {editable ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">التوصيل</span>
              <input className={`${fld} w-24 text-center`} inputMode="decimal" placeholder="0" value={draft?.fee ?? ''} onChange={e => onFee(o.id, e.target.value)} />
            </div>
            <input className={`${fld} w-full`} placeholder="ملاحظة للعميل (اختياري)" value={draft?.notes ?? ''} onChange={e => onNote(o.id, e.target.value)} />
          </>
        ) : (
          Number(o.delivery_fee) > 0 && <div className="flex items-center justify-between text-sm text-gray-500"><span>التوصيل</span><span className="tabular">{Number(o.delivery_fee).toLocaleString('ar-EG')} ج</span></div>
        )}
        <div className="flex items-center justify-between font-black text-[#1F6F5F]">
          <span>الإجمالي</span>
          <span className="tabular">{Number(total).toLocaleString('ar-EG')} ج</span>
        </div>
      </div>

      {editable && (
        <button onClick={onSend} disabled={busy} className="mt-4 w-full flex items-center justify-center gap-2 bg-[#1F6F5F] text-white py-3 rounded-2xl font-bold text-sm shadow-sm hover:-translate-y-0.5 transition-all disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          سعّر وابعت للعميل
        </button>
      )}
    </div>
  )
}
