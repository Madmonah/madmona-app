'use client'

// ── قبول دعوة صاحب — جوّه سكوب شات مضمونة (/chat) ──────────────
// (٣٠ يوليو ٢٠٢٦ — محمد: «كله جوّه الشات»)
// الصفحة القديمة /i/<token> كانت برّه scope الـPWA ("/chat")، فاللينك كان
// بيفتح المتصفح والموقع العام بدل التطبيق المثبّت. دي نسختها جوّه السكوب.
//
// القبول نفسه بيتعمل في /api/chat/invite-accept مش بـRPC مباشر، لأن
// جلسة الشات (madmona_token) مالهاش auth.uid() — الراوت بيحلّها ويعمل
// provision للـprofile لو مش موجود.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getMadmonaSession } from '@/lib/madmonaSession'
import { supabaseBrowser } from '@/lib/supabase-browser'

type State =
  | { s: 'loading' }
  | { s: 'need_login' }
  | { s: 'ok'; name: string }
  | { s: 'err'; msg: string }

export default function ChatInvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [st, setSt] = useState<State>({ s: 'loading' })
  const token = (params?.token || '').toString().toUpperCase()

  useEffect(() => {
    ;(async () => {
      const mad = getMadmonaSession()
      const { data: { session } } = await supabaseBrowser.auth.getSession()

      if (!mad?.token && !session?.access_token) { setSt({ s: 'need_login' }); return }

      try {
        const res = await fetch('/api/chat/invite-accept', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
          },
          body: JSON.stringify({ token, madmona_token: mad?.token || null }),
        })
        const r = (await res.json()) as { ok?: boolean; error?: string; friend_name?: string }

        if (res.status === 401) { setSt({ s: 'need_login' }); return }
        if (r?.ok) { setSt({ s: 'ok', name: r.friend_name || 'صاحبك' }); return }

        setSt({
          s: 'err',
          msg: r?.error === 'self' ? 'ده رابطك انت 🙂'
            : r?.error === 'not_found' ? 'الرابط ده مش صحيح أو اتغيّر'
            : 'مقدرتش أكمّل الدعوة',
        })
      } catch {
        setSt({ s: 'err', msg: 'حصلت مشكلة في الاتصال — جرّب تاني' })
      }
    })()
  }, [token])

  const goLogin = () =>
    router.push('/chat/login?next=' + encodeURIComponent('/chat/i/' + token))

  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F1EEE6', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 20, padding: '30px 24px', maxWidth: 380, width: '100%', textAlign: 'center', boxShadow: '0 8px 30px rgba(20,35,30,.12)' }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>
          {st.s === 'ok' ? '🤝' : st.s === 'err' ? '😕' : '🧞'}
        </div>

        {st.s === 'loading' && (
          <div style={{ fontSize: 15, fontWeight: 800, color: '#5A6660' }}>لحظة…</div>
        )}

        {st.s === 'need_login' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#14231E', marginBottom: 8 }}>صاحبك بيدعيك على مضمونة</div>
            <div style={{ fontSize: 13.5, fontWeight: 600, color: '#5A6660', lineHeight: 1.8, marginBottom: 18 }}>
              سجّل دخول برقمك وهتبقوا أصحاب على طول — بدون طلبات ولا موافقات.
            </div>
            <button onClick={goLogin}
              style={{ background: 'linear-gradient(118deg,#059669,#34D399)', color: '#fff', border: 'none', borderRadius: 999, padding: '13px 30px', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              سجّل دخول وكمّل
            </button>
          </>
        )}

        {st.s === 'ok' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#059669', marginBottom: 8 }}>بقيتوا أصحاب!</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#14231E', marginBottom: 18 }}>
              إنت و{st.name} تقدروا تتكلموا على طول.
            </div>
            <button onClick={() => router.push('/chat')}
              style={{ background: 'linear-gradient(118deg,#059669,#34D399)', color: '#fff', border: 'none', borderRadius: 999, padding: '13px 30px', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              افتح الشات
            </button>
          </>
        )}

        {st.s === 'err' && (
          <>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: '#14231E', marginBottom: 16 }}>{st.msg}</div>
            <button onClick={() => router.push('/chat')}
              style={{ background: '#F1EEE6', color: '#059669', border: 'none', borderRadius: 999, padding: '12px 26px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              افتح الشات
            </button>
          </>
        )}
      </div>
    </div>
  )
}
