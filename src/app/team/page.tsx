'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'

type Room = { id: string; name: string | null; marid_enabled: boolean; kind?: string | null; otherName?: string | null }
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
  const [maridThinking, setMaridThinking] = useState(false)
  const [gallery, setGallery] = useState(false)
  const [forwardMsg, setForwardMsg] = useState<CMsg | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const chanRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const loadRooms = useCallback(async (myId: string) => {
    const { data } = await supabaseBrowser.from('chat_rooms').select('id, name, marid_enabled, kind').order('created_at', { ascending: false })
    let rooms = (data as Room[]) || []
    // للمحادثات الخاصة (direct): نعرض اسم الطرف التاني
    const directIds = rooms.filter((r) => r.kind === 'direct').map((r) => r.id)
    if (directIds.length && myId) {
      try {
        const { data: mems } = await supabaseBrowser.from('chat_room_members').select('room_id, profile_id').in('room_id', directIds)
        const others = ((mems || []) as { room_id: string; profile_id: string }[]).filter((m) => m.profile_id !== myId)
        const otherIds = [...new Set(others.map((o) => o.profile_id))]
        const nameById = new Map<string, string>()
        if (otherIds.length) {
          const { data: profs } = await supabaseBrowser.from('profiles').select('id, full_name').in('id', otherIds)
          for (const p of (profs || []) as { id: string; full_name: string }[]) nameById.set(p.id, p.full_name)
        }
        const otherByRoom = new Map<string, string>()
        for (const o of others) if (!otherByRoom.has(o.room_id)) otherByRoom.set(o.room_id, nameById.get(o.profile_id) || 'محادثة خاصة')
        rooms = rooms.map((r) => (r.kind === 'direct' ? { ...r, otherName: otherByRoom.get(r.id) || 'محادثة خاصة' } : r))
      } catch { /* non-blocking */ }
    }
    setRooms(rooms)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (session?.user) {
        setUid(session.user.id); setToken(session.access_token)
        const { data: prof } = await supabaseBrowser.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle()
        setMyName(((prof as { full_name?: string } | null)?.full_name || 'أنا'))
        await loadRooms(session.user.id)
        // فتح روم مباشرة من رابط القائمة الرئيسية (/team?room=<id>)
        try {
          const roomParam = new URLSearchParams(window.location.search).get('room')
          if (roomParam) {
            const { data: r } = await supabaseBrowser.from('chat_rooms').select('id, name, marid_enabled, kind').eq('id', roomParam).maybeSingle()
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
        (payload) => {
          const msg = payload.new as CMsg
          if (msg.sender_kind === 'marid') setMaridThinking(false)
          setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]))
        })
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
      // المارد بيسمع اسمه: أي رسالة فيها «مارد» يرد عليها تلقائي (الرد بيوصل بالـrealtime)
      if (/مارد/i.test(text)) {
        setMaridThinking(true)
        setTimeout(() => setMaridThinking(false), 30000)
        fetch('/api/team/marid', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ roomId: active.id, text }),
        }).catch(() => {})
      }
    } finally { setBusy(false) }
  }

  // رفع ميديا (صورة/فيديو) — بيتبعت لـ/api/chat/media اللي بيرفع للستوريج ويسجّل الرسالة
  async function sendMedia(file: File) {
    if (!active || !uid || busy) return
    if (file.size > 25 * 1024 * 1024) { alert('الملف كبير أوي — الحد الأقصى 25 ميجا'); return }
    setBusy(true)
    try {
      const dataUrl: string = await new Promise((res, rej) => {
        const r = new FileReader()
        r.onload = () => res(String(r.result || ''))
        r.onerror = () => rej(new Error('read failed'))
        r.readAsDataURL(file)
      })
      const dataBase64 = dataUrl.split(',')[1] || ''
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : 'document'
      const resp = await fetch('/api/chat/media', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: active.id, dataBase64, mimetype: file.type, kind, filename: file.name }),
      })
      const j = await resp.json().catch(() => null)
      if (j?.ok && j.message) setMessages((m) => (m.some((x) => x.id === (j.message as CMsg).id) ? m : [...m, j.message as CMsg]))
      else alert(j?.error || 'فشل رفع الملف')
    } catch { alert('فشل رفع الملف') } finally { setBusy(false); if (fileRef.current) fileRef.current.value = '' }
  }

  // فوروارد: تحويل رسالة ميديا لمحادثة تانية (نسخ media_url + kind لغرفة تانية)
  async function forwardTo(room: Room) {
    const m = forwardMsg
    setForwardMsg(null)
    if (!m || !uid) return
    try {
      const { data: ins } = await supabaseBrowser
        .from('chat_messages')
        .insert({ room_id: room.id, sender_id: uid, sender_kind: 'user', sender_name: myName, body: m.body, kind: m.kind, media_url: m.media_url } as never)
        .select('*').single()
      if (active && room.id === active.id && ins) setMessages((x) => (x.some((y) => y.id === (ins as CMsg).id) ? x : [...x, ins as CMsg]))
    } catch { /* الرد بيوصل بالـrealtime لو نفس الغرفة */ }
  }

  // استدعاء المارد بزرار (بدل كلمة «مارد») — بيقرا الثريد ويرد لكل الأعضاء
  async function summonMaridInRoom() {
    if (!active || busy) return
    setBusy(true); setMaridThinking(true)
    setTimeout(() => setMaridThinking(false), 30000)
    try {
      await fetch('/api/team/marid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: active.id, text: '' }),
      })
    } catch { /* الرد بيوصل بالـrealtime */ } finally { setBusy(false) }
  }

  async function createRoom() {
    if (!uid) return
    const name = prompt('اسم غرفة الفريق:')?.trim()
    if (!name) return
    const { data: room } = await supabaseBrowser.from('chat_rooms').insert({ name, kind: 'team', created_by: uid } as never).select('id, name, marid_enabled').single()
    if (room) {
      await supabaseBrowser.from('chat_room_members').insert({ room_id: (room as Room).id, profile_id: uid, role: 'owner' } as never)
      await loadRooms(uid); openRoom(room as Room)
    }
  }

  // ابدأ محادثة خاصة ١:١ برقم موبايل
  async function startDM() {
    if (!uid) return
    const raw = prompt('رقم موبايل الشخص (لازم يكون مسجّل على مضمونة):')?.trim()
    if (!raw) return
    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: raw }),
      })
      const data = await res.json()
      if (!data?.ok) {
        alert(data?.error === 'no_account' ? 'مفيش أكونت بالرقم ده على مضمونة.' : data?.error === 'self' ? 'ده رقمك انت 🙂' : 'مقدرتش أبدأ المحادثة، جرّب تاني.')
        return
      }
      await loadRooms(uid)
      openRoom({ id: data.roomId, name: null, marid_enabled: false, kind: 'direct', otherName: data.otherName || 'محادثة خاصة' })
    } catch { alert('مش قادر أبدأ المحادثة دلوقتي.') }
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

  // دعوة بلينك — يتبعت على أي تطبيق (share sheet)، واللي يفتحه ينضم للمجموعة
  async function inviteLink() {
    if (!active) return
    const url = `${window.location.origin}/chat/join/${active.id}`
    const text = `تعال انضم لمجموعة «${active.name || 'فريقنا'}» على شات مضمونة 💬`
    if (typeof navigator !== 'undefined' && (navigator as Navigator & { share?: unknown }).share) {
      try { await navigator.share({ title: 'دعوة على شات مضمونة', text, url }); return } catch {}
    }
    try { await navigator.clipboard.writeText(url); alert('اتنسخ رابط الدعوة — ابعته لأي حد على أي تطبيق 👍') }
    catch { window.prompt('انسخ رابط الدعوة وابعته:', url) }
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
        <div style={{ flex: 1, fontWeight: 700, fontSize: 18 }}>👥 محادثاتك</div>
        <button onClick={startDM} style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 16, padding: '6px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>💬 خاصة</button>
        <button onClick={createRoom} style={{ background: '#25D366', color: '#053b32', border: 'none', borderRadius: 16, padding: '6px 10px', fontWeight: 700, cursor: 'pointer', fontSize: 13, whiteSpace: 'nowrap' }}>+ غرفة</button>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {rooms.length === 0 && <div style={{ textAlign: 'center', color: '#667', marginTop: 40 }}>لسه مفيش محادثات. ابدأ محادثة خاصة 💬 أو اعمل غرفة فريق 👆</div>}
        {rooms.map((r) => {
          const isDirect = r.kind === 'direct'
          const title = isDirect ? (r.otherName || 'محادثة خاصة') : (r.name || 'غرفة')
          return (
            <button key={r.id} onClick={() => openRoom(r)} style={{ display: 'flex', width: '100%', textAlign: 'right', alignItems: 'center', gap: 12, background: '#fff', border: 'none', borderRadius: 12, padding: 12, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 2px rgba(0,0,0,.08)' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: isDirect ? '#075E54' : '#128C7E', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18 }}>{(title || 'م').trim()[0]}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 700 }}>{title}</div><div style={{ fontSize: 12, color: '#888' }}>{isDirect ? 'محادثة خاصة' : 'غرفة فريق'}</div></div>
            </button>
          )
        })}
      </div>
      <ChatBottomNav />
    </div>
  )

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: 'linear-gradient(180deg,#ece5db 0%,#ddd4c6 100%)', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');"}</style>
      <header style={{ background: 'linear-gradient(135deg,#0a7d6e 0%,#075E54 100%)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 10px rgba(0,0,0,.18)', zIndex: 2 }}>
        <button onClick={() => { setActive(null); if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null } }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>→</button>
        <div style={{ flex: 1, minWidth: 0 }}><div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.kind === 'direct' ? (active.otherName || 'محادثة خاصة') : (active.name || 'غرفة')}</div><div style={{ fontSize: 11, opacity: .85 }}>اضغط 🧞 لاستدعاء المارد</div></div>
        <button onClick={summonMaridInRoom} disabled={busy} title="استدعِ المارد" style={{ background: '#25D366', color: '#053b32', border: 'none', borderRadius: 14, padding: '5px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1 }}>🧞 المارد</button>
        <button onClick={() => setGallery(true)} title="ميديا المحادثة" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 9px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>🖼️</button>
        <button onClick={inviteLink} title="دعوة بلينك" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 9px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>🔗</button>
        <button onClick={addMember} title="ضيف عضو" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 9px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>➕</button>
      </header>
      {gallery && (
        <div onClick={() => setGallery(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)', zIndex: 50, display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', color: '#fff' }}>
            <button onClick={(e) => { e.stopPropagation(); setGallery(false) }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>→</button>
            <div style={{ fontWeight: 700 }}>ميديا المحادثة</div>
          </div>
          {(() => {
            const media = messages.filter((m) => m.media_url && (m.kind === 'image' || m.kind === 'video'))
            if (media.length === 0) return <div style={{ color: '#bbb', textAlign: 'center', marginTop: 40 }}>لسه مفيش صور أو فيديو في المحادثة دي</div>
            return (
              <div onClick={(e) => e.stopPropagation()} style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6, alignContent: 'start' }}>
                {media.slice().reverse().map((m) => (
                  m.kind === 'image' ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img key={m.id} src={m.media_url!} alt="" onClick={() => window.open(m.media_url!, '_blank')} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, cursor: 'pointer' }} />
                  ) : (
                    <video key={m.id} src={m.media_url!} controls style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, background: '#000' }} />
                  )
                ))}
              </div>
            )
          })()}
        </div>
      )}
      {forwardMsg && (
        <div onClick={() => setForwardMsg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 60, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxHeight: '60vh', overflowY: 'auto', borderRadius: '16px 16px 0 0', padding: 16 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 16 }}>حوّل الميديا لـ…</div>
            {rooms.filter((r) => !active || r.id !== active.id).length === 0 ? (
              <div style={{ color: '#888', textAlign: 'center', padding: 16 }}>مفيش محادثات تانية تحوّل ليها</div>
            ) : rooms.filter((r) => !active || r.id !== active.id).map((r) => (
              <button key={r.id} onClick={() => forwardTo(r)} style={{ display: 'block', width: '100%', textAlign: 'right', padding: '12px 8px', border: 'none', borderBottom: '1px solid #eee', background: '#fff', cursor: 'pointer', fontSize: 15 }}>
                {r.kind === 'direct' ? `💬 ${r.otherName || 'محادثة خاصة'}` : `👥 ${r.name || 'غرفة'}`}
              </button>
            ))}
            <button onClick={() => setForwardMsg(null)} style={{ display: 'block', width: '100%', textAlign: 'center', padding: '12px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, color: '#888', marginTop: 6 }}>إلغاء</button>
          </div>
        </div>
      )}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '12px 10px' }}>
        {messages.map((m) => {
          const mine = m.sender_id === uid
          const marid = m.sender_kind === 'marid'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: 8 }}>
              <div style={{ maxWidth: '82%', background: mine ? '#d7f6c2' : (marid ? '#e7f1ff' : '#fff'), padding: '9px 13px', borderRadius: 16, boxShadow: '0 1px 4px rgba(0,0,0,.08)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.65 }}>
                {!mine && <div style={{ fontSize: 11, fontWeight: 700, color: marid ? '#0a66c2' : '#128C7E', marginBottom: 2 }}>{marid ? '🤖 المارد' : (m.sender_name || 'عضو')}</div>}
                {m.media_url && m.kind === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.media_url} alt="" onClick={() => window.open(m.media_url!, '_blank')} style={{ display: 'block', maxWidth: 220, width: '100%', borderRadius: 8, marginBottom: m.body ? 4 : 0, cursor: 'pointer' }} />
                )}
                {m.media_url && m.kind === 'video' && (
                  <video src={m.media_url} controls style={{ display: 'block', maxWidth: 240, width: '100%', borderRadius: 8, marginBottom: m.body ? 4 : 0 }} />
                )}
                {m.media_url && m.kind !== 'image' && m.kind !== 'video' && (
                  <a href={m.media_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: m.body ? 4 : 0, color: '#0a66c2', textDecoration: 'underline', fontSize: 14 }}>📎 ملف مرفق</a>
                )}
                {m.media_url && (
                  <button onClick={() => setForwardMsg(m)} title="تحويل لمحادثة تانية" style={{ display: 'block', marginBottom: 4, background: 'none', border: 'none', color: '#128C7E', cursor: 'pointer', fontSize: 12, padding: 0 }}>↗️ تحويل</button>
                )}
                {m.body}
                <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: '#8a8a8a', marginTop: 2 }}>{t(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        {(busy || maridThinking) && <div style={{ textAlign: 'end', color: '#0a66c2', fontSize: 13, padding: '4px 10px', fontWeight: 600 }}>🧞 المارد بيفكر…</div>}
      </div>
      <div style={{ display: 'flex', gap: 8, padding: 10, background: 'rgba(255,255,255,.92)', borderTop: '1px solid rgba(0,0,0,.06)', boxShadow: '0 -2px 10px rgba(0,0,0,.05)', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) sendMedia(f) }} />
        <button onClick={() => fileRef.current?.click()} disabled={busy} title="أرفق صورة أو فيديو" style={{ background: '#fff', color: '#128C7E', border: '1px solid #ddd', borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: 'pointer', flexShrink: 0, opacity: busy ? 0.6 : 1 }}>📎</button>
        <input value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && sendMsg()} placeholder="اكتب رسالة…" style={{ flex: 1, padding: '12px 14px', border: '1px solid #ddd', borderRadius: 22, fontSize: 15, outline: 'none' }} />
        <button onClick={sendMsg} disabled={busy} style={{ background: '#128C7E', color: '#fff', border: 'none', borderRadius: '50%', width: 48, height: 48, fontSize: 18, cursor: 'pointer', opacity: busy ? 0.6 : 1, flexShrink: 0 }}>➤</button>
      </div>
    </div>
  )
}
