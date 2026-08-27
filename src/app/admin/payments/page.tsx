'use client'
// ============================================================================
// 💳 /admin/payments — تأكيد تحويلات العملاء برقم الأوردر
//
// (٢٧ أغسطس ٢٠٢٦) محمد: «اعملها مبدئيًا برقم للطلب بس».
//
// المشكلة قبل كده: العميل بيحوّل على حساب الشركة (بنك مصر / إنستاباي)
// وبيبعت صورة الإيصال على واتساب، والفريق بيدوّر في الشات ويأكّد يدوي —
// تأخير وأخطاء وأوردرات بتفضل «بانتظار الدفع» وهي مدفوعة.
//
// دلوقتي: اكتب رقم الأوردر → شوف تفاصيله والمبلغ المطلوب → أكّد بضغطة.
// رقم عملية التحويل بيتسجّل في payment_reference عشان المراجعة البنكية.
//
// ⚠️ التأكيد ده **يدوي بالكامل** — الموظف هو اللي بيتحقق إن الفلوس وصلت
//    فعلاً من كشف الحساب. الصفحة دي مابتتكلمش مع البنك.
// ============================================================================
import { useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { Search, CheckCircle2, Loader2, AlertCircle, Banknote } from 'lucide-react'

type OrderRow = {
  id: string
  reference_code: string | null
  status: string
  payment_method: string | null
  payment_reference: string | null
  total_amount: number | string
  customer_notes: string | null
  created_at: string
  delivery_city?: string | null
  delivery_phone?: string | null
}

const STATUS_AR: Record<string, string> = {
  pending_payment: 'بانتظار الدفع', paid: 'الدفع تم', accepted: 'مقبول',
  preparing: 'بيتجهّز', ready: 'جاهز', out_for_delivery: 'في الطريق',
  delivered: 'وصل', completed: 'مكتمل', cancelled: 'متلغي', refunded: 'مستردّ',
  awaiting_quote: 'بانتظار التسعير', quoted: 'اتسعّر',
}

export default function AdminPaymentsPage() {
  const [q, setQ] = useState('')
  const [order, setOrder] = useState<OrderRow | null>(null)
  const [txRef, setTxRef] = useState('')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ kind: 'ok' | 'err'; text: string } | null>(null)

  async function find() {
    const code = q.trim().toUpperCase()
    if (!code) return
    setBusy(true); setMsg(null); setOrder(null); setTxRef('')
    try {
      const { data, error } = await supabaseBrowser
        .from('marketplace_orders')
        .select('id, reference_code, status, payment_method, payment_reference, total_amount, customer_notes, created_at')
        .eq('reference_code', code)
        .maybeSingle()
      if (error) { setMsg({ kind: 'err', text: 'مقدرتش أدوّر — جرّب تاني.' }); return }
      if (!data) { setMsg({ kind: 'err', text: 'مفيش أوردر بالرقم ده. راجع الرقم مع العميل.' }); return }
      setOrder(data as OrderRow)
      setTxRef(((data as OrderRow).payment_reference) || '')
    } finally { setBusy(false) }
  }

  async function confirmPaid() {
    if (!order) return
    setBusy(true); setMsg(null)
    try {
      // رقم عملية التحويل الأول (لو الموظف كتبه) — عشان المراجعة البنكية
      if (txRef.trim() && txRef.trim() !== order.payment_reference) {
        await supabaseBrowser.from('marketplace_orders')
          .update({ payment_reference: txRef.trim() } as never)
          .eq('id', order.id)
      }
      const { error } = await supabaseBrowser.rpc('set_order_status' as never, {
        p_order_id: order.id, p_new_status: 'paid', p_reason: 'تأكيد تحويل بنكي يدوي',
      } as never)
      if (error) { setMsg({ kind: 'err', text: error.message || 'التأكيد ماتمّش.' }); return }
      setMsg({ kind: 'ok', text: `✅ الأوردر ${order.reference_code} اتأكّد كمدفوع.` })
      setOrder({ ...order, status: 'paid', payment_reference: txRef.trim() || order.payment_reference })
    } finally { setBusy(false) }
  }

  const money = (n: number | string) => Number(n).toLocaleString('ar-EG')
  const alreadyPaid = order && order.status !== 'pending_payment' && order.status !== 'awaiting_quote'

  return (
    <div style={{ maxWidth: 620, margin: '0 auto', padding: 16 }} dir="rtl">
      <h1 className="text-lg font-black text-gray-900 mb-1 flex items-center gap-2">
        <Banknote className="w-5 h-5 text-[#059669]" /> تأكيد التحويلات
      </h1>
      <p className="text-xs text-gray-500 mb-4">
        العميل بيحوّل على حساب مضمونة وبيبعت الإيصال. اتأكد إن المبلغ وصل من كشف الحساب،
        وبعدين أكّد الأوردر من هنا.
      </p>

      <div className="flex gap-2 mb-4">
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') find() }}
          placeholder="رقم الأوردر (مثال: MDM-12AB34)"
          className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-bold outline-none focus:border-[#059669]"
        />
        <button
          onClick={find} disabled={busy || !q.trim()}
          className="px-4 rounded-xl bg-[#34D399] text-[#04352A] text-sm font-bold disabled:opacity-50 flex items-center gap-1.5"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} دوّر
        </button>
      </div>

      {msg && (
        <div className={`rounded-xl px-3 py-2.5 text-sm font-bold mb-4 flex items-start gap-2 ${
          msg.kind === 'ok' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>
          {msg.kind === 'ok' ? <CheckCircle2 className="w-4 h-4 mt-0.5" /> : <AlertCircle className="w-4 h-4 mt-0.5" />}
          <span>{msg.text}</span>
        </div>
      )}

      {order && (
        <div className="rounded-2xl border border-gray-200 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="font-black text-gray-900 tabular">{order.reference_code}</span>
            <span className="text-xs font-bold rounded-full px-2.5 py-1 bg-gray-100 text-gray-700">
              {STATUS_AR[order.status] || order.status}
            </span>
          </div>

          <div className="text-sm space-y-1.5 mb-4">
            <Row k="المبلغ المطلوب" v={`${money(order.total_amount)} ج.م`} strong />
            <Row k="طريقة الدفع" v={order.payment_method === 'cod' ? 'كاش عند الاستلام' : 'تحويل / إنستاباي'} />
            <Row k="تاريخ الأوردر" v={new Date(order.created_at).toLocaleString('ar-EG')} />
            {order.customer_notes && <Row k="ملاحظات العميل" v={order.customer_notes} />}
          </div>

          {order.payment_method === 'cod' && (
            <div className="rounded-xl bg-amber-50 text-amber-800 text-xs font-bold p-3 mb-3">
              ⚠️ الأوردر ده كاش عند الاستلام — متأكّدهوش كتحويل إلا لو العميل حوّل فعلاً.
            </div>
          )}

          {alreadyPaid ? (
            <div className="rounded-xl bg-green-50 text-green-800 text-sm font-bold p-3">
              الأوردر ده مش بانتظار الدفع — حالته «{STATUS_AR[order.status] || order.status}».
            </div>
          ) : (
            <>
              <label className="block text-xs font-bold text-gray-600 mb-1">
                رقم عملية التحويل (اختياري — بيسهّل المراجعة البنكية)
              </label>
              <input
                value={txRef} onChange={(e) => setTxRef(e.target.value)}
                placeholder="مثال: 4471029833"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm mb-3 outline-none focus:border-[#059669]"
              />
              <button
                onClick={confirmPaid} disabled={busy}
                className="w-full py-3 rounded-xl bg-[#059669] text-white text-sm font-black disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                أكّد إن الفلوس وصلت
              </button>
              <p className="text-[11px] text-gray-400 mt-2 text-center">
                التأكيد بيحوّل الأوردر لـ«الدفع تم» والمورد يبدأ يجهّز.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ k, v, strong }: { k: string; v: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-gray-500">{k}</span>
      <span className={strong ? 'font-black text-gray-900 tabular' : 'font-bold text-gray-800'}>{v}</span>
    </div>
  )
}
