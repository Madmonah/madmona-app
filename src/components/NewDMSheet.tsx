'use client'

// ============================================================================
// NewDMSheet — «محادثة جديدة» من تاب المحادثات
//
// 🐛 اللي كان بيحصل قبل كده: الزرار كان لينك لـ /chat/team?new=dm — يعني:
//   ١) بينقلك لتاب **الجروبات** (وبيتلوّن تحت) فتحتار إنت فين
//   ٢) وبعدين يحاول يفتح prompt() — نافذة المتصفح القديمة
//   ٣) ومتصفحات الموبايل بتمنعها كتير بعد الانتقال، فتفضل واقف في تاب
//      الجروبات ومفيش حاجة بتحصل ومش فاهم مطلوب منك إيه
//   (بلاغ محمد ٢ أغسطس ٢٠٢٦)
//
// دلوقتي: شاشة بتفتح **في مكانها** فيها أصحابك جاهزين للضغط، أو تكتب رقم.
// ============================================================================

import { useCallback, useEffect, useState } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'

type Friend = { friend_id: string; friend_name: string; friend_phone: string; friend_avatar: string | null }

export default function NewDMSheet({
  onClose,
  onOpened,
}: {
  onClose: () => void
  onOpened: (roomId: string) => void
}) {
  const [friends, setFriends] = useState<Friend[]>([])
  const [loading, setLoading] = useState(true)
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    const { data } = await supabaseBrowser.rpc('friends_list')
    setFriends((data as unknown as Friend[]) || [])
    setLoading(false)
  }, [])
  useEffect(() => { load() }, [load])

  async function start(p: string, label?: string) {
    if (!p.trim()) return
    setBusy(true); setNote('')
    try {
      const { data: s } = await supabaseBrowser.auth.getSession()
      const tok = s.session?.access_token
      if (!tok) { setNote('لازم تكون داخل بحسابك'); return }

      const r = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
        body: JSON.stringify({ phone: p.trim() }),
      })
      const d = await r.json()

      if (!d?.ok) {
        if (d?.error === 'self') { setNote('ده رقمك انت 🙂'); return }
        if (d?.error === 'no_account') {
          setNote(`${label || 'الرقم ده'} لسه مش على مضمونة — ابعتله دعوة من 📕 دفترك`)
          return
        }
        setNote('مقدرتش أبدأ المحادثة — جرّب تاني')
        return
      }
      onOpened(d.roomId)
    } catch {
      setNote('مش قادر أبدأ المحادثة دلوقتي')
    } finally { setBusy(false) }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 70, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', width: '100%', maxHeight: '82vh', display: 'flex', flexDirection: 'column', borderRadius: '18px 18px 0 0', padding: 16, fontFamily: 'var(--font-cairo), system-ui, sans-serif' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#14231E', flex: 1 }}>💬 محادثة جديدة</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#8A9690' }}>✕</button>
        </div>
        <div style={{ fontSize: 11.5, color: '#8A9690', fontWeight: 600, marginBottom: 12, lineHeight: 1.65 }}>
          اختار من أصحابك، أو اكتب رقم موبايل.
        </div>

        {note && <div style={{ background: '#FDF3DA', color: '#8a6d1a', borderRadius: 10, padding: '9px 12px', fontSize: 12.5, fontWeight: 700, marginBottom: 10, lineHeight: 1.6 }}>{note}</div>}

        <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="01XXXXXXXXX"
            dir="ltr"
            inputMode="tel"
            style={{ flex: 1, padding: '11px 13px', borderRadius: 12, border: '1px solid #EAE5D9', background: '#FAFAF7', fontSize: 15, fontWeight: 700, fontFamily: 'inherit', outline: 'none', textAlign: 'right' }}
          />
          <button onClick={() => start(phone)} disabled={busy || phone.replace(/\D/g, '').length < 10}
            style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 12, padding: '0 18px', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit', opacity: (busy || phone.replace(/\D/g, '').length < 10) ? .5 : 1 }}>
            ابدأ
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', minHeight: 60 }}>
          {loading && <div style={{ textAlign: 'center', color: '#8A9690', padding: 18, fontWeight: 700 }}>لحظة…</div>}

          {!loading && friends.length === 0 && (
            <div style={{ textAlign: 'center', color: '#8A9690', padding: '18px 10px', fontWeight: 600, fontSize: 12.5, lineHeight: 1.75 }}>
              لسه مفيش أصحاب — اكتب الرقم فوق،<br />أو افتح 📕 دفترك وضيف أرقام اللي تعرفهم.
            </div>
          )}

          {friends.map((f) => (
            <button key={f.friend_id} onClick={() => start(f.friend_phone, f.friend_name)} disabled={busy}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 4px', width: '100%', background: 'none', border: 'none', borderBottom: '1px solid #F4F1E8', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'start' }}>
              {f.friend_avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={f.friend_avatar} alt={f.friend_name} loading="lazy" decoding="async"
                     style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
              ) : (
                <span style={{ width: 38, height: 38, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#059669)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>
                  {(f.friend_name || '؟').trim()[0]}
                </span>
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span style={{ display: 'block', fontWeight: 800, color: '#14231E', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.friend_name}</span>
              </span>
              <span style={{ fontSize: 16, color: '#059669' }}>💬</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
