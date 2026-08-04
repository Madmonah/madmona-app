'use client'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

// «شير واكسب» — الحلقة الفيروسية جوه شات مضمونة (هوية 4b)
// 1) بيسجّل الإحالة أوتوماتيك لو اليوزر جاي من لينك /r/<code>
// 2) زرار عائم + شيت: لينكي الشخصي، شير واتساب بضغطة، عدّاد إحالاتي، توب ٥

type AnyRec = Record<string, any>
const asArr = (v: any): AnyRec[] => (Array.isArray(v) ? v : Array.isArray(v?.data) ? v.data : Array.isArray(v?.items) ? v.items : [])
const mask = (p?: string) => { const d = String(p || '').replace(/\D/g, ''); return d ? d.slice(0, 4) + '•••' + d.slice(-3) : '—' }

export default function EksabLoop() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [me, setMe] = useState<AnyRec | null>(null)
  const [copied, setCopied] = useState(false)
  const [hasToken, setHasToken] = useState(false)

  useEffect(() => { try { setHasToken(!!localStorage.getItem('madmona_token')) } catch {} }, [])

  // (1) attribution مرة واحدة بعد أول دخول
  useEffect(() => {
    try {
      const code = localStorage.getItem('eksab_code')
      const t = localStorage.getItem('madmona_token')
      if (!code || !t) return
      fetch('/api/eksab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'attribute', token: t, code }) })
        .then(() => localStorage.removeItem('eksab_code'))
        .catch(() => {})
    } catch {}
  }, [])

  const load = async () => {
    try {
      const t = localStorage.getItem('madmona_token')
      if (!t) return
      const r = await fetch('/api/eksab', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'me', token: t }) })
      const j = await r.json()
      if (j?.ok) setMe(j)
    } catch {}
  }

  const openSheet = () => { setOpen(true); if (!me) load() }
  const copyLink = async () => {
    if (!me?.link) return
    try { await navigator.clipboard.writeText(me.link); setCopied(true); setTimeout(() => setCopied(false), 1600) } catch {}
  }
  const waShare = () => {
    if (!me?.link) return
    const text = `تعالى شات مضمونة 💚 جروبات ومكالمات وتسجيل بالواتساب في ثواني — سجّل من لينكي ده 🎁\n${me.link}`
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank')
  }

  // الزرار العائم بيظهر في الصفحات الرئيسية بس عشان ميغطّيش على الكيبورد جوه المحادثات
  const showFab = pathname === '/chat' || pathname === '/team' || pathname === '/chat/settings'
  if (!hasToken) return null
  const myCount = asArr(me?.mine).length || Number(me?.mine?.total ?? 0)

  return (
    <>
      {showFab && (
        <button onClick={openSheet} aria-label="شير واكسب" style={{ position: 'fixed', bottom: 96, left: 14, zIndex: 60, display: 'flex', alignItems: 'center', gap: 8, background: 'linear-gradient(90deg,#d4a017,#2FA084,#1F6F5F)', color: '#fff', border: 'none', borderRadius: 999, padding: '10px 18px', fontFamily: 'Cairo,sans-serif', fontWeight: 800, fontSize: 14, boxShadow: '0 8px 24px rgba(0,0,0,.35)', cursor: 'pointer' }}>
          <span>🎁</span>
          <span>شير واكسب ١٠٠ج</span>
        </button>
      )}
      {open && (
        <div onClick={() => setOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 70, background: 'rgba(10,14,12,.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div dir="rtl" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxHeight: '82dvh', overflowY: 'auto', background: '#F1EEE6', borderRadius: '22px 22px 0 0', fontFamily: 'Cairo,sans-serif' }}>
            <div style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '18px 20px', borderRadius: '22px 22px 0 0' }}>
              <div style={{ fontSize: 20, fontWeight: 900 }}>🎁 شير واكسب</div>
              <div style={{ fontSize: 13, color: '#8FE3C8', marginTop: 4 }}>اعزم صحابك على شات مضمونة وخد ١٠٠ جنيه رصيد عن كل واحد — لحد ٢٠ في الشهر</div>
            </div>

            <div style={{ padding: 18 }}>
              <div style={{ background: '#fff', borderRadius: 16, padding: 14, boxShadow: '0 3px 10px rgba(20,35,30,.08)' }}>
                <div style={{ fontSize: 12, color: '#1F6F5F', fontWeight: 700 }}>لينكك الشخصي</div>
                <div dir="ltr" style={{ fontSize: 14, fontWeight: 700, color: '#0A0A0A', marginTop: 6, wordBreak: 'break-all' }}>{me?.link || '...جاري التحميل'}</div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button onClick={waShare} style={{ flex: 1, background: 'linear-gradient(90deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 0', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>شير على واتساب</button>
                  <button onClick={copyLink} style={{ flex: 1, background: '#fff', color: '#1F6F5F', border: '2px solid #1F6F5F', borderRadius: 999, padding: '11px 0', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>{copied ? 'اتنسخ ✓' : 'انسخ اللينك'}</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#1F6F5F' }}>{myCount}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>إحالاتي</div>
                </div>
                <div style={{ flex: 1, background: '#fff', borderRadius: 16, padding: 12, textAlign: 'center' }}>
                  <div style={{ fontSize: 24, fontWeight: 900, color: '#d4a017' }}>{myCount * 100}</div>
                  <div style={{ fontSize: 12, color: '#555' }}>جنيه رصيد متوقع</div>
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 900, color: '#14231E', marginBottom: 8 }}>🏆 توب المعزّمين الشهر ده</div>
                {asArr(me?.board).length === 0 && <div style={{ fontSize: 13, color: '#777' }}>كن أول واحد في الليدربورد 😉</div>}
                {asArr(me?.board).map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#fff', borderRadius: 12, padding: '9px 12px', marginBottom: 6 }}>
                    <span style={{ fontWeight: 900, color: i === 0 ? '#d4a017' : '#1F6F5F', width: 20 }}>{i + 1}</span>
                    <span style={{ flex: 1, fontSize: 13, fontWeight: 700, color: '#0A0A0A' }}>{b.name || b.owner_name || mask(b.owner_phone || b.phone || b.referrer_phone)}</span>
                    <span style={{ fontSize: 13, fontWeight: 900, color: '#1F6F5F' }}>{b.total ?? b.count ?? b.referrals ?? b.total_referrals ?? 0}</span>
                  </div>
                ))}
              </div>
              <div style={{ fontSize: 11, color: '#999', marginTop: 12, lineHeight: 1.6 }}>الرصيد بيتفعّل بعد مراجعة الشروط — بحد أقصى ٢٠ إحالة مُكافأة شهريًا.</div>
              <button onClick={() => setOpen(false)} style={{ width: '100%', marginTop: 12, background: 'transparent', color: '#1F6F5F', border: 'none', fontFamily: 'inherit', fontWeight: 800, fontSize: 14, padding: 10, cursor: 'pointer' }}>إغلاق</button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
