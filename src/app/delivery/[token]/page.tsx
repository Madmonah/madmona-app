'use client'

// ============================================================================
// 🛵 حساب الطيار — /delivery/[token]
//
// (١٦ أغسطس ٢٠٢٦ — محمد: «عايز الطيار يكون ليه حساب ويكون باين ليه قبل
//  ما يقبل كل تفاصيل الرحلة واللوكيشن من وإلى وكل حاجة»)
//
// تلات حالات للحساب:
//   pending  → «أوراقك قيد المراجعة» — مفيش رحلات لحد الموافقة
//   rejected → السبب + لينك يرفع أوراق تانية
//   approved → رحلاته، وكل رحلة معروضة بـ**كل** تفاصيلها قبل القبول:
//              العنوان الكامل + زرار خريطة للاستلام والتسليم + التليفونات
//              + أجرته + التحصيل + الملاحظات. القرار قراره وهو شايف كل حاجة.
//
// ⚠️ التحديثات كلها عن طريق rider_update_trip (بتتحقق من التوكن ومن
//    الموافقة ومن الانتقال المسموح) — الصفحة ماتقدرش تتخطى الحواجز دي.
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
  pickup_maps_url: string | null
  dropoff_area: string
  dropoff_address: string | null
  dropoff_phone: string | null
  dropoff_maps_url: string | null
  notes: string | null
  rider_payout_egp: number
  cod_amount_egp: number
  status: string
}

interface Me {
  rider_name: string
  verification_status: 'pending' | 'approved' | 'rejected'
  rejection_reason: string | null
  trips: Trip[]
}

const STATUS_AR: Record<string, string> = {
  offered: '🆕 رحلة جديدة — راجع التفاصيل واقبل',
  accepted: '✅ قبلتها — روح استلم',
  picked_up: '📦 معاك — وصّلها',
}

export default function RiderPage({ params }: { params: { token: string } }) {
  const { token } = params
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [denied, setDenied] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await supabase.rpc('rider_trips_by_token', { p_token: token })
    if (error || !data) { setDenied(true); setLoading(false); return }
    setMe(data as Me)
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
  if (denied || !me) return <Center>❌ اللينك ده مش شغّال — كلّم مضمونة.</Center>

  // ── قيد المراجعة ─────────────────────────────────────────────────────
  if (me.verification_status === 'pending') {
    return (
      <Center>
        <div>
          <div style={{ fontSize: 52 }}>🕐</div>
          <h2 style={{ color: '#14231E' }}>أهلًا يا {me.rider_name}</h2>
          <p style={{ lineHeight: 1.8 }}>
            أوراقك <b>قيد المراجعة</b> دلوقتي.<br />
            أول ما نوافق عليها هيوصلك واتساب وهتبدأ تستلم رحلات من هنا.
          </p>
        </div>
      </Center>
    )
  }

  // ── مرفوض ────────────────────────────────────────────────────────────
  if (me.verification_status === 'rejected') {
    return (
      <Center>
        <div>
          <div style={{ fontSize: 52 }}>📄</div>
          <h2 style={{ color: '#14231E' }}>أوراقك محتاجة تتظبط</h2>
          <p style={{ lineHeight: 1.8 }}>
            {me.rejection_reason || 'الصور مش واضحة'}<br />
            صوّرها تاني بوضوح وسجّل من نفس اللينك.
          </p>
          <a href="/delivery/register" style={{
            display: 'inline-block', marginTop: 10, padding: '12px 24px', borderRadius: 12,
            background: '#059669', color: '#fff', fontWeight: 900, textDecoration: 'none',
          }}>ارفع أوراق جديدة</a>
        </div>
      </Center>
    )
  }

  // ── موثّق — رحلاته ──────────────────────────────────────────────────
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#FAFAF7', fontFamily: 'sans-serif', padding: 16 }}>
      <header style={{ marginBottom: 18 }}>
        <h1 style={{ fontSize: 22, fontWeight: 900, color: '#14231E', margin: 0 }}>
          🛵 رحلاتك يا {me.rider_name}
        </h1>
        <p style={{ color: '#7C8A84', fontSize: 13, marginTop: 4 }}>✅ حسابك موثّق · مضمونة</p>
      </header>

      {me.trips.length === 0 && (
        <Center>مفيش رحلات دلوقتي — هيجيلك واتساب أول ما تنزل رحلة ✌️</Center>
      )}

      {me.trips.map((t) => (
        <div key={t.id} style={{
          background: '#fff', borderRadius: 16, padding: 16, marginBottom: 14,
          border: t.status === 'offered' ? '2px solid #059669' : '1px solid #E5DFD3',
          boxShadow: '0 4px 14px -8px rgba(20,35,30,.25)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontWeight: 900, color: '#059669', fontSize: 14 }}>{STATUS_AR[t.status] ?? t.status}</span>
            {t.order_ref && <span style={{ color: '#7C8A84', fontSize: 12 }}>#{t.order_ref}</span>}
          </div>

          {/* 📍 كل التفاصيل ظاهرة قبل القبول — دي النقطة كلها */}
          <Stop icon="📍" title="الاستلام" area={t.pickup_area} address={t.pickup_address}
                phone={t.pickup_phone} maps={t.pickup_maps_url} />
          <Stop icon="🏁" title="التسليم" area={t.dropoff_area} address={t.dropoff_address}
                phone={t.dropoff_phone} maps={t.dropoff_maps_url} />

          {t.notes && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 10, padding: 10, fontSize: 13, margin: '10px 0' }}>
              📝 {t.notes}
            </div>
          )}

          <div style={{ display: 'flex', gap: 16, margin: '12px 0', fontSize: 15, background: '#F0FDF4', borderRadius: 10, padding: '10px 12px' }}>
            <span>💰 أجرتك: <b>{t.rider_payout_egp} ج</b></span>
            {Number(t.cod_amount_egp) > 0 && <span>💵 تحصّل من العميل: <b>{t.cod_amount_egp} ج</b></span>}
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

function Stop({ icon, title, area, address, phone, maps }: {
  icon: string; title: string; area: string
  address: string | null; phone: string | null; maps: string | null
}) {
  return (
    <div style={{ marginBottom: 10, padding: '10px 12px', background: '#FAFAF7', borderRadius: 10 }}>
      <div style={{ fontWeight: 800, fontSize: 14, color: '#14231E', marginBottom: 3 }}>
        {icon} {title}: {area}
      </div>
      {address && <div style={{ fontSize: 13, color: '#4B5563', marginBottom: 6 }}>{address}</div>}
      <div style={{ display: 'flex', gap: 8 }}>
        {maps && (
          <a href={maps} target="_blank" rel="noreferrer" style={chip('#059669', '#fff')}>🗺️ افتح الخريطة</a>
        )}
        {phone && <a href={`tel:${phone}`} style={chip('#fff', '#059669')}>📞 اتصل</a>}
      </div>
    </div>
  )
}

function chip(bg: string, color: string): React.CSSProperties {
  return {
    padding: '7px 14px', borderRadius: 999, background: bg, color,
    border: '1px solid #05966933', fontWeight: 800, fontSize: 13, textDecoration: 'none',
  }
}

function Btn({ children, onClick, busy, primary }: {
  children: React.ReactNode; onClick: () => void; busy?: boolean; primary?: boolean
}) {
  return (
    <button onClick={onClick} disabled={busy} style={{
      flex: primary ? 1 : undefined, padding: '13px 14px', borderRadius: 12,
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
