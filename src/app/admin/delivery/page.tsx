'use client'

// ============================================================================
// 🛵 /admin/delivery — لوحة الدليفري (٦ سبتمبر ٢٠٢٦)
//
// محمد: «موديل الدليفري يفتح شاشة خاصة بالدليفري — بيجيله الأوردر عبارة عن إيه
// ومكان الاستلام ومكان التسليم، والسعر بيتحدد على حسب المسافة بين التسليم
// والاستلام ونوع المركبة، كل مركبة وليها سعر».
//
// الموديل: أسطول واحد تحت مضمونة (الطيار بيسجّل عندنا، الأدمن بيراجع أوراقه
// وبيسند الرحلة). التسعير: هافرساين × ١.٢٥ × تعريفة المركبة (delivery_quote)
// — التعريفة نفسها بتتحط هنا من تاب «التعريفة»، مش مخترعة في الكود.
// كل النداءات عبر /api/admin/delivery (بوابة بالكوكي → /api/delivery بالسر).
// ============================================================================
import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'

type VehicleType = { key: string; name_ar: string; emoji: string | null; base_fee: number | null; per_km: number | null; min_fee: number | null; currency: string; active: boolean; sort: number }
type Trip = { id: string; order_ref: string | null; order_kind: string | null; pickup_area: string; pickup_address: string | null; dropoff_area: string; dropoff_address: string | null; fee_egp: number; rider_payout_egp: number; cod_amount_egp: number; currency: string; distance_km: number | null; vehicle_type: string | null; fee_source: string; items: Array<{ name: string; qty: number; price?: number }>; status: string; rider_id: string | null; created_at: string }
type Rider = { id: string; name: string; phone: string; zones: string[] | null; vehicle: string | null; is_active: boolean; verification_status: 'pending' | 'approved' | 'rejected' | null; created_at: string }
type Board = { ok: boolean; trips: Trip[]; riders: Rider[]; vehicle_types: VehicleType[] }
type Quote = { ok: boolean; configured?: boolean; distance_km?: number; fee?: number; currency?: string; vehicle_name?: string; error?: string }

const EMPTY = {
  order_ref: '', order_id: '', order_kind: 'manual', supplier_id: '',
  pickup_area: '', pickup_address: '', pickup_phone: '', pickup_lat: '', pickup_lng: '',
  dropoff_area: '', dropoff_address: '', dropoff_phone: '', dropoff_lat: '', dropoff_lng: '',
  vehicle_type: 'motorcycle', items: [] as Array<{ name: string; qty: number; price?: number }>,
  cod_amount_egp: '', fee_egp: '', rider_payout_egp: '', currency: 'EGP', notes: '',
}
const STATUS: Record<string, string> = { new: '🆕 جديدة', offered: '📨 معروضة على طيار', accepted: '✅ مقبولة', picked_up: '📦 مع الطيار' }
const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#059669]/30'

async function api(action: string | null, body?: unknown, view?: string) {
  const url = action ? `/api/admin/delivery?action=${action}` : `/api/admin/delivery${view ? `?view=${view}` : ''}`
  const r = await fetch(url, action ? { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) } : { cache: 'no-store' })
  return r.json()
}

export default function AdminDeliveryPage() {
  const [tab, setTab] = useState<'trips' | 'riders' | 'tariff'>('trips')
  const [board, setBoard] = useState<Board | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [form, setForm] = useState({ ...EMPTY })
  const [quote, setQuote] = useState<Quote | null>(null)
  const [review, setReview] = useState<{ id: string; name: string; national_id_url: string | null; vehicle_license_url: string | null; vehicle: string | null; zones: string[] | null } | null>(null)
  const [tariff, setTariff] = useState<VehicleType[]>([])

  const load = useCallback(async () => {
    const b = (await api(null, undefined, 'board')) as Board
    if (b?.ok) { setBoard(b); setTariff(b.vehicle_types) }
  }, [])
  useEffect(() => { load() }, [load])

  // تسعيرة حية كل ما الإحداثيات أو المركبة تتغير
  useEffect(() => {
    const { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type } = form
    if (!pickup_lat || !pickup_lng || !dropoff_lat || !dropoff_lng || !vehicle_type) { setQuote(null); return }
    let alive = true
    api('quote', { pickup_lat, pickup_lng, dropoff_lat, dropoff_lng, vehicle_type }).then((q) => { if (alive) setQuote(q) })
    return () => { alive = false }
  }, [form.pickup_lat, form.pickup_lng, form.dropoff_lat, form.dropoff_lng, form.vehicle_type])

  async function prefill() {
    if (!form.order_ref.trim()) { setMsg('اكتب رقم الأوردر'); return }
    setBusy(true); setMsg(null)
    const r = await api('prefill_from_order', { order_ref: form.order_ref.trim() })
    setBusy(false)
    if (!r.ok) { setMsg(r.error || 'مالقيناش الأوردر'); return }
    const p = r.prefill
    setForm((f) => ({ ...f, ...p, pickup_lat: p.pickup_lat ?? '', pickup_lng: p.pickup_lng ?? '', dropoff_lat: p.dropoff_lat ?? '', dropoff_lng: p.dropoff_lng ?? '', cod_amount_egp: p.cod_amount_egp || '' }))
    setMsg(p.dropoff_lat == null ? '⚠️ الأوردر من غير إحداثيات تسليم — حط الإحداثيات يدوي عشان السعر يتحسب' : '✓ اتعبّى من الأوردر')
  }

  async function createTrip(assign: boolean) {
    if (!form.pickup_area || !form.dropoff_area) { setMsg('منطقة الاستلام والتسليم مطلوبين'); return }
    setBusy(true); setMsg(null)
    const payload = { ...form, fee_source: form.fee_egp ? 'manual' : 'auto' }
    const r = await api('create_trip', payload)
    if (!r.ok) { setBusy(false); setMsg(r.error || 'فشل'); return }
    let note = `✓ الرحلة اتسجّلت — الأجرة ${r.trip?.fee_egp ?? 0} ${r.trip?.currency ?? ''}${r.trip?.distance_km ? ` · ${r.trip.distance_km} كم` : ''}`
    if (assign) {
      const a = await api('assign', { trip_id: r.trip_id })
      note += a.assigned ? ` · اتبعتت لـ${a.rider_name}` : ` · ${a.note || 'مفيش طيار متاح'}`
    }
    setBusy(false); setMsg(note); setForm({ ...EMPTY }); setQuote(null); load()
  }

  async function assignTrip(id: string) {
    setBusy(true); const a = await api('assign', { trip_id: id }); setBusy(false)
    setMsg(a.assigned ? `✓ اتبعتت لـ${a.rider_name}` : (a.note || a.error || 'مفيش طيار متاح')); load()
  }
  async function openReview(id: string) {
    const r = await api('review_rider', { rider_id: id }); if (r.ok) setReview(r.rider); else setMsg(r.error)
  }
  async function decide(id: string, approve: boolean) {
    const reason = approve ? undefined : (prompt('سبب الرفض؟') || 'الصور مش واضحة')
    setBusy(true); const r = await api(approve ? 'approve_rider' : 'reject_rider', { rider_id: id, reason }); setBusy(false)
    setMsg(r.ok ? (approve ? '✓ اتوافق عليه واتبلّغ' : 'اترفض واتبلّغ بالسبب') : r.error); setReview(null); load()
  }
  async function saveTariff(v: VehicleType) {
    setBusy(true); const r = await api('save_vehicle_type', v); setBusy(false)
    setMsg(r.ok ? `✓ تعريفة ${v.name_ar} اتحفظت` : r.error); load()
  }

  const vt = (k: string | null) => board?.vehicle_types.find((v) => v.key === k)
  const riderName = (id: string | null) => board?.riders.find((r) => r.id === id)?.name
  const pendingRiders = board?.riders.filter((r) => r.verification_status === 'pending') ?? []
  const unconfigured = (board?.vehicle_types ?? []).filter((v) => v.active && (v.base_fee == null || v.per_km == null))

  return (
    <main dir="rtl" className="mx-auto max-w-5xl p-4 space-y-4">
      <header className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-black text-[#0C2B22]">🛵 الدليفري</h1>
          <p className="text-xs text-gray-500">أسطول مضمونة — الرحلات · الطيارين · التعريفة بالمسافة والمركبة</p>
        </div>
        <Link href="/admin/dashboard" className="text-xs font-bold text-[#059669]">← الداشبورد</Link>
      </header>

      {unconfigured.length > 0 && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-900">
          ⚠️ تعريفة {unconfigured.map((v) => v.name_ar).join(' · ')} لسه ماتحددتش — السعر مش هيتحسب أوتوماتيك لحد ما تكتبها في تاب «التعريفة».
        </div>
      )}
      {msg && <div className="rounded-xl bg-[#F3F6F4] border border-[#E4DECE] px-3 py-2 text-sm">{msg}</div>}

      <nav className="flex gap-2">
        {([['trips', `الرحلات (${board?.trips.length ?? 0})`], ['riders', `الطيارين${pendingRiders.length ? ` · ${pendingRiders.length} مستني مراجعة` : ''}`], ['tariff', 'التعريفة']] as const).map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} className={`rounded-full px-4 py-1.5 text-xs font-black border ${tab === k ? 'bg-[#04352A] text-white border-[#04352A]' : 'bg-white text-gray-600 border-gray-200'}`}>{l}</button>
        ))}
      </nav>

      {/* ─── الرحلات ─── */}
      {tab === 'trips' && (
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
          <section className="space-y-2">
            {(board?.trips ?? []).length === 0 && <p className="text-sm text-gray-500">مفيش رحلات مفتوحة.</p>}
            {(board?.trips ?? []).map((t) => (
              <article key={t.id} className="rounded-2xl border border-[#E4DECE] bg-white p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-black text-sm">{t.order_ref ? `#${t.order_ref}` : 'رحلة يدوية'} <span className="text-xs font-bold text-gray-500">{STATUS[t.status] || t.status}</span></p>
                  <p className="text-sm font-black text-[#059669] tabular-nums">{t.fee_egp} {t.currency}{t.distance_km ? ` · ${t.distance_km} كم` : ''}</p>
                </div>
                <p className="text-xs text-gray-600 mt-1">📍 {t.pickup_area}{t.pickup_address ? ` — ${t.pickup_address}` : ''}</p>
                <p className="text-xs text-gray-600">🏁 {t.dropoff_area}{t.dropoff_address ? ` — ${t.dropoff_address}` : ''}</p>
                <p className="text-[11px] text-gray-500 mt-1">
                  {vt(t.vehicle_type) ? `${vt(t.vehicle_type)?.emoji ?? ''} ${vt(t.vehicle_type)?.name_ar}` : 'مركبة غير محددة'}
                  {t.items?.length ? ` · ${t.items.map((i) => `${i.qty}× ${i.name}`).join('، ')}` : ''}
                  {Number(t.cod_amount_egp) > 0 ? ` · تحصيل ${t.cod_amount_egp}` : ''}
                  {t.rider_id ? ` · الطيار: ${riderName(t.rider_id) || '—'}` : ''}
                  {t.fee_source === 'manual' ? ' · سعر يدوي' : ''}
                </p>
                {t.status === 'new' && <button onClick={() => assignTrip(t.id)} disabled={busy} className="mt-2 text-xs font-black text-white bg-[#04352A] rounded-xl px-3 py-1.5 disabled:opacity-50">ابعتها لطيار</button>}
              </article>
            ))}
          </section>

          <aside className="rounded-2xl border border-[#E4DECE] bg-white p-3 space-y-2 h-fit">
            <h2 className="font-black text-sm">رحلة جديدة</h2>
            <div className="flex gap-2">
              <input value={form.order_ref} onChange={(e) => setForm({ ...form, order_ref: e.target.value })} placeholder="رقم أوردر الماركت (اختياري)" className={inp} dir="ltr" />
              <button onClick={prefill} disabled={busy} className="shrink-0 text-xs font-black bg-[#F3F6F4] rounded-xl px-3">عبّي</button>
            </div>
            <p className="text-[10px] text-gray-400">من الأوردر: الاستلام من فرع المورد، التسليم من عنوان العميل، والأصناف والتحصيل.</p>
            <input value={form.pickup_area} onChange={(e) => setForm({ ...form, pickup_area: e.target.value })} placeholder="منطقة الاستلام *" className={inp} />
            <input value={form.pickup_address} onChange={(e) => setForm({ ...form, pickup_address: e.target.value })} placeholder="عنوان الاستلام" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.pickup_lat} onChange={(e) => setForm({ ...form, pickup_lat: e.target.value })} placeholder="lat الاستلام" className={inp} dir="ltr" />
              <input value={form.pickup_lng} onChange={(e) => setForm({ ...form, pickup_lng: e.target.value })} placeholder="lng الاستلام" className={inp} dir="ltr" />
            </div>
            <input value={form.dropoff_area} onChange={(e) => setForm({ ...form, dropoff_area: e.target.value })} placeholder="منطقة التسليم *" className={inp} />
            <input value={form.dropoff_address} onChange={(e) => setForm({ ...form, dropoff_address: e.target.value })} placeholder="عنوان التسليم" className={inp} />
            <div className="grid grid-cols-2 gap-2">
              <input value={form.dropoff_lat} onChange={(e) => setForm({ ...form, dropoff_lat: e.target.value })} placeholder="lat التسليم" className={inp} dir="ltr" />
              <input value={form.dropoff_lng} onChange={(e) => setForm({ ...form, dropoff_lng: e.target.value })} placeholder="lng التسليم" className={inp} dir="ltr" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.pickup_phone} onChange={(e) => setForm({ ...form, pickup_phone: e.target.value })} placeholder="تليفون الاستلام" className={inp} dir="ltr" />
              <input value={form.dropoff_phone} onChange={(e) => setForm({ ...form, dropoff_phone: e.target.value })} placeholder="تليفون العميل" className={inp} dir="ltr" />
            </div>
            <select value={form.vehicle_type} onChange={(e) => setForm({ ...form, vehicle_type: e.target.value })} className={inp}>
              {(board?.vehicle_types ?? []).filter((v) => v.active).map((v) => <option key={v.key} value={v.key}>{v.emoji} {v.name_ar}{v.base_fee == null ? ' (تعريفة مش محددة)' : ''}</option>)}
            </select>
            <div className={`rounded-xl px-3 py-2 text-xs ${quote?.configured ? 'bg-emerald-50 text-emerald-900' : 'bg-gray-50 text-gray-600'}`}>
              {!quote ? 'حط الإحداثيات الأربعة واختار المركبة — السعر هيتحسب هنا' :
                quote.configured ? `📏 ${quote.distance_km} كم · 💰 ${quote.fee} ${quote.currency} (${quote.vehicle_name})` :
                `📏 ${quote.distance_km ?? '—'} كم · ${quote.error}`}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input value={form.fee_egp} onChange={(e) => setForm({ ...form, fee_egp: e.target.value })} placeholder="أجرة يدوية (بدل المحسوبة)" className={inp} dir="ltr" />
              <input value={form.cod_amount_egp} onChange={(e) => setForm({ ...form, cod_amount_egp: e.target.value })} placeholder="تحصيل من العميل" className={inp} dir="ltr" />
            </div>
            {form.items.length > 0 && <p className="text-[11px] text-gray-600">🧾 {form.items.map((i) => `${i.qty}× ${i.name}`).join('، ')}</p>}
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات للطيار" rows={2} className={inp} />
            <div className="flex gap-2">
              <button onClick={() => createTrip(false)} disabled={busy} className="flex-1 text-xs font-black bg-[#F3F6F4] rounded-xl py-2.5 disabled:opacity-50">سجّل بس</button>
              <button onClick={() => createTrip(true)} disabled={busy} className="flex-1 text-xs font-black text-white bg-[#04352A] rounded-xl py-2.5 disabled:opacity-50">سجّل وابعت لطيار</button>
            </div>
          </aside>
        </div>
      )}

      {/* ─── الطيارين ─── */}
      {tab === 'riders' && (
        <section className="space-y-2">
          {(board?.riders ?? []).length === 0 && <p className="text-sm text-gray-500">مفيش طيارين لسه — لينك التسجيل: <code dir="ltr">madmonacairo.com/delivery/register</code></p>}
          {(board?.riders ?? []).map((r) => (
            <article key={r.id} className="rounded-2xl border border-[#E4DECE] bg-white p-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="font-black text-sm">{r.name} <span dir="ltr" className="text-xs text-gray-500 font-normal">+{r.phone}</span></p>
                <p className="text-[11px] text-gray-500">{vt(r.vehicle)?.emoji ?? '🛵'} {vt(r.vehicle)?.name_ar ?? r.vehicle ?? 'مركبة غير محددة'} · {(r.zones ?? []).join('، ') || 'من غير مناطق'} · {r.verification_status === 'approved' ? '✅ معتمد' : r.verification_status === 'rejected' ? '❌ مرفوض' : '⏳ مستني مراجعة'}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => openReview(r.id)} className="text-xs font-bold bg-[#F3F6F4] rounded-xl px-3 py-1.5">الأوراق</button>
                {r.verification_status !== 'approved' && <button onClick={() => decide(r.id, true)} disabled={busy} className="text-xs font-black text-white bg-[#059669] rounded-xl px-3 py-1.5">اعتمد</button>}
                {r.verification_status !== 'rejected' && <button onClick={() => decide(r.id, false)} disabled={busy} className="text-xs font-bold text-red-600 border border-red-200 rounded-xl px-3 py-1.5">ارفض</button>}
              </div>
            </article>
          ))}
          {review && (
            <div className="rounded-2xl border border-[#04352A] bg-white p-3">
              <div className="flex items-center justify-between"><p className="font-black text-sm">أوراق {review.name}</p><button onClick={() => setReview(null)} className="text-xs text-gray-500">إغلاق ✕</button></div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {review.national_id_url ? <a href={review.national_id_url} target="_blank" rel="noreferrer"><img src={review.national_id_url} alt="البطاقة" className="rounded-xl border w-full h-40 object-cover" /></a> : <p className="text-xs text-gray-400">مفيش صورة بطاقة</p>}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {review.vehicle_license_url ? <a href={review.vehicle_license_url} target="_blank" rel="noreferrer"><img src={review.vehicle_license_url} alt="الرخصة" className="rounded-xl border w-full h-40 object-cover" /></a> : <p className="text-xs text-gray-400">مفيش صورة رخصة</p>}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">الروابط صالحة ساعة — الباكت خاص.</p>
            </div>
          )}
        </section>
      )}

      {/* ─── التعريفة ─── */}
      {tab === 'tariff' && (
        <section className="space-y-2">
          <p className="text-xs text-gray-500">السعر = أكبر من (أقل أجرة) و(فتح العدّاد + لكل كيلو × المسافة). المسافة = خط مستقيم × ١.٢٥. السعر بيتقرّب لأعلى.</p>
          {tariff.map((v, i) => (
            <div key={v.key} className="rounded-2xl border border-[#E4DECE] bg-white p-3 grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
              <label className="text-[11px] text-gray-600">المركبة<input value={v.name_ar} onChange={(e) => setTariff(tariff.map((x, j) => j === i ? { ...x, name_ar: e.target.value } : x))} className={inp} /></label>
              <label className="text-[11px] text-gray-600">فتح العدّاد<input value={v.base_fee ?? ''} onChange={(e) => setTariff(tariff.map((x, j) => j === i ? { ...x, base_fee: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inp} dir="ltr" placeholder="مثلًا ٢٠" /></label>
              <label className="text-[11px] text-gray-600">لكل كيلو<input value={v.per_km ?? ''} onChange={(e) => setTariff(tariff.map((x, j) => j === i ? { ...x, per_km: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inp} dir="ltr" /></label>
              <label className="text-[11px] text-gray-600">أقل أجرة<input value={v.min_fee ?? ''} onChange={(e) => setTariff(tariff.map((x, j) => j === i ? { ...x, min_fee: e.target.value === '' ? null : Number(e.target.value) } : x))} className={inp} dir="ltr" /></label>
              <label className="text-[11px] text-gray-600 flex items-center gap-2 pb-2"><input type="checkbox" checked={v.active} onChange={(e) => setTariff(tariff.map((x, j) => j === i ? { ...x, active: e.target.checked } : x))} /> شغّالة</label>
              <button onClick={() => saveTariff(v)} disabled={busy} className="text-xs font-black text-white bg-[#04352A] rounded-xl py-2 disabled:opacity-50">{v.emoji} احفظ</button>
            </div>
          ))}
        </section>
      )}
    </main>
  )
}
