'use client'
// ============================================================================
// 📢 /real-estate/requests — الطلبات المفتوحة
//
// (٢٨ أغسطس ٢٠٢٦) محمد: «عايز أعمل تاب في بورصة العقارات اسمه طلبات
//   مفتوحة، بحيث أي طلب يتعرض فيه ويكون التواصل عن طريق مضمونة بس».
//
// 🔒 الويو v_open_property_requests **مفيهوش أي بيانات تواصل** — لا
//    تليفون ولا اسم. المورد يشوف الطلب ويرد عبر مضمونة، ومضمونة
//    بتوصّل. العميل محمي من الإزعاج والعمولة محفوظة.
// ============================================================================
import { useEffect, useState, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import {
  Loader2, Search, MapPin, Wallet, Clock, MessageSquare,
  ShieldCheck, X, Home, Send,
} from 'lucide-react'

type Req = {
  id: string
  title: string
  details: string | null
  kind: string
  purpose: string
  city: string | null
  district: string | null
  budget_min: number | null
  budget_max: number | null
  area_min: number | null
  bedrooms: number | null
  down_payment_max: number | null
  installment_years_min: number | null
  urgency: string
  responses_count: number
  age_label: string
}

const KIND: Record<string, string> = {
  apartment: 'شقة', villa: 'فيلا', land: 'أرض',
  shop: 'محل', office: 'مكتب', chalet: 'شاليه',
}

export default function OpenRequests() {
  const [rows, setRows] = useState<Req[]>([])
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [reply, setReply] = useState<Req | null>(null)
  const [msg, setMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState<string | null>(null)
  const [myBiz, setMyBiz] = useState<{ id: string; name: string } | null>(null)

  const load = useCallback(async () => {
    const { data } = await (supabaseBrowser as unknown as {
      from: (t: string) => { select: (c: string) => { order: (c: string, o?: unknown) => Promise<{ data: unknown }> } }
    }).from('v_open_property_requests').select('*').order('created_at', { ascending: false })
    setRows((data as Req[]) || [])
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    // 🏢 هل الزائر عنده بيزنس؟ لو أيوة يقدر يرد
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return
        const { data } = await (supabaseBrowser as unknown as {
          from: (t: string) => { select: (c: string) => { eq: (a: string, b: unknown) => { limit: (n: number) => Promise<{ data: unknown }> } } }
        }).from('marketplace_suppliers').select('id, business_name')
          .eq('profile_id', session.user.id).limit(1)
        const s = (data as { id: string; business_name: string }[])?.[0]
        if (s) setMyBiz({ id: s.id, name: s.business_name })
      } catch { /* زائر عادي */ }
    })()
  }, [load])

  async function send() {
    if (!reply || !myBiz || !msg.trim()) return
    setSending(true)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: unknown }>)('respond_to_property_request', {
        p_request_id: reply.id, p_supplier_id: myBiz.id, p_message: msg.trim(),
      })
      const r = data as { ok: boolean; message: string }
      setSent(r?.message || 'وصل ردك 👌')
      setReply(null); setMsg('')
      await load()
    } catch (e) {
      alert(e instanceof Error ? e.message : 'حصل خطأ')
    }
    setSending(false)
  }

  const money = (n: number | null) => n ? Number(n).toLocaleString('ar-EG') : null

  if (loading) return <div className="py-24 text-center"><Loader2 className="w-7 h-7 animate-spin mx-auto text-gray-400" /></div>

  const shown = q.trim()
    ? rows.filter((r) => (r.title + ' ' + (r.district || '') + ' ' + (r.city || '')).includes(q.trim()))
    : rows

  return (
    <div className="max-w-3xl mx-auto p-4 pb-24" dir="rtl">
      <h1 className="text-lg font-black text-gray-900 flex items-center gap-2 mb-1">
        <MessageSquare className="w-5 h-5 text-[#059669]" /> طلبات مفتوحة
      </h1>
      <p className="text-[11.5px] text-gray-500 mb-3 leading-relaxed">
        عملاء بيدوّروا على وحدات دلوقتي. عندك اللي بيدوّروا عليه؟ ابعت عرضك.
      </p>

      <div className="rounded-2xl bg-[#34D399]/10 border border-[#34D399]/30 p-3 mb-4">
        <p className="text-[11.5px] font-black text-[#059669] flex items-center gap-1.5 mb-1">
          <ShieldCheck className="w-3.5 h-3.5" /> التواصل عن طريق مضمونة
        </p>
        <p className="text-[11px] text-gray-700 leading-relaxed">
          بيانات العميل محفوظة عندنا. ابعت عرضك وإحنا نوصّله — ولو ناسبه نرتّب المقابلة.
          <b> مفيش إزعاج للعميل، ومفيش تخطّي للوسيط.</b>
        </p>
      </div>

      {sent && (
        <div className="rounded-2xl bg-[#34D399]/15 border border-[#34D399] p-3 mb-3">
          <p className="text-xs font-black text-[#059669]">{sent}</p>
        </div>
      )}

      {rows.length > 4 && (
        <div className="relative mb-3">
          <Search className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="دوّر بالمنطقة أو النوع"
            className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm" />
        </div>
      )}

      {shown.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center">
          <Home className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-gray-600">
            {rows.length === 0 ? 'مفيش طلبات مفتوحة دلوقتي' : 'مفيش نتايج'}
          </p>
          {rows.length === 0 && (
            <p className="text-[11px] text-gray-400 mt-1">ارجع تاني بعدين — الطلبات بتتحدّث باستمرار.</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {shown.map((r) => (
            <div key={r.id} className="rounded-2xl border border-gray-200 bg-white p-3.5">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="font-black text-sm text-gray-900">{r.title}</p>
                {r.urgency === 'urgent' && (
                  <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-50 text-red-600 shrink-0">
                    مستعجل
                  </span>
                )}
              </div>

              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-gray-600 mb-2">
                {(r.district || r.city) && (
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400" />
                    {[r.district, r.city].filter(Boolean).join(' · ')}
                  </span>
                )}
                <span>{KIND[r.kind] || r.kind} · {r.purpose === 'rent' ? 'إيجار' : 'تمليك'}</span>
                {(r.budget_min || r.budget_max) && (
                  <span className="flex items-center gap-1">
                    <Wallet className="w-3 h-3 text-gray-400" />
                    {money(r.budget_min) || '—'}{r.budget_max ? ` – ${money(r.budget_max)}` : ''} ج.م
                  </span>
                )}
                <span className="flex items-center gap-1 text-gray-400">
                  <Clock className="w-3 h-3" /> {r.age_label}
                </span>
              </div>

              {r.details && (
                <p className="text-[11.5px] text-gray-600 mb-2.5 leading-relaxed">{r.details}</p>
              )}

              <div className="flex items-center justify-between gap-2">
                <button
                  onClick={() => { setReply(r); setSent(null) }}
                  disabled={!myBiz}
                  className={`px-3 py-2 rounded-xl text-[11.5px] font-black flex items-center gap-1.5 ${
                    myBiz ? 'bg-[#34D399] text-[#04352A]' : 'bg-[#F1EEE6] text-gray-400'}`}>
                  <Send className="w-3.5 h-3.5" />
                  {myBiz ? 'عندي اللي بيدوّر عليه' : 'سجّل بيزنسك عشان ترد'}
                </button>
                {r.responses_count > 0 && (
                  <span className="text-[10.5px] text-gray-400">
                    {r.responses_count} عرض وصل
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {reply && (
        <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-3" onClick={() => setReply(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <h2 className="font-black text-sm">{reply.title}</h2>
              <button onClick={() => setReply(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <p className="text-[11px] text-gray-500 mb-3">
              بترد باسم <b>{myBiz?.name}</b> — مضمونة هتراجع عرضك وتوصّله للعميل.
            </p>
            <textarea value={msg} onChange={(e) => setMsg(e.target.value)} rows={4}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm"
              placeholder="اكتب اللي عندك: المساحة والدور والسعر ونظام السداد…" />
            <button onClick={send} disabled={sending || !msg.trim()}
              className="w-full mt-3 py-3 rounded-xl bg-[#34D399] text-[#04352A] font-black text-sm disabled:opacity-50">
              {sending ? 'بيبعت…' : 'ابعت العرض'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
