'use client'

// ============================================================================
// 🛵 صفحة الطيار — /delivery/[token]
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «ابنيلي سيستم دليفري من الأول — طيارين»)
//
// الطيار مش هيعمل أكونت ولا هينزّل تطبيق. بياخد لينك واتساب فيه توكنه،
// يفتحه من الموبايل، يشوف رحلاته، ويدوس زرار واحد في كل خطوة:
//   قبلت → استلمت من المحل → وصّلت (أو: فشلت + السبب)
//
// نفس فلسفة اللينكات الممغنطة بتاعة العملاء — صفر احتكاك.
//
// ⚠️ كل التحديثات بتمشي عن طريق rider_update_trip (SECURITY DEFINER)
//    اللي بيتحقق من التوكن وبيسمح بالانتقالات الصح بس — الصفحة دي
//    ماتقدرش تعمل حاجة التوكن مايسمحش بيها حتى لو حد عبث بيها.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

interface Trip {
  id: string
  order_ref: string | null
  pickup_area: string
  pickup_address: string | null
  pickup_phone: string | null
  dropoff_area: string
  dropoff_address: string | null
  dropoff_phone: string | null
  rider_payout_egp: number
  cod_amount_egp: number
  status: string
}

const STATUS_AR: Record<string, string> = {
  offered: 'مستنية قبولك',
  accepted: 'قبلتها — روح استلم',
  picked_up: 'معاك — وصّلها',
}

export default function RiderPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [trips, setTrips] = useState<Trip[]>([])
  const [riderName, setRiderName] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const load = useCallback(async () => {
    // rider_trips_by_token بترجّع رحلات الطيار المفتوحة بالتوكن
    const { data, error } = await supabase.rpc('rider_trips_by_token', { p_token: token })
    if (error || !data) { setDenied(true); setLoading(false); return }
    const d = data as { rider_name: string; trips: Trip[] }
    setRiderName(d.rider_name || '')
    setTrips(d.trips || [])
    setLoading(false)
  }, [token])

  useEffect(() => { load() }, [load])

  async function update(trip: string, status: string) {
    let reason: string | null = null
    if (status === 'failed') {
      reason = window.prompt('إيه اللي حصل؟ (العميل مش موجود · رفض الاستلام · العنوان غلط…)')
      if (!reason) return
    }
    setBusy(trip)
    await supabase.rpc('rider_update_trip', { p_token: token, p_trip: trip, p_status: status, p_reason: reason })
    setBusy(null)
    load()
  }

  if (loading) return <Center>⏳ ثواني…</Center>
  if (denied) return <Center>❌ اللينك ده مش شغّال — كلّم مضمونة.</Center>

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: 'sans-serif', padding: 16 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#14231E', margin: 0 }}>🛵 رحلاتك يا {riderName}</h1>
        <p style={{ color: '#7C8A84', fontSize: 13, marginTop: 4 }}>
          اسحب لتحت عشان تحدّث · مضمونة
        </p>
      </header>

      {trips.length === 0 && (
        <Center>مفيش رحلات دلوقتي — هيجيلك واتساب أول ما تنزل رحلة ✌️</Center>
      )}

      {trips.map((t) => (
        <div key={t.id} style={{
          background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
          border: '1px solid #E5DFD3', boxShadow: '0 4px 14px -8px rgba(20,35,30,.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ fontWeight: 900, color: '#059669' }}>{STATUS_AR[t.status] ?? t.status}</span>
            {t.order_ref && <span style={{ color: '#7C8A84', fontSize: 12 }}>#{t.order_ref}</span>}
          </div>

          <Row icon="📍" label="استلام" value={`${t.pickup_area}${t.pickup_address ? ` — ${t.pickup_address}` : ''}`} phone={t.pickup_phone} />
          <Row icon="🏁" label="تسليم" value={`${t.dropoff_area}${t.dropoff_address ? ` — ${t.dropoff_address}` : ''}`} phone={t.dropoff_phone} />

          <div style={{ display: 'flex', gap: 14, margin: '10px 0', fontSize: 14 }}>
            <span>💰 أجرتك: <b>{t.rider_payout_egp} ج</b></span>
            {Number(t.cod_amount_egp) > 0 && <span>💵 تحصيل: <b>{t.cod_amount_egp} ج</b></span>}
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            {t.status === 'offered' && (
              <Btn onClick={() => update(t.id, 'accepted')} busy={busy === t.id} primary>✅ اقبل الرحلة</Btn>
            )}
            {t.status === 'accepted' && (
              <Btn onClick={() => update(t.id, 'picked_up')} busy={busy === t.id} primary>📦 استلمت من المحل</Btn>
            )}
            {t.status === 'picked_up' && (
              <Btn onClick={() => update(t.id, 'delivered')} busy={busy === t.id} primary>🏁 وصّلت</Btn>
            )}
            <Btn onClick={() => update(t.id, 'failed')} busy={busy === t.id}>⚠️ مشكلة</Btn>
          </div>
        </div>
      ))}
    </div>
  )
}

function Row({ icon, label, value, phone }: { icon: string; label: string; value: string; phone: string | null }) {
  return (
    <div style={{ marginBottom: 6, fontSize: 14, color: '#14231E' }}>
      {icon} <b>{label}:</b> {value}
      {phone && (
        <a href={`tel:${phone}`} style={{ marginRight: 8, color: '#059669', fontWeight: 700, textDecoration: 'none' }}>
          📞 اتصل
        </a>
      )}
    </div>
  )
}

function Btn({ children, onClick, busy, primary }: {
  children: React.ReactNode; onClick: () => void; busy?: boolean; primary?: boolean
}) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      flex: primary ? 1 : undefined, padding: '12px 14px', borderRadius: 12,
      border: primary ? 'none' : '1px solid #E5DFD3',
      background: primary ? '#059669' : '#fff',
      color: primary ? '#fff' : '#14231E',
      fontWeight: 800, fontSize: 15, opacity: busy ? 0.6 : 1,
    }}>{busy ? '…' : children}</button>
  )
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" style={{
      minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      color: '#7C8A84', fontFamily: 'sans-serif', fontSize: 16, padding: 24, textAlign: 'center',
    }}>{children}</div>
  )
}
