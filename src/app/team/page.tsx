'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'

type Room = { id: string; name: string | null; marid_enabled: boolean }
type CMsg = { id: string; sender_id: string | null; sender_kind: string; sender_name: string | null; body: string | null; kind: string; media_url: string | null; created_at: string }

function t(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function normEg(raw: string) {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}

export default function TeamPage() {
  const [ready, setReady] = useState(false)
  const [uid, setUid] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [myName, setMyName] = useState<string>('')
  const [rooms, setRooms] = useState<Room[]>([])
  const [active, setActive] = useState<Room | null>(null)
  const [messages, setMessages] = useState<CMsg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chanRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null)

  const loadRooms = useCallback(async () => {
    const { data } = await supabaseBrowser.from('chat_rooms').select('id, name, marid_enabled').order('created_at', { ascending: false })
    setRooms((data as Room[]) || [])
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (session?.user) {
        setUid(session.user.id); setToken(session.access_token)
        const { data: prof } = await supabaseBrowser.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
        setMyName(((prof as { full_name?: string } | null)?.full_name || 'أنا'))
        await loadRooms()
        // فتح روم مباشرة من رابط القائمة الرئيسية (/team?room=<id>)
        try {
          const roomParam = new URLSearchParams(window.location.search).get('room')
          if (roomParam) {
            const { data: r } = await supabaseBrowser.from('chat_rooms').select('id, name, marid_enabled').eq('id', roomParam).maybeSingle()
            if (r) await openRoom(r as Room)
          }
        } catch {}
      }
      setReady(true)
    })()
  }, [loadRooms])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages])

  async function openRoom(room: Room) {
    setActive(room)
    if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null }
    const { data } = await supabaseBrowser.from('chat_messages').select('*').eq('room_id', room.id).order('created_at', { ascending: true }).limit(100)
    setMessages((data as CMsg[]) || [])
    const ch = supabaseBrowser
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => setMessages((m) => (m.some((x) => x.id === (payload.new as CMsg).id) ? m : [...m, payload.new as CMsg])))
      .subscribe()
    chanRef.current = ch
  }

  async function sendMsg() {
    const text = input.trim()
    if (!text || !active || !uid || busy) return
    setInput(''); setBusy(true)
    try {
      const { data: ins } = await supabaseBrowser
        .from('chat_messages')
        .insert({ room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName, body: text, kind: 'text' } as never)
        .select('*').single()
      if (ins) setMessages((m) => (m.some((x) => x.id === (ins as CMsg).id) ? m : [...m, ins as CMsg]))
      if (/مارد/.test(text)) {
        await fetch('/api/team/marid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ roomId: active.id, text }),
        })
      }
    } finally { setBusy(false) }
  }

  async function createRoom() {
    if (!uid) return
    const name = prompt('اسم غرفة الفريق:')?.trim()
    if (!name) return
    const { data: room } = await supabaseBrowser.from('chat_rooms').insert({ name, kind: 'team', created_by: uid } as never).select('id, name, marid_enabled').single()
    if (room) {
      await supabaseBrowser.from('chat_room_members').insert({ room_id: (room as Room).id, profile_id: uid, role: 'owner' } as never)
      await loadRooms(); openRoom(room as Room)
    }
  }

  async function addMember() {
    if (!active) return
    const raw = prompt('رقم موبايل العضو (لازم يكون مسجّل على مضمونة):')?.trim()
    if (!raw) return
    const p20 = normEg(raw); const local = '0' + p20.slice(2)
    const { data: prof } = await supabaseBrowser.from('profiles').select('id, full_name').or(`phone.eq.${local},phone.eq.${p20}`).limit(1).maybeSingle()
    if (!prof) { alert('مفيش أكونت بالرقم ده — لازم يكون مسجّل على مضمونة الأول'); return }
    const { error } = await supabaseBrowser.from('chat_room_members').insert({ room_id: active.id, profile_id: (prof as { id: string }).id, role: 'member' } as never)
    alert(error ? 'مقدرتش أضيفه (لازم تكون مالك الغرفة)' : `تمت إضافة ${(prof as { full_name?: string }).full_name || 'العضو'} ✅`)
  }

  if (!ready) return <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#075E54', color: '#fff', fontFamily: 'system-ui' }}>لحظة…</div>

  if (!uid) return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: '#075E54', color: '#fff', fontFamily: 'system-ui', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 44 }}>👥</div>
        <h2>فريق العمل</h2>
        <p style={{ opacity: .85 }}>لازم تسجّل دخول على مضمونة الأول.</p>
        <a href="/auth/login" style={{ background: '#25D366', color: '#053b32', padding: '10px 20px', borderRadius: 10, fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>تسجيل الدخول</a>
      </div>
    </div>
  )

  if (!active) return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECE5DD', fontFamily: 'system-ui' }}>
      <header style={{ background: '#075E54', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, fontWeight: 700, fontSize: 18 }}>👥 فريق العمل</div>
        <button onClick={createRoom} style={{ background: '#25D366', color: '#053b32', border: 'none', borderRadius: 16, padding: '6px 12px', fontWeight: 700, cursor: 'pointer' }}>+ غرفة</button>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {rooms.length === 0 && <div style={{ textAlign: 'center', color: '#667', marginTop: 40 }}>لسه مفيش غرف. اعمل أول غرفة لفريقك 👆</div>}
        {rooms.map((r) => (
          <button key={r.id} onClick={() => openRoom(r)} style={{ display: 'flex', width: '100%', textAlign: 'right', alignItems: 'center', gap: 12, background: '#fff', border: 'none', borderRadius: 12, padding: 12, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#128C7E', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18 }}>{(r.name || 'غ')[0]}</div>
            <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{r.name || 'غرفة'}</div><div style={{ fontSize: 12, color: '#888' }}>اضغط للدخول</div></div>
          </button>
        ))}
      </div>
      <ChatBottomNav />
    </div>
  )

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#ECE5DD', fontFamily: 'system-ui' }}>
      <header style={{ background: '#075E54', color: '#fff', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <button onClick={() => { setActive(null); if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null } }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>→</button>
        <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{active.name || 'غرفة'}</div><div style={{ fontSize: 11, opacity: .85 }}>اكتب «مارد» لاستدعاء المساعد 🤖</div></div>
        <button onClick={addMember} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 10px', fontSize: 12, cursor: 'pointer' }}>+ عضو</button>
      </header>
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {messages.map((m) => {
          const mine = m.sender_id === uid
          const marid = m.sender_kind === 'marid'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
              <div style={{ maxWidth: '80%', background: mine ? '#DCF8C6' : (marid ? '#e7f3ff' : '#fff'), padding: '7px 10px', borderRadius: 10, boxShadow: '0 1px 1px rgba(0,0,0,.12)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.5 }}>
                {!mine && <div style={{ fontSize: 11, fontWeight: 700, color: marid ? '#0a66c2' : '#128C7E', marginBottom: 2 }}>{marid ? '🤖 المارد' : (m.sender_name || 'عضو')}</div>}
                {m.body}
                <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: '#8a8a8a', marginTop: 2 }}>{t(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        {busy && <div style={{ textAlign: 'end', color: '#667', fontSize: 13, padding: '2px 8px' }}>…</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 10, background: '#F0F0F0' }}>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMsg()} placeholder="اكتب رسالة… (اكتب «مارد» لاستدعاء المساعد)" style={{ flex: 1, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 22, fontSize: 15, outline: 'none' }} />
        <button onClick={sendMsg} disabled={busy} style={{ background: '#128C7E', color: '#fff', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: 18, cursor: 'pointer', opacity: busy ? 0.6 : 1 }}>➤</button>
      </div>
    </div>
  )
}
