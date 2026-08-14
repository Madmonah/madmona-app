'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import InviteContacts from '@/components/InviteContacts'
import dynamic from 'next/dynamic'

const NewDMSheet = dynamic(() => import('@/components/NewDMSheet'), { ssr: false })

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
  const [uid, setUid] = useState<string | null>(null)
  const [hidden, setHidden] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)
  const [showNewDM, setShowNewDM] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (!session?.user) return
        setLoggedIn(true)
        setUid(session.user.id)
        // 🔗 حساب واحد (8 Aug 2026): جدّد توكن أقسام مضمونة في الخلفية
        import('@/lib/madmonaSession').then((m) => m.syncModuleSession()).catch(() => {})
        // (31 Jul 2026) التلاتة دول مالهمش علاقة ببعض، وكانوا بيتنفّذوا ورا
        // بعض والمحادثات آخر واحدة — يعني القايمة كانت بتستنى نداءين على
        // الفاضي قبل ما تبدأ تحمّل أصلاً. دلوقتي بيطلعوا مع بعض.
        // المحفيّات لازم توصل مع المحادثات (مش بعدها) وإلا المحذوف هيومض.
        const roomsP = supabaseBrowser.rpc('chat_rooms_for_me', { p_kind: 'direct' })
        const hiddenP = supabaseBrowser.from('chat_hidden_rooms').select('room_id').eq('user_id', session.user.id)
        const maridP = fetch('/api/chat', { headers: { Authorization: `Bearer ${session.access_token}` } })
          .then((r) => r.json()).catch(() => null)

        try {
          const [roomsRes, hiddenRes] = await Promise.all([roomsP, hiddenP])
          setHidden(new Set(((hiddenRes.data as { room_id: string }[]) || []).map((h) => h.room_id)))
          type RpcRoom = { id: string; other_name: string | null; last_body: string | null; last_at: string | null }
          setRooms(((roomsRes.data as RpcRoom[]) || []).map((r) => ({
            id: r.id,
            name: r.other_name || 'محادثة خاصة',
            last: (r.last_body || 'ابدأ الكلام').slice(0, 50),
            time: fmtTime(r.last_at || undefined),
          })))
        } catch {}
        setLoading(false)

        // معاينة المارد مالهاش علاقة بالقايمة — بتتحدّث لما توصل
        maridP.then((data) => {
          if (data?.ok && Array.isArray(data.messages) && data.messages.length) {
            const last = data.messages[data.messages.length - 1]
            setMaridPreview(((last.text || '📎 ملف') as string).slice(0, 60))
            setMaridTime(fmtTime(last.created_at))
          }
        }).catch(() => {})
      } catch { setLoading(false) }
    })()
  }, [])

  // آخر باك (وأنت على القائمة الرئيسية للشات) يوديك لهوم المنصة بدل ما يقفل التطبيق
  useEffect(() => {
    try { window.history.pushState({ chatRoot: true }, '') } catch {}
    const onPop = () => { window.location.assign('/') }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const hideRoom = async (roomId: string) => {
    if (!uid) return
    if (typeof window !== 'undefined' && !window.confirm('تمسح المحادثة دي من عندك؟ (هتفضل محفوظة عندنا في مضمونة)')) return
    setHidden((s) => { const n = new Set(s); n.add(roomId); return n })
    try { await supabaseBrowser.from('chat_hidden_rooms').insert({ user_id: uid, room_id: roomId }) } catch {}
  }

  return (
    <div dir="rtl" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      {/* هوية 4b: هيدر غامق متدرّج زي شات المارد */}
      <header style={{ background: 'linear-gradient(135deg,#14231E,#059669)', color: '#fff', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ fontSize: 18, fontWeight: 900, flex: 1 }}>شات مضمونة</div>
        <InviteContacts />
        <Link href="/chat/settings" aria-label="إعدادات" style={{ color: 'rgba(255,255,255,.85)', fontSize: 20, textDecoration: 'none' }}>⚙️</Link>
      </header>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        <Link href="/chat/marid" style={{ ...rowStyle, background: '#fff' }}>
          <span style={{ position: 'relative', flexShrink: 0 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARID_AVATAR} alt="المارد" style={{ ...avatarStyle, border: '2px solid rgba(250, 129, 37,.2)' }} />
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

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px 4px' }}>
          <div style={{ flex: 1, fontSize: 11, fontWeight: 900, color: '#059669', letterSpacing: '.3px' }}>محادثاتك الخاصة</div>
          {/* 🐛 (٢ أغسطس ٢٠٢٦) كان لينك لـ/chat/team?new=dm — بينقلك لتاب
              الجروبات وبعدين يحاول يفتح prompt() اللي متصفحات الموبايل
              بتمنعها، فتفضل واقف في التاب الغلط ومش فاهم مطلوب منك إيه.
              دلوقتي شاشة بتفتح في مكانها. */}
          <button onClick={() => setShowNewDM(true)} style={{ background: '#F1EEE6', color: '#059669', borderRadius: 999, padding: '5px 12px', fontSize: 11.5, fontWeight: 800, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>➕ محادثة جديدة</button>
        </div>
        {/* (31 Jul 2026) هيكل مؤقت بدل رسالة «مفيش محادثات» وهي لسه بتحمّل —
            كانت بتقول للمستخدم إنه مالوش محادثات قبل ما الداتا توصل أصلاً. */}
        {loading ? (
          <div style={{ padding: '2px 0' }}>
            {[0, 1, 2].map((i) => (
              <div key={i} style={{ ...rowStyle, opacity: 1 - i * 0.25 }}>
                <div style={{ ...avatarStyle, background: '#E8E4DA' }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ height: 12, width: '40%', background: '#E8E4DA', borderRadius: 6, marginBottom: 9 }} />
                  <div style={{ height: 10, width: '70%', background: '#EFECE3', borderRadius: 6 }} />
                </div>
              </div>
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div style={{ padding: '6px 16px 16px', fontSize: 13, color: '#8A9690', fontWeight: 600, lineHeight: 1.8 }}>
            {loggedIn
              ? <>لسه مفيش محادثات خاصة.<br />اكبس ➕ محادثة جديدة، أو ابعت لينك دعوة لصاحبك من 📕 دفترك.</>
              : 'سجّل دخولك علشان تشوف محادثاتك.'}
          </div>
        ) : (
          rooms.filter((r) => !hidden.has(r.id)).map((r) => (
            <div key={r.id} style={{ ...rowStyle, paddingLeft: 6 }}>
              <Link href={`/chat/team?room=${r.id}`} style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, textDecoration: 'none' }}>
                <div style={{ ...avatarStyle, background: 'radial-gradient(circle at 35% 30%,#2FA084,#059669)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800 }}>{(r.name || '؟').trim().charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <span style={{ fontWeight: 800, color: '#14231E' }}>{r.name}</span>
                    <span style={{ fontSize: 11, color: '#8A9690', fontWeight: 600 }}>{r.time}</span>
                  </div>
                  <div style={{ fontSize: 13, color: '#5A6660', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.last}</div>
                </div>
              </Link>
              <button onClick={() => hideRoom(r.id)} aria-label="مسح المحادثة" title="مسح المحادثة من عندك" style={{ flexShrink: 0, width: 36, height: 36, borderRadius: 10, border: 'none', background: 'transparent', color: '#C0453A', fontSize: 17, cursor: 'pointer', lineHeight: 1 }}>🗑️</button>
            </div>
          ))
        )}
      </div>

      {showNewDM && (
        <NewDMSheet
          onClose={() => setShowNewDM(false)}
          onOpened={(roomId) => { setShowNewDM(false); window.location.href = `/chat/team?room=${roomId}` }}
        />
      )}

      <ChatBottomNav />
    </div>
  )
}

const rowStyle: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', textDecoration: 'none', borderBottom: '1px solid #F4F1E8' }
const avatarStyle: React.CSSProperties = { width: 50, height: 50, borderRadius: '50%', objectFit: 'cover', flexShrink: 0, background: '#fff' }
