'use client'

// ============================================================================
// 📬 /admin/wa-queue — طابور الواتساب
//
// (١٧ أغسطس ٢٠٢٦ — محمد: «اعمل تاب نشيل منه الطابور القديم علشان مش لاقيه»)
//
// الحملات متجمعة: كل حملة بمساراتها وحالاتها وأعدادها، وزرار «إلغاء»
// على كل مجموعة queued. الإلغاء بيسيب الصفوف بحالة cancelled — مش حذف.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'

interface Row {
  campaign: string
  session: string
  status: string
  n: number
  first_at: string
  last_at: string
  sent_today: number
}

const STATUS_AR: Record<string, { label: string; color: string; bg: string }> = {
  queued:    { label: 'في الطابور', color: '#92400E', bg: '#FEF3C7' },
  sent:      { label: 'اتبعتت',     color: '#1E40AF', bg: '#DBEAFE' },
  delivered: { label: 'وصلت',      color: '#065F46', bg: '#D1FAE5' },
  read:      { label: 'اتقرت',     color: '#065F46', bg: '#A7F3D0' },
  failed:    { label: 'فشلت',      color: '#991B1B', bg: '#FEE2E2' },
  cancelled: { label: 'ملغية',     color: '#4B5563', bg: '#F3F4F6' },
}

export default function WaQueuePage() {
  const [rows, setRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      const r = await fetch('/api/admin/wa-queue')
      const j = await r.json()
      if (j.ok) setRows(j.campaigns)
      else setError(j.error)
    } catch { setError('فشل التحميل') }
    setLoading(false)
  }, [])

  useEffect(() => {
    load()
    const t = setInterval(load, 30_000) // الطابور بيتحرك كل دقيقة — نحدّث كل ٣٠ث
    return () => clearInterval(t)
  }, [load])

  async function cancel(campaign: string, session: string) {
    const label = `«${campaign}»${session !== '(افتراضي)' ? ` على ${session}` : ''}`
    if (!window.confirm(`إلغاء كل رسايل ${label} اللي لسه في الطابور؟\n(اللي اتبعتت خلاص مش هتتأثر)`)) return
    setBusy(campaign + session)
    const r = await fetch('/api/admin/wa-queue', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'cancel', campaign, session: session === '(افتراضي)' ? null : session }),
    })
    const j = await r.json()
    setBusy(null)
    if (!j.ok) { alert('فشل الإلغاء: ' + j.error); return }
    load()
  }

  // تجميع بالحملة للعرض
  const campaigns = new Map<string, Row[]>()
  for (const r of rows) {
    if (!campaigns.has(r.campaign)) campaigns.set(r.campaign, [])
    campaigns.get(r.campaign)!.push(r)
  }

  const fmt = (s: string) => new Date(s).toLocaleString('ar-EG', {
    timeZone: 'Africa/Cairo', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div dir="rtl" style={{ padding: 24, fontFamily: 'sans-serif', background: '#FAFAF7', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 24, fontWeight: 900, color: '#14231E', marginBottom: 4 }}>📬 طابور الواتساب</h1>
      <p style={{ color: '#7C8A84', fontSize: 14, marginBottom: 20 }}>
        كل الحملات آخر ٣٠ يوم — الإلغاء بيمسك اللي لسه في الطابور بس، واللي اتبعتت مش بتتأثر.
      </p>

      {loading && <p style={{ color: '#7C8A84' }}>⏳ ثواني…</p>}
      {error && <p style={{ color: '#991B1B' }}>❌ {error}</p>}

      {[...campaigns.entries()].map(([name, group]) => {
        const queued = group.filter((g) => g.status === 'queued')
        const total = group.reduce((s, g) => s + g.n, 0)
        return (
          <div key={name} style={{
            background: '#fff', borderRadius: 14, padding: 18, marginBottom: 16,
            border: queued.length ? '2px solid #D4A017' : '1px solid #E5DFD3',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <h2 style={{ fontSize: 17, fontWeight: 900, color: '#14231E', margin: 0 }}>
                {name} <span style={{ color: '#7C8A84', fontWeight: 400, fontSize: 13 }}>({total.toLocaleString('ar-EG')} رسالة)</span>
              </h2>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
              <thead>
                <tr style={{ color: '#7C8A84', fontSize: 12, textAlign: 'right' }}>
                  <th style={{ padding: '4px 8px' }}>المسار</th>
                  <th style={{ padding: '4px 8px' }}>الحالة</th>
                  <th style={{ padding: '4px 8px' }}>العدد</th>
                  <th style={{ padding: '4px 8px' }}>من</th>
                  <th style={{ padding: '4px 8px' }}>إلى</th>
                  <th style={{ padding: '4px 8px' }}>النهاردة</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {group.map((g, i) => {
                  const st = STATUS_AR[g.status] ?? { label: g.status, color: '#333', bg: '#eee' }
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #F0EDE5' }}>
                      <td style={{ padding: '8px' }}>{g.session}</td>
                      <td style={{ padding: '8px' }}>
                        <span style={{ background: st.bg, color: st.color, padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 800 }}>
                          {st.label}
                        </span>
                      </td>
                      <td style={{ padding: '8px', fontWeight: 800 }}>{g.n.toLocaleString('ar-EG')}</td>
                      <td style={{ padding: '8px', color: '#4B5563', fontSize: 12 }}>{fmt(g.first_at)}</td>
                      <td style={{ padding: '8px', color: '#4B5563', fontSize: 12 }}>{fmt(g.last_at)}</td>
                      <td style={{ padding: '8px' }}>{g.sent_today > 0 ? g.sent_today.toLocaleString('ar-EG') : '—'}</td>
                      <td style={{ padding: '8px', textAlign: 'left' }}>
                        {g.status === 'queued' && (
                          <button
                            onClick={() => cancel(name, g.session)}
                            disabled={busy === name + g.session}
                            style={{
                              padding: '6px 14px', borderRadius: 8, border: '1px solid #FCA5A5',
                              background: '#FEF2F2', color: '#991B1B', fontWeight: 800, fontSize: 13,
                              cursor: 'pointer', opacity: busy === name + g.session ? 0.5 : 1,
                            }}
                          >🗑️ إلغاء</button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {!loading && campaigns.size === 0 && (
        <p style={{ color: '#7C8A84', textAlign: 'center', padding: 40 }}>الطابور فاضي ✨</p>
      )}
    </div>
  )
}
