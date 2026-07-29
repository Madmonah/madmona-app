'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import InviteContacts from '@/components/InviteContacts'

const MARID_AVATAR = 'https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_120,h_120/madmona/mascots/genie.png'

type Room = { id: string; name: string; last: string; time: string }

function fmtTime(iso?: string) {
  if (!iso) return ''
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}

export default function ChatHub() {
  const [maridPreview, setMaridPreview] = useState('اكبس واتكلّم مع المارد — رد فوري ٢٤/٧')
  const [maridTime, setMaridTime] = useState('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return
        setLoggedIn(true)
        // آخر رسالة مع المارد
        try {
          const res = await fetch('/api/chat', { headers: { Authorization: `Bearer ${session.access_token}` } })
          const data = await res.json()
          if (data?.ok && Array.isArray(data.messages) && data.messages.length) {
            const last = data.messages[data.messages.length - 1]
            setMaridPreview(((last.text || '📎 ملف') as string).slice(0, 60))
            setMaridTime(fmtTime(last.created_at))
          }
        } catch {}
        // رومات فريق العمل
        try {
          const uid = session.user.id
          const { data: mem } = await supabaseBrowser.from('chat_room_members').select('room_id').eq('profile_id', uid)
          const ids = ((mem || []) as { room_id: string }[]).map((m) => m.room_id)
          if (ids.length) {
            const { data: rs } = await supabaseBrowser.from('chat_rooms').select('id, name').in('id', ids)
            const { data: msgs } = await supabaseBrowser
              .from('chat_messages').select('room_id, body, created_at')
              .in('room_id', ids).order('created_at', { ascending: false }).limit(200)
            const lastByRoom = new Map<string, { body: string; created_at: string }>()
            for (const m of (msgs || []) as { room_id: string; body: string; created_at: string }[]) {
              if (!lastByRoom.has(m.room_id)) lastByRoom.set(m.room_id, m)
            }
            setRooms(((rs || []) as { id: string; name: string }[]).map((r) => ({
              id: r.id,
              name: r.name || 'روم',
              last: (lastByRoom.get(r.id)?.body || 'روم جديدة').slice(0, 50),
              time: fmtTime(lastByRoom.get(r.id)?.created_at),
            })))
          }
        } catch {}
      } catch {}
    })()
  }, [])

  // آخر باك (وأنت على القائمة الرئيسية للشات) يوديك لهوم المنصة بدل ما يقفل التطبيق
  useEffect(() => {
    try { window.history.pushState({ chatRoot: true }, '') } catch {}
    const onPop = () => { window.location.assign('/') }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');"}</style>
      {/* هوية 4b: هيدر غامق متدرّج زي شات المارد */}
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ fontSize: 18, fontWeight: 900, flex: 1 }}>شات مضمونة</div>
        <InviteContacts />
        <Link href="/chat/settings" aria-label="إعدادات" style={{ color: 'rgba(255,255,255,.85)', fontSize: 20, textDecoration: 'none' }}>⚙️</Link>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Link href="/chat/marid" style={{ ...rowStyle, background: '#fff' }}>
          <span style={{ position: 'relative', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARID_AVATAR} alt="المارد" style={{ ...avatarStyle, border: '2px solid rgba(31,111,95,.2)' }} />
            <span style={{ position: 'absolute', bottom: 1, left: 1, width: 12, height: 12, borderRadius: '50%', background: '#6FCF97', border: '2px solid #fff' }} />
          </span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
              <span style={{ fontWeight: 900, color: '#14231E' }}>المارد 🧞</span>
              <span style={{ fontSize: 11, color: '#8A9690', fontWeight: 600 }}>{maridTime}</span>
            </div>
            <div style={{ fontSize: 13, color: '#5A6660', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{maridPreview}</div>
          </div>
        </Link>

        <div style={{ padding: '14px 16px 4px', fontSize: 11, fontWeight: 900, color: '#1F6F5F', letterSpacing: '.3px' }}>الجروبات</div>
        {rooms.length === 0 ? (
          <div style={{ padding: '6px 16px 16px', fontSize: 13, color: '#8A9690', fontWeight: 600 }}>
            {loggedIn ? 'لسه مفيش جروبات — ابدأ واحد من تبويب الجروبات.' : 'سجّل دخولك علشان تشوف جروباتك.'}
          </div>
        ) : (
          rooms.map((r) => (
            <Link key={r.id} href={`/team?room=${r.id}`} style={rowStyle}>
              <div style={{ ...avatarStyle, background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800 }}>{(r.name || '؟').trim().charAt(0)}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <span style={{ fontWeight: 800, color: '#14231E' }}>{r.name}</span>
                  <span style={{ fontSize: 11, color: '#8A9690', fontWeight: 600 }}>{r.time}</span>
                </div>
                <div style={{ fontSize: 13, color: '#5A6660', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.last}</div>
              </div>
            </Link>
          ))
        )}
      </div>

      <ChatBottomNav />
    </div>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #F4F1E8' }
const avatarStyle: React.CSSProperties = { width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#fff' }
