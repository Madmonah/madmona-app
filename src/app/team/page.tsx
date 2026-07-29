'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Smile, Mic, Send, Square, Phone, Video } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import CallOverlay from '@/components/CallOverlay'
import FriendsSheet from '@/components/FriendsSheet'
import { subscribeToPush, getNotificationPermission, isPushSupported } from '@/lib/push-subscription'

const EMOJIS = ['😀','😂','🥰','😍','👍','🙏','🔥','🎉','❤️','😅','😊','🤝','👌','💪','🙌','😎','🤔','😢','😮','🥳','😉','🫡','💯','✅','⭐','🎁','📦','🚗','🏠','🍔','☕','💰','📞','✍️','👏','😇','🤩','🌹','🙈','🤗']

type Room = { id: string; name: string | null; marid_enabled: boolean; kind?: string | null; otherName?: string | null; role?: string | null }
type CMsg = { id: string; sender_id: string | null; sender_kind: string; sender_name: string | null; body: string | null; kind: string; media_url: string | null; created_at: string }
type Member = { member_id: string; member_name: string; member_role: string; is_me: boolean }

function t(iso: string) {
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '' }
}
function normEg(raw: string) {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}

type PickedContact = { phone: string; name?: string }

// هل المتصفح بيدعم اختيار جهات الاتصال؟ (كروم أندرويد على https)
function contactsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'contacts' in navigator && typeof window !== 'undefined' && 'ContactsManager' in window
}

// يجيب رقم موبايل: من جهات الاتصال لو مدعوم، وإلا يكتبه المستخدم يدوي (ديسكتوب)
async function getPhone(promptMsg: string): Promise<PickedContact | null> {
  if (contactsSupported()) {
    try {
      const cm = (navigator as unknown as {
        contacts: {
          select: (p: string[], o: { multiple: boolean }) => Promise<Array<{ tel?: string[]; name?: string[] }>>
          getProperties?: () => Promise<string[]>
        }
      }).contacts
      const avail = (cm.getProperties ? await cm.getProperties() : ['tel', 'name']) || ['tel', 'name']
      const want = ['tel', 'name'].filter((p) => avail.includes(p))
      const sel = await cm.select(want.length ? want : ['tel'], { multiple: false })
      if (!sel || !sel.length) return null // المستخدم قفل الاختيار
      const c = sel[0]
      const phone = (c.tel || []).find(Boolean) || ''
      const name = (c.name || []).find(Boolean) || ''
      if (!phone) { alert('الكونتاكت ده مالوش رقم موبايل 📵'); return null }
      return { phone, name }
    } catch { /* أي خطأ → نرجع للكتابة اليدوي */ }
  }
  const raw = prompt(promptMsg)?.trim()
  if (!raw) return null
  return { phone: raw }
}

// دعوة أوتوماتيك: يفتح واتساب على رقم الكونتاكت برسالة جاهزة (للتطبيق أو للجروب)
function sendInvite(picked: PickedContact, opts: { roomId?: string; roomName?: string }) {
  if (typeof window === 'undefined') return
  const wa = normEg(picked.phone)
  const first = (picked.name || '').trim().split(/\s+/)[0]
  const hi = first ? `أهلاً ${first} 👋 ` : ''
  const msg = opts.roomId
    ? `${hi}تعال انضم لمجموعة «${opts.roomName || 'فريقنا'}» على شات مضمونة 💬\n${window.location.origin}/chat/join/${opts.roomId}`
    : `${hi}تعال سجّل على مضمونة (مجاناً) ونكمّل شغلنا ومهامنا مع بعض في مكان واحد 💬\n${window.location.origin}`
  window.open(`https://wa.me/${wa}?text=${encodeURIComponent(msg)}`, '_blank')
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
  const [toast, setToast] = useState('')
  const [gallery, setGallery] = useState(false)
  const [forwardMsg, setForwardMsg] = useState<CMsg | null>(null)
  const [recording, setRecording] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)          // قائمة (⋮) في هيدر المحادثة
  const [membersOpen, setMembersOpen] = useState(false)    // شيت عرض الأعضاء
  const [members, setMembers] = useState<Member[]>([])
  const [membersLoading, setMembersLoading] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)        // لوحة الإيموجي (زي شات المارد)
  const [showPlus, setShowPlus] = useState(false)          // شيت الإرفاق ➕ (صورة/ملف/موقع/ميعاد)
  const [call, setCall] = useState<{ video: boolean } | null>(null)      // مكالمة شغالة
  const [incomingCall, setIncomingCall] = useState<CMsg | null>(null)    // بانر مكالمة واردة
  const [showFriends, setShowFriends] = useState(false)    // شيت الأصدقاء
  const scrollRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLInputElement>(null)
  const chanRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const askedNotifRef = useRef(false)

  // تفعيل الإشعارات تلقائي أول ما المستخدم يفتح جروب/محادثة (اتفق عليه محمد 26 يوليو:
  // «لمسة المحادثة»). لمسة فتح الغرفة = user gesture صالح للمتصفح. مرة واحدة، ولو default بس.
  async function maybeAutoEnableNotifs() {
    if (askedNotifRef.current) return
    if (!isPushSupported()) return
    if (getNotificationPermission() !== 'default') return // granted → مشترك · denied → مانضايقوش
    askedNotifRef.current = true
    try { await subscribeToPush() } catch {}
  }

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
    void maybeAutoEnableNotifs() // لمسة فتح الغرفة = فرصة نطلب إذن الإشعارات (مرة واحدة)
    setActive(room); setMenuOpen(false); setMembersOpen(false)
    if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null }
    // دوري في الغرفة (owner/member) — يحدّد خيارات القائمة
    let myRole = room.role || null
    if (!myRole && uid) {
      const { data: mrow } = await supabaseBrowser.from('chat_room_members').select('role').eq('room_id', room.id).eq('profile_id', uid).maybeSingle()
      myRole = (mrow as { role?: string } | null)?.role || 'member'
      setActive((a) => (a && a.id === room.id ? { ...a, role: myRole } : a))
    }
    // «مسح من عندي»: لو ليا صف مسح على الغرفة دي، نعرض بس الأحدث منه
    let clearedAt: string | null = null
    if (uid) {
      const { data: cl } = await supabaseBrowser.from('chat_room_clears').select('cleared_at').eq('room_id', room.id).eq('profile_id', uid).maybeSingle()
      clearedAt = (cl as { cleared_at?: string } | null)?.cleared_at || null
    }
    let q = supabaseBrowser.from('chat_messages').select('*').eq('room_id', room.id)
    if (clearedAt) q = q.gt('created_at', clearedAt)
    const { data } = await q.order('created_at', { ascending: true }).limit(100)
    setMessages((data as CMsg[]) || [])
    const ch = supabaseBrowser
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const msg = payload.new as CMsg
          if (msg.sender_kind === 'marid') setMaridThinking(false)
          // مكالمة واردة: رسالة kind='call' من حد تاني وجديدة → بانر انضمام
          if (msg.kind === 'call' && msg.sender_id !== uid && Date.now() - new Date(msg.created_at).getTime() < 90_000) setIncomingCall(msg)
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
      const kind = file.type.startsWith('image/') ? 'image' : file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document'
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

  // تسجيل رسالة صوتية وإرسالها — بتتفرّغ لنص في السيرفر عشان تظهر والمارد يفهمها لما يتنده
  async function toggleRec() {
    if (busy) return
    if (recording) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); chunksRef.current = []
      mr.ondataavailable = (ev) => { if (ev.data.size) chunksRef.current.push(ev.data) }
      mr.onstop = async () => {
        stream.getTracks().forEach((tr) => tr.stop())
        setRecording(false)
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        if (blob.size > 0) await sendMedia(new File([blob], 'voice.webm', { type: 'audio/webm' }))
      }
      recRef.current = mr; mr.start(); setRecording(true)
    } catch { alert('مش قادر أوصل للمايك') }
  }

  // ابدأ مكالمة (صوت/فيديو): بنبعت رسالة kind='call' علشان الطرف التاني يشوف بانر الانضمام
  async function startCall(video: boolean) {
    if (!active || !uid) return
    setShowPlus(false); setShowEmoji(false)
    try {
      await supabaseBrowser.from('chat_messages').insert({
        room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName,
        body: video ? '🎥 بدأ مكالمة فيديو — اكبس زر الفيديو فوق علشان تنضم' : '📞 بدأ مكالمة صوتية — اكبس زر السماعة فوق علشان تنضم',
        kind: 'call',
      } as never)
    } catch {}
    setCall({ video })
  }
  function joinIncoming() {
    const wantVideo = /🎥/.test(incomingCall?.body || '')
    setIncomingCall(null); setCall({ video: wantVideo })
  }

  // بعت موقعي الحالي كرسالة لينك خرائط جوجل (زي شات المارد)
  function sendLocation() {
    setShowPlus(false)
    if (!navigator.geolocation) { alert('الموقع مش متاح في المتصفح ده'); return }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        if (!active || !uid) return
        const body = `📍 موقعي: https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`
        const { data: ins } = await supabaseBrowser.from('chat_messages')
          .insert({ room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName, body, kind: 'text' } as never)
          .select('*').single()
        if (ins) setMessages((m) => (m.some((x) => x.id === (ins as CMsg).id) ? m : [...m, ins as CMsg]))
      },
      () => alert('مش قادر أجيب موقعك — اسمح للمتصفح بالوصول للموقع')
    )
  }
  // بعت ميعاد متاح (زي شات المارد)
  async function onCal(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; e.target.value = ''; setShowPlus(false)
    if (!v || !active || !uid) return
    const body = `🗓️ أنا متاح: ${new Date(v).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}`
    const { data: ins } = await supabaseBrowser.from('chat_messages')
      .insert({ room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName, body, kind: 'text' } as never)
      .select('*').single()
    if (ins) setMessages((m) => (m.some((x) => x.id === (ins as CMsg).id) ? m : [...m, ins as CMsg]))
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

  // حوّل رسالة لمهمة في نظام الشغل (زي ClickUp)
  async function addTask(m: CMsg) {
    const text = (m.body || '').trim()
    if (!text || !active) return
    try {
      const res = await fetch('/api/team/task', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ roomId: active.id, text }),
      })
      const d = await res.json()
      setToast(d?.ok ? `✅ اتعملت مهمة${d.assignee ? ` — لـ${d.assignee}` : ''}` : (d?.error || 'مقدرتش أعمل المهمة'))
    } catch { setToast('مقدرتش أعمل المهمة') }
    setTimeout(() => setToast(''), 3500)
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
    const name = prompt('اسم الجروب:')?.trim()
    if (!name) return
    const { data: room } = await supabaseBrowser.from('chat_rooms').insert({ name, kind: 'team', created_by: uid } as never).select('id, name, marid_enabled').single()
    if (room) {
      await supabaseBrowser.from('chat_room_members').insert({ room_id: (room as Room).id, profile_id: uid, role: 'owner' } as never)
      await loadRooms(uid); openRoom({ ...(room as Room), kind: 'team', role: 'owner' })
    }
  }

  // فتح محادثة خاصة برقم معيّن (بيستخدمها شيت الأصدقاء «💬 كلّمه»)
  async function openDMByPhone(phone: string) {
    setShowFriends(false)
    await startDM({ phone })
  }

  // ابدأ محادثة خاصة ١:١ — اختار الشخص من جهات اتصال التليفون
  async function startDM(pre?: PickedContact) {
    if (!uid) return
    const picked = pre || await getPhone('رقم موبايل الشخص (لازم يكون مسجّل على مضمونة):')
    if (!picked) return
    try {
      const res = await fetch('/api/chat/dm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ phone: picked.phone }),
      })
      const data = await res.json()
      if (!data?.ok) {
        if (data?.error === 'self') { alert('ده رقمك انت 🙂'); return }
        // مش مسجّل على مضمونة → دعوة أوتوماتيك على واتساب
        if (data?.error === 'no_account') {
          sendInvite(picked, {})
          alert(`${picked.name || 'الشخص ده'} لسه مش على مضمونة — فتحنا واتساب علشان تبعتله دعوة 📨`)
          return
        }
        alert('مقدرتش أبدأ المحادثة، جرّب تاني.')
        return
      }
      await loadRooms(uid)
      openRoom({ id: data.roomId, name: null, marid_enabled: false, kind: 'direct', otherName: data.otherName || 'محادثة خاصة' })
    } catch { alert('مش قادر أبدأ المحادثة دلوقتي.') }
  }

  async function addMember() {
    if (!active) return
    const picked = await getPhone('رقم موبايل العضو (لازم يكون مسجّل على مضمونة):')
    if (!picked) return
    const p20 = normEg(picked.phone); const local = '0' + p20.slice(2)
    const { data: prof } = await supabaseBrowser.from('profiles').select('id, full_name').or(`phone.eq.${local},phone.eq.${p20}`).limit(1).maybeSingle()
    if (!prof) {
      // مش مسجّل على مضمونة → دعوة أوتوماتيك للجروب على واتساب
      sendInvite(picked, { roomId: active.id, roomName: active.name || undefined })
      setToast('📨 مش مسجّل — فتحنا واتساب تبعتله دعوة للجروب')
      setTimeout(() => setToast(''), 3500)
      return
    }
    const { error } = await supabaseBrowser.from('chat_room_members').insert({ room_id: active.id, profile_id: (prof as { id: string }).id, role: 'member' } as never)
    if (error) { alert('مقدرتش أضيفه (لازم تكون مالك الجروب)'); return }
    setToast(`تمت إضافة ${(prof as { full_name?: string }).full_name || 'العضو'} ✅`); setTimeout(() => setToast(''), 3000)
    if (membersOpen) openMembers()  // حدّث لستة الأعضاء لو مفتوحة
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

  const iAmOwner = active?.role === 'owner'

  // فتح شيت الأعضاء + تحميل اللستة من الـRPC (آمن — عضو الغرفة بس)
  async function openMembers() {
    if (!active) return
    setMenuOpen(false); setMembersOpen(true); setMembersLoading(true)
    try {
      const { data, error } = await supabaseBrowser.rpc('room_members', { _room: active.id })
      if (error) throw error
      setMembers((data as Member[]) || [])
    } catch { setToast('مقدرتش أجيب الأعضاء'); setTimeout(() => setToast(''), 3000) }
    finally { setMembersLoading(false) }
  }

  // المالك يشيل عضو
  async function kickMember(m: Member) {
    if (!active || !iAmOwner || m.is_me) return
    if (!confirm(`تشيل ${m.member_name} من الجروب؟`)) return
    const { error } = await supabaseBrowser.rpc('remove_room_member', { _room: active.id, _member: m.member_id })
    if (error) { setToast('مقدرتش أشيله'); setTimeout(() => setToast(''), 3000); return }
    setMembers((list) => list.filter((x) => x.member_id !== m.member_id))
    setToast(`اتشال ${m.member_name} ✅`); setTimeout(() => setToast(''), 3000)
  }

  // مسح المحادثة من عندي أنا بس (تفضل عند الباقيين)
  async function clearForMe() {
    if (!active) return
    setMenuOpen(false)
    if (!confirm('مسح المحادثة من عندك انت بس؟ (هتفضل عند باقي الأعضاء)')) return
    const { error } = await supabaseBrowser.rpc('clear_room_for_me', { _room: active.id })
    if (error) { setToast('مقدرتش أمسح'); setTimeout(() => setToast(''), 3000); return }
    setMessages([])
    setToast('اتمسحت المحادثة من عندك ✅'); setTimeout(() => setToast(''), 3000)
  }

  // المالك يمسح رسايل الجروب للكل نهائياً
  async function clearForAll() {
    if (!active || !iAmOwner) return
    setMenuOpen(false)
    if (!confirm('مسح كل رسايل الجروب للأعضاء كلهم نهائياً؟ (مفيش رجوع)')) return
    const { error } = await supabaseBrowser.rpc('clear_room_messages_for_all', { _room: active.id })
    if (error) { setToast('مقدرتش أمسح'); setTimeout(() => setToast(''), 3000); return }
    setMessages([])
    setToast('اتمسحت رسايل الجروب للكل ✅'); setTimeout(() => setToast(''), 3000)
  }

  // الخروج من الجروب (أي عضو)
  async function leaveGroup() {
    if (!active) return
    setMenuOpen(false)
    if (!confirm(`تخرج من جروب «${active.name || 'الجروب'}»؟`)) return
    const { error } = await supabaseBrowser.rpc('leave_room', { _room: active.id })
    if (error) {
      const msg = /owner must delete/i.test(error.message)
        ? 'انت المالك — لازم تحذف الجروب أو تنقل الملكية قبل الخروج.'
        : 'مقدرتش أخرج، جرّب تاني.'
      setToast(msg); setTimeout(() => setToast(''), 4000); return
    }
    if (uid) await loadRooms(uid)
    setActive(null)
    if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null }
  }

  // حذف الجروب بالكامل (المالك بس) — أو حذف المحادثة الخاصة (أي طرف فيها)
  async function deleteGroup() {
    if (!active) return
    const isDirect = active.kind === 'direct'
    if (!isDirect && !iAmOwner) return
    setMenuOpen(false)
    const q = isDirect
      ? `حذف المحادثة مع «${active.otherName || 'الشخص ده'}» نهائياً بكل رسايلها؟ (هتتحذف عند الطرفين — مفيش رجوع)`
      : `حذف جروب «${active.name || 'الجروب'}» نهائياً بكل رسايله وأعضائه؟ (مفيش رجوع)`
    if (!confirm(q)) return
    const { error } = await supabaseBrowser.rpc('delete_room', { _room: active.id })
    if (error) { setToast('مقدرتش أحذف الجروب'); setTimeout(() => setToast(''), 3000); return }
    if (uid) await loadRooms(uid)
    setActive(null)
    if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null }
  }

  if (!ready) return <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#14231E,#1F6F5F)', color: '#fff', fontFamily: 'system-ui' }}>لحظة…</div>

  if (!uid) return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#14231E,#1F6F5F)', color: '#fff', fontFamily: 'system-ui', textAlign: 'center', padding: 20 }}>
      <div>
        <div style={{ fontSize: 44 }}>👥</div>
        <h2>الجروبات</h2>
        <p style={{ opacity: .85 }}>لازم تسجّل دخول على مضمونة الأول.</p>
        <a href="/auth/login" style={{ background: '#F4C430', color: '#3a2e05', padding: '10px 20px', borderRadius: 12, fontWeight: 700, textDecoration: 'none', display: 'inline-block', marginTop: 10 }}>تسجيل الدخول</a>
      </div>
    </div>
  )

  if (!active) return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');"}</style>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ flex: 1, fontWeight: 900, fontSize: 17 }}>👥 محادثاتك</div>
        <button onClick={() => setShowFriends(true)} title="أصحابك على مضمونة" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 999, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 12.5, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>🤝 أصحابي</button>
        <button onClick={() => startDM()} title="اختار شخص من جهات الاتصال" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 999, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 12.5, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>💬 خاصة</button>
        <button onClick={createRoom} style={{ background: '#2FA084', color: '#fff', border: 'none', borderRadius: 999, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', fontSize: 12.5, whiteSpace: 'nowrap', fontFamily: 'inherit' }}>+ جروب</button>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {rooms.length === 0 && <div style={{ textAlign: 'center', color: '#5A6660', fontWeight: 600, marginTop: 40 }}>لسه مفيش محادثات. ابدأ محادثة خاصة 💬 أو اعمل جروب 👆</div>}
        {rooms.map((r) => {
          const isDirect = r.kind === 'direct'
          const title = isDirect ? (r.otherName || 'محادثة خاصة') : (r.name || 'جروب')
          return (
            <button key={r.id} onClick={() => openRoom(r)} style={{ display: 'flex', width: '100%', textAlign: 'right', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #EAE5D9', borderRadius: 16, padding: 12, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 2px rgba(20,35,30,.06)', fontFamily: 'inherit' }}>
              <div style={{ width: 46, height: 46, borderRadius: '50%', background: isDirect ? 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)' : 'linear-gradient(135deg,#D4A017,#6FCF97)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{(title || 'م').trim()[0]}</div>
              <div style={{ flex: 1 }}><div style={{ fontWeight: 800, color: '#14231E' }}>{title}</div><div style={{ fontSize: 12, color: '#8A9690', fontWeight: 600 }}>{isDirect ? 'محادثة خاصة' : 'جروب'}</div></div>
            </button>
          )
        })}
      </div>
      {showFriends && <FriendsSheet onOpenDM={openDMByPhone} onClose={() => setShowFriends(false)} />}
      <ChatBottomNav />
    </div>
  )

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F1EEE6', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800;900&display=swap');"}</style>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)', zIndex: 2 }}>
        <button onClick={() => { setActive(null); setMenuOpen(false); if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null } }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>→</button>
        <div onClick={() => { if (active.kind !== 'direct') openMembers() }} style={{ flex: 1, minWidth: 0, cursor: active.kind !== 'direct' ? 'pointer' : 'default' }}><div style={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.kind === 'direct' ? (active.otherName || 'محادثة خاصة') : (active.name || 'جروب')}</div><div style={{ fontSize: 10.5, fontWeight: 600, color: '#6FCF97' }}>{active.kind === 'direct' ? 'اضغط 🧞 لاستدعاء المارد' : 'اضغط للأعضاء · 🧞 للمارد'}</div></div>
        <button onClick={() => startCall(false)} title="مكالمة صوتية" aria-label="مكالمة صوتية" style={callBtn}><Phone size={16} strokeWidth={2.2} /></button>
        <button onClick={() => startCall(true)} title="مكالمة فيديو" aria-label="مكالمة فيديو" style={callBtn}><Video size={17} strokeWidth={2.2} /></button>
        <button onClick={summonMaridInRoom} disabled={busy} title="استدعِ المارد" style={{ background: '#2FA084', color: '#fff', border: 'none', borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>🧞</button>
        <button onClick={() => setGallery(true)} title="ميديا المحادثة" style={{ background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, padding: '5px 9px', fontSize: 13, cursor: 'pointer', whiteSpace: 'nowrap' }}>🖼️</button>
        <button onClick={() => setMenuOpen((v) => !v)} title="خيارات" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 11px', fontSize: 18, lineHeight: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>⋮</button>
      </header>
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 56, insetInlineStart: 10, background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.22)', overflow: 'hidden', minWidth: 210, fontSize: 14 }}>
            {active.kind === 'direct' ? (
              <>
                <button onClick={clearForMe} style={menuItem}>🧹 امسح المحادثة من عندي</button>
                <div style={{ height: 1, background: '#eee' }} />
                <button onClick={deleteGroup} style={{ ...menuItem, color: '#c0392b', fontWeight: 700 }}>🗑️ احذف المحادثة نهائياً</button>
              </>
            ) : (
              <>
                <button onClick={openMembers} style={menuItem}>👥 أعضاء الجروب</button>
                <button onClick={inviteLink} style={menuItem}>🔗 Invite بلينك</button>
                {iAmOwner && <button onClick={addMember} style={menuItem}>➕ ضيف عضو</button>}
                <div style={{ height: 1, background: '#eee' }} />
                <button onClick={clearForMe} style={menuItem}>🧹 امسح المحادثة من عندي</button>
                {iAmOwner && <button onClick={clearForAll} style={{ ...menuItem, color: '#c0392b' }}>🗑️ امسح الرسايل للكل</button>}
                <div style={{ height: 1, background: '#eee' }} />
                {iAmOwner
                  ? <button onClick={deleteGroup} style={{ ...menuItem, color: '#c0392b', fontWeight: 700 }}>❌ احذف الجروب</button>
                  : <button onClick={leaveGroup} style={{ ...menuItem, color: '#c0392b', fontWeight: 700 }}>🚪 اخرج من الجروب</button>}
              </>
            )}
          </div>
        </div>
      )}
      {incomingCall && !call && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#FFF7E0', borderBottom: '1px solid #f0e2b8' }}>
          <span style={{ fontSize: 20 }}>{/🎥/.test(incomingCall.body || '') ? '🎥' : '📞'}</span>
          <div style={{ flex: 1, fontSize: 13, fontWeight: 800, color: '#8a6d1a' }}>{incomingCall.sender_name || 'حد'} بدأ مكالمة</div>
          <button onClick={joinIncoming} style={{ background: '#2FA084', color: '#fff', border: 'none', borderRadius: 999, padding: '7px 16px', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>انضم</button>
          <button onClick={() => setIncomingCall(null)} style={{ background: 'none', border: 'none', fontSize: 17, color: '#8a6d1a', cursor: 'pointer' }}>✕</button>
        </div>
      )}
      {call && active && uid && <CallOverlay roomId={active.id} uid={uid} myName={myName} video={call.video} onClose={() => setCall(null)} />}
      {membersOpen && (
        <div onClick={() => setMembersOpen(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 55, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', maxHeight: '70vh', overflowY: 'auto', borderRadius: '16px 16px 0 0', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <div style={{ fontWeight: 800, fontSize: 16, flex: 1 }}>👥 أعضاء «{active.name || 'الجروب'}» {members.length ? `(${members.length})` : ''}</div>
              <button onClick={() => setMembersOpen(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#888' }}>✕</button>
            </div>
            {membersLoading ? (
              <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>لحظة…</div>
            ) : members.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#888', padding: 20 }}>مفيش أعضاء</div>
            ) : members.map((m) => (
              <div key={m.member_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 4px', borderBottom: '1px solid #f2f2f2' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: m.member_role === 'owner' ? '#0a7d6e' : '#128C7E', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 16, fontWeight: 700, flexShrink: 0 }}>{(m.member_name || 'م').trim()[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{m.member_name}{m.is_me ? ' (انت)' : ''}</div>
                  <div style={{ fontSize: 12, color: m.member_role === 'owner' ? '#0a7d6e' : '#888' }}>{m.member_role === 'owner' ? '👑 مالك الجروب' : 'عضو'}</div>
                </div>
                {iAmOwner && !m.is_me && (
                  <button onClick={() => kickMember(m)} style={{ background: '#fdecea', color: '#c0392b', border: 'none', borderRadius: 10, padding: '6px 10px', fontSize: 12, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>شيل</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
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
      {toast && <div style={{ position: 'fixed', top: 70, left: '50%', transform: 'translateX(-50%)', background: '#14231E', color: '#fff', padding: '8px 16px', borderRadius: 999, fontSize: 13, fontWeight: 700, zIndex: 70, boxShadow: '0 4px 14px rgba(0,0,0,.25)' }}>{toast}</div>}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 12px', background: '#F1EEE6', backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(31,111,95,.07) 1.5px, transparent 0)', backgroundSize: '26px 26px' }}>
        {messages.map((m) => {
          const mine = m.sender_id === uid
          const marid = m.sender_kind === 'marid'
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: 9 }}>
              <div style={{ maxWidth: '82%', background: mine ? 'linear-gradient(118deg,#1F6F5F,#2d7a52)' : (marid ? '#FFF7E0' : '#fff'), color: mine ? '#fff' : '#14231E', padding: '10px 14px', borderRadius: mine ? '18px 18px 5px 18px' : '18px 18px 18px 5px', boxShadow: mine ? '0 6px 16px -8px rgba(31,111,95,.45)' : '0 1px 2px rgba(20,35,30,.06)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, fontWeight: 600, lineHeight: 1.65 }}>
                {!mine && <div style={{ fontSize: 11, fontWeight: 800, color: marid ? '#B78A12' : '#2FA084', marginBottom: 2 }}>{marid ? '🧞 المارد' : (m.sender_name || 'عضو')}</div>}
                {m.media_url && m.kind === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.media_url} alt="" onClick={() => window.open(m.media_url!, '_blank')} style={{ display: 'block', maxWidth: 220, width: '100%', borderRadius: 12, marginBottom: m.body ? 4 : 0, cursor: 'pointer' }} />
                )}
                {m.media_url && m.kind === 'video' && (
                  <video src={m.media_url} controls style={{ display: 'block', maxWidth: 240, width: '100%', borderRadius: 12, marginBottom: m.body ? 4 : 0 }} />
                )}
                {m.media_url && m.kind === 'audio' && (
                  <audio src={m.media_url} controls style={{ display: 'block', maxWidth: 240, width: '100%', marginBottom: m.body ? 4 : 0 }} />
                )}
                {m.media_url && m.kind !== 'image' && m.kind !== 'video' && m.kind !== 'audio' && (
                  <a href={m.media_url} target="_blank" rel="noreferrer" style={{ display: 'inline-block', marginBottom: m.body ? 4 : 0, color: mine ? '#CDEFE2' : '#1F6F5F', textDecoration: 'underline', fontSize: 14 }}>📎 ملف مرفق</a>
                )}
                {m.media_url && (
                  <button onClick={() => setForwardMsg(m)} title="تحويل لمحادثة تانية" style={{ display: 'block', marginBottom: 4, background: 'none', border: 'none', color: mine ? '#CDEFE2' : '#2FA084', cursor: 'pointer', fontSize: 12, padding: 0, fontFamily: 'inherit' }}>↗️ تحويل</button>
                )}
                {m.body}
                {m.body && (
                  <button onClick={() => addTask(m)} title="حوّل الرسالة لمهمة" style={{ display: 'block', marginTop: 4, background: 'none', border: 'none', color: mine ? '#CDEFE2' : '#1F6F5F', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 800, fontFamily: 'inherit' }}>➕ حوّل لمهمة</button>
                )}
                <span style={{ display: 'block', textAlign: 'left', fontSize: 9.5, fontWeight: 600, color: mine ? 'rgba(255,255,255,.65)' : '#9CA3AF', marginTop: 3 }}>{t(m.created_at)}</span>
              </div>
            </div>
          )
        })}
        {(busy || maridThinking) && <div style={{ textAlign: 'end', color: '#B78A12', fontSize: 13, padding: '4px 10px', fontWeight: 700 }}>🧞 المارد بيفكر…</div>}
      </div>
      {/* لوحة الإيموجي — زي شات المارد */}
      {showEmoji && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', maxHeight: 160, overflowY: 'auto' }}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setInput((v) => v + e)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 3 }}>{e}</button>
          ))}
        </div>
      )}

      {/* شيت الإرفاق ➕ — صورة/فيديو · ملف/مستند · موقعي · ميعاد (زي شات المارد) */}
      {showPlus && (
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', overflowX: 'auto' }}>
          <button onClick={() => { setShowPlus(false); fileRef.current?.click() }} style={sheetBtn}>🖼️<div style={sheetLbl}>صورة/فيديو</div></button>
          <button onClick={() => { setShowPlus(false); docRef.current?.click() }} style={sheetBtn}>📎<div style={sheetLbl}>ملف/مستند</div></button>
          <button onClick={sendLocation} style={sheetBtn}>📍<div style={sheetLbl}>موقعي</div></button>
          <button onClick={() => { const el = calRef.current; if (el) { try { el.showPicker() } catch { el.click() } } }} style={sheetBtn}>🗓️<div style={sheetLbl}>ميعاد</div></button>
        </div>
      )}

      {/* ─── الكومبوزر بهوية 4b: ➕ دايرة كريمي · بيل الكتابة مع إيموجي · مايك/إرسال متدرّج ─── */}
      <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) sendMedia(f); e.target.value = '' }} />
        <input ref={docRef} type="file" style={{ display: 'none' }} onChange={(e) => { const f = e.target.files?.[0]; if (f) sendMedia(f); e.target.value = '' }} />
        <input ref={calRef} type="datetime-local" onChange={onCal} style={{ display: 'none' }} />
        <button onClick={() => { setShowPlus((v) => !v); setShowEmoji(false) }} title="إرفاق" aria-label="إرفاق" style={{ width: 38, height: 38, borderRadius: '50%', background: '#F1EEE6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'transform .15s', transform: showPlus ? 'rotate(45deg)' : 'none' }}>
          <Plus size={18} color="#5A6660" strokeWidth={2.2} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F1EEE6', borderRadius: 999, padding: '10px 15px', minWidth: 0 }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMsg()}
            onFocus={() => { setShowEmoji(false); setShowPlus(false) }}
            placeholder={recording ? 'بسجّل…' : 'اكتب رسالتك…'}
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 500, color: '#14231E', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={() => { setShowEmoji((v) => !v); setShowPlus(false) }} title="إيموجي" aria-label="إيموجي" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
            <Smile size={17} color="#8A9690" strokeWidth={2} />
          </button>
        </div>
        {input.trim() ? (
          <button onClick={sendMsg} disabled={busy} title="إرسال" aria-label="إرسال" style={{ ...actionBtn, opacity: busy ? 0.6 : 1 }}>
            <Send size={18} color="#fff" strokeWidth={2.2} style={{ transform: 'scaleX(-1)' }} />
          </button>
        ) : (
          <button onClick={toggleRec} disabled={busy} title={recording ? 'إيقاف وإرسال' : 'رسالة صوتية'} aria-label="تسجيل صوت" style={{ ...actionBtn, background: recording ? '#E26D5C' : actionBtn.background, boxShadow: recording ? '0 8px 18px -6px rgba(226,109,92,.5)' : actionBtn.boxShadow, opacity: busy ? 0.6 : 1 }}>
            {recording ? <Square size={16} color="#fff" fill="#fff" /> : <Mic size={19} color="#fff" strokeWidth={2.2} />}
          </button>
        )}
      </div>
    </div>
  )
}

const callBtn: React.CSSProperties = { background: 'rgba(255,255,255,.12)', color: '#fff', border: '1px solid rgba(255,255,255,.18)', borderRadius: 999, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, padding: 0 }
const actionBtn: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#1F6F5F,#2FA084)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 8px 18px -6px rgba(31,111,95,.5)' }
const sheetBtn: React.CSSProperties = { border: '1px solid #EAE5D9', background: '#FAFAF7', borderRadius: 12, padding: '10px 16px', fontSize: 26, cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 2, fontFamily: 'inherit', flexShrink: 0 }
const sheetLbl: React.CSSProperties = { fontSize: 12, color: '#5A6660', fontWeight: 600 }

const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'start', padding: '12px 16px', border: 'none', background: '#fff', cursor: 'pointer', fontSize: 14, color: '#222' }
