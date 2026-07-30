'use client'

// صفحة قبول دعوة صاحب — /i/<token>
// لو مسجّل دخول: الصداقة تتكوّن فوراً. لو لأ: بيروح للوجين ويرجع يكمّل.

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabaseBrowser } from '@/lib/supabase-browser'

type State =
  | { s: 'loading' }
  | { s: 'need_login' }
  | { s: 'ok'; name: string }
  | { s: 'err'; msg: string }

export default function InvitePage() {
  const params = useParams<{ token: string }>()
  const router = useRouter()
  const [st, setSt] = useState<State>({ s: 'loading' })
  const token = (params?.token || '').toString().toUpperCase()

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) {
        try { sessionStorage.setItem('madmona_pending_invite', token) } catch {}
        setSt({ s: 'need_login' })
        return
      }
      const { data, error } = await supabaseBrowser.rpc('chat_invite_accept', { p_token: token })
      if (error) { setSt({ s: 'err', msg: 'حصلت مشكلة — جرّب تاني' }); return }
      const r = data as { ok: boolean; error?: string; friend_name?: string }
      if (r?.ok) {
        try { sessionStorage.removeItem('madmona_pending_invite') } catch {}
        setSt({ s: 'ok', name: r.friend_name || 'صاحبك' })
        return
      }
      setSt({
        s: 'err',
        msg: r?.error === 'self' ? 'ده رابطك انت 🙂'
          : r?.error === 'not_found' ? 'الرابط ده مش صحيح أو اتغيّر'
          : 'مقدرتش أكمّل الدعوة',
      })
    })()
  }, [token])

  return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: 24, background: '#F1EEE6', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&display=swap');"}</style>
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
            <button onClick={() => router.push('/chat/login')}
              style={{ background: 'linear-gradient(118deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '13px 30px', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              سجّل دخول وكمّل
            </button>
          </>
        )}

        {st.s === 'ok' && (
          <>
            <div style={{ fontSize: 18, fontWeight: 900, color: '#1F6F5F', marginBottom: 8 }}>بقيتوا أصحاب!</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#14231E', marginBottom: 18 }}>
              إنت و{st.name} تقدروا تتكلموا على طول.
            </div>
            <button onClick={() => router.push('/team')}
              style={{ background: 'linear-gradient(118deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '13px 30px', fontSize: 15, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit', width: '100%' }}>
              افتح الشات
            </button>
          </>
        )}

        {st.s === 'err' && (
          <>
            <div style={{ fontSize: 15.5, fontWeight: 800, color: '#14231E', marginBottom: 16 }}>{st.msg}</div>
            <button onClick={() => router.push('/team')}
              style={{ background: '#F1EEE6', color: '#1F6F5F', border: 'none', borderRadius: 999, padding: '12px 26px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
              افتح الشات
            </button>
          </>
        )}
      </div>
    </div>
  )
}
