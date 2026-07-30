'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Plus, Smile, Mic, Send, Square, Phone, Video } from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import dynamic from 'next/dynamic'
import { subscribeToPush, getNotificationPermission, isPushSupported } from '@/lib/push-subscription'
import { playRing } from '@/lib/ringtone'

// (31 Jul 2026) الثلاثة دول شاشات بتتفتح عند الطلب وكلهم conditional render،
// و CallOverlay لوحده جواه منطق WebRTC كامل (mesh + ICE + Realtime). تحميلهم
// كسول بيشيلهم من حزمة أول فتحة - وهي اللي فيها الديلاي.
const CallOverlay = dynamic(() => import('@/components/CallOverlay'), { ssr: false })
const FriendsSheet = dynamic(() => import('@/components/FriendsSheet'), { ssr: false })
const ContactBookSheet = dynamic(() => import('@/components/ContactBookSheet'), { ssr: false })

const EMOJIS = ['😀','😂','🥰','😍','👍','🙏','🔥','🎉','❤️','😅','😊','🤝','👌','💪','🙌','😎','🤔','😢','😮','🥳','😉','🫡','💯','✅','⭐','🎁','📦','🚗','🏠','🍔','☕','💰','📞','✍️','👏','😇','🤩','🌹','🙈','🤗']

type Room = { id: string; name: string | null; marid_enabled: boolean; kind?: string | null; otherName?: string | null; role?: string | null; mutedUntil?: string | null; archivedAt?: string | null; roomPinnedAt?: string | null }
type CMsg = { id: string; room_id?: string; sender_id: string | null; sender_kind: string; sender_name: string | null; body: string | null; kind: string; media_url: string | null; created_at: string; reply_to?: string | null; reactions?: Record<string, string[]> | null; edited_at?: string | null; deleted_at?: string | null; lat?: number | null; lng?: number | null; pinned_at?: string | null; payload?: Record<string, unknown> | null }
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
  const [showBook, setShowBook] = useState(false)           // شيت دفتر مضمونة
  const [newMenu, setNewMenu] = useState(false)             // قايمة ➕ في هيدر قايمة المحادثات
  const incomingRingRef = useRef<{ stop: () => void } | null>(null)

  // رنة + اهتزاز للمكالمة الواردة — بتقف لما تنضم أو ترفض أو تنتهي المهلة
  useEffect(() => {
    if (incomingCall && !call) {
      if (!incomingRingRef.current) incomingRingRef.current = playRing('incoming')
      const t = setTimeout(() => {
        incomingRingRef.current?.stop(); incomingRingRef.current = null
        setIncomingCall(null)   // المكالمة فاتت
      }, 45000)
      return () => clearTimeout(t)
    }
    incomingRingRef.current?.stop(); incomingRingRef.current = null
  }, [incomingCall, call])

  useEffect(() => () => { incomingRingRef.current?.stop(); incomingRingRef.current = null }, [])
  const scrollRef = useRef<HTMLDivElement>(null)
  const docRef = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLInputElement>(null)
  const chanRef = useRef<ReturnType<typeof supabaseBrowser.channel> | null>(null)
  // ── «بيكتب الآن» + «مين قرأ» ──
  const [typing, setTyping] = useState<Record<string, string>>({}) // uid → اسم
  const typingTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const lastTypingSent = useRef(0)
  const [readersFor, setReadersFor] = useState<{ msgId: string; list: { full_name: string | null; read_at: string }[] } | null>(null)
  // ── قايمة الرسالة (لمسة طويلة): ريأكشن / رد / تعديل / حذف / تثبيت / نجمة ──
  const [msgMenu, setMsgMenu] = useState<CMsg | null>(null)
  const [replyTo, setReplyTo] = useState<CMsg | null>(null)
  const [editing, setEditing] = useState<CMsg | null>(null)
  const [starred, setStarred] = useState<Set<string>>(new Set())
  const [showStarred, setShowStarred] = useState(false)
  const [showArchived, setShowArchived] = useState(false)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '🙏', '🔥']
  // ── بحث + منشن ──
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchHits, setSearchHits] = useState<{ id: string; body: string | null; sender_name: string | null; created_at: string }[]>([])
  const [searching, setSearching] = useState(false)
  const [mentionList, setMentionList] = useState<Member[] | null>(null)
  const mentionMap = useRef<Record<string, string>>({}) // اسم → profile_id
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

  // (31 Jul 2026) استعلام واحد بدل ٤-٥ ورا بعض.
  // كان: الغرف ← أعضاء المحادثات الخاصة ← أسماء الطرف التاني ← صفوف عضويتي.
  // كل واحدة مستنية اللي قبلها، وكل رحلة من مصر ≈ ١٥٠-٢٥٠ مللي.
  // chat_rooms_for_me() بترجّع الأربعة مع بعض (SECURITY INVOKER فالـRLS زي ما هي،
  // والترتيب - المثبّت الأول ثم الأحدث - بقى في SQL بدل ما يتعمل هنا).
  const loadRooms = useCallback(async (_myId: string) => {
    const { data, error } = await supabaseBrowser.rpc('chat_rooms_for_me')
    if (error) { setRooms([]); return }
    type RpcRoom = {
      id: string; name: string | null; marid_enabled: boolean; kind: string | null
      other_name: string | null; muted_until: string | null; archived_at: string | null
      pinned_at: string | null; member_role: string | null
    }
    const rooms: Room[] = ((data as RpcRoom[]) || []).map((r) => ({
      id: r.id,
      name: r.name,
      marid_enabled: r.marid_enabled,
      kind: r.kind,
      otherName: r.kind === 'direct' ? (r.other_name || 'محادثة خاصة') : null,
      role: r.member_role,
      mutedUntil: r.muted_until,
      archivedAt: r.archived_at,
      roomPinnedAt: r.pinned_at,
    }))
    setRooms(rooms)
  }, [])

  useEffect(() => {
    ;(async () => {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (session?.user) {
        setUid(session.user.id); setToken(session.access_token)
        // (31 Jul 2026) الاسم والغرف مالهمش أي علاقة ببعض، وكانوا بيتجابوا ورا
        // بعض - يعني رحلة كاملة للسيرفر مستنية على الفاضي. بالتوازي دلوقتي.
        const [{ data: prof }] = await Promise.all([
          supabaseBrowser.from('profiles').select('full_name').eq('id', session.user.id).maybeSingle(),
          loadRooms(session.user.id),
        ])
        setMyName(((prof as { full_name?: string } | null)?.full_name || 'أنا'))
        // فتح روم مباشرة من رابط القائمة الرئيسية (/team?room=<id>)
        // أو بدء محادثة خاصة جديدة من تاب المحادثات (/team?new=dm)
        try {
          const qs = new URLSearchParams(window.location.search)
          const roomParam = qs.get('room')
          if (roomParam) {
            const { data: r } = await supabaseBrowser.from('chat_rooms').select('id, name, marid_enabled, kind').eq('id', roomParam).maybeSingle()
            if (r) await openRoom(r as Room)
          } else if (qs.get('new') === 'dm') {
            void startDM()
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
    setTyping({}); setReplyTo(null); setEditing(null); setMsgMenu(null)
    setSearchOpen(false); setSearchQ(''); setSearchHits([]); setMentionList(null)
    // الأعضاء لازم يكونوا محمّلين عشان المنشن @ يلاقيهم من غير ما تفتح شيت الأعضاء
    if (room.kind !== 'direct') {
      supabaseBrowser.rpc('room_members', { _room: room.id })
        .then(({ data }) => setMembers((data as unknown as Member[]) || []))
    } else setMembers([])
    // نجوم الرسايل بتاعتي في الغرفة دي
    if (uid) {
      const ids = ((data as CMsg[]) || []).map((m) => m.id)
      if (ids.length) {
        const { data: st } = await supabaseBrowser.from('chat_message_stars').select('message_id').eq('profile_id', uid).in('message_id', ids)
        setStarred(new Set(((st as { message_id: string }[]) || []).map((r) => r.message_id)))
      } else setStarred(new Set())
    }
    void supabaseBrowser.rpc('chat_room_mark_read', { p_room: room.id })
    const ch = supabaseBrowser
      .channel(`room:${room.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const msg = payload.new as CMsg
          if (msg.sender_kind === 'marid') setMaridThinking(false)
          // مكالمة واردة: رسالة kind='call' من حد تاني وجديدة → بانر انضمام
          if (msg.kind === 'call' && msg.sender_id !== uid && Date.now() - new Date(msg.created_at).getTime() < 90_000) setIncomingCall(msg)
          setMessages((m) => (m.some((x) => x.id === msg.id) ? m : [...m, msg]))
          // الغرفة مفتوحة قصادي = الرسالة مقروءة
          if (msg.sender_id !== uid) void supabaseBrowser.rpc('chat_room_mark_read', { p_room: room.id })
          // أي رسالة جديدة تشيل مؤشر «بيكتب» بتاع صاحبها
          if (msg.sender_id) clearTypingFor(msg.sender_id)
        })
      // تعديل/ريأكشن/حذف/تثبيت من أي حد → يتزامن فوراً
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages', filter: `room_id=eq.${room.id}` },
        (payload) => {
          const up = payload.new as CMsg
          setMessages((m) => m.map((x) => (x.id === up.id ? { ...x, ...up } : x)))
        })
      // «بيكتب الآن» — broadcast مؤقت، مش بيتسجّل في الداتابيز
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        const { from, name } = (payload || {}) as { from?: string; name?: string }
        if (!from || from === uid) return
        setTyping((t) => ({ ...t, [from]: name || 'حد' }))
        if (typingTimers.current[from]) clearTimeout(typingTimers.current[from])
        typingTimers.current[from] = setTimeout(() => clearTypingFor(from), 4000)
      })
      .subscribe()
    chanRef.current = ch
  }

  function clearTypingFor(who: string) {
    if (typingTimers.current[who]) { clearTimeout(typingTimers.current[who]); delete typingTimers.current[who] }
    setTyping((t) => { if (!(who in t)) return t; const n = { ...t }; delete n[who]; return n })
  }

  // ابعت نبضة «بيكتب» — مرة كل ثانيتين بالكتير عشان منغرقش القناة
  function notifyTyping() {
    if (!active || !uid) return
    const now = Date.now()
    if (now - lastTypingSent.current < 2000) return
    lastTypingSent.current = now
    chanRef.current?.send({ type: 'broadcast', event: 'typing', payload: { from: uid, name: myName } })
  }

  // مين قرأ الرسالة دي
  async function openReaders(msgId: string) {
    const { data, error } = await supabaseBrowser.rpc('chat_msg_readers', { p_msg: msgId })
    if (error) { setToast('مش قادر أجيب مين قرأ'); setTimeout(() => setToast(''), 2500); return }
    setReadersFor({ msgId, list: (data as { full_name: string | null; read_at: string }[]) || [] })
  }

  // ─── كتم / أرشفة / تثبيت المحادثة ───
  function isMuted(r?: Room | null) {
    if (!r?.mutedUntil) return false
    const v = r.mutedUntil
    if (v.startsWith('infinity')) return true
    return new Date(v).getTime() > Date.now()
  }

  async function muteRoom(r: Room, hours: number | null) {
    setMenuOpen(false)
    const { error } = await supabaseBrowser.rpc('chat_room_mute', { p_room: r.id, p_hours: hours })
    if (error) { setToast('الكتم مش راضي'); setTimeout(() => setToast(''), 2500); return }
    const val = hours === null ? 'infinity' : (hours <= 0 ? null : new Date(Date.now() + hours * 3600_000).toISOString())
    setRooms((list) => list.map((x) => (x.id === r.id ? { ...x, mutedUntil: val } : x)))
    setActive((a) => (a && a.id === r.id ? { ...a, mutedUntil: val } : a))
    setToast(hours !== null && hours <= 0 ? '🔔 رجع يرن' : '🔕 اتكتمت'); setTimeout(() => setToast(''), 1800)
  }

  async function archiveRoom(r: Room, on: boolean) {
    setMenuOpen(false)
    const { error } = await supabaseBrowser.rpc('chat_room_archive', { p_room: r.id, p_on: on })
    if (error) { setToast('الأرشفة مش راضية'); setTimeout(() => setToast(''), 2500); return }
    setRooms((list) => list.map((x) => (x.id === r.id ? { ...x, archivedAt: on ? new Date().toISOString() : null } : x)))
    if (on) setActive(null)
    setToast(on ? '🗄️ اتأرشفت' : 'رجعت من الأرشيف'); setTimeout(() => setToast(''), 1800)
  }

  async function pinRoom(r: Room, on: boolean) {
    setMenuOpen(false)
    const { error } = await supabaseBrowser.rpc('chat_room_pin', { p_room: r.id, p_on: on })
    if (error) { setToast('التثبيت مش راضي'); setTimeout(() => setToast(''), 2500); return }
    setRooms((list) => {
      const next = list.map((x) => (x.id === r.id ? { ...x, roomPinnedAt: on ? new Date().toISOString() : null } : x))
      return [...next].sort((a, b) => (a.roomPinnedAt ? 0 : 1) - (b.roomPinnedAt ? 0 : 1))
    })
  }

  // ─── الرسايل المحفوظة (كل الغرف) ───
  const [starredMsgs, setStarredMsgs] = useState<CMsg[]>([])
  async function openStarred() {
    setMenuOpen(false); setShowStarred(true); setStarredMsgs([])
    if (!uid) return
    const { data: st } = await supabaseBrowser.from('chat_message_stars')
      .select('message_id').eq('profile_id', uid).order('starred_at', { ascending: false }).limit(100)
    const ids = ((st as { message_id: string }[]) || []).map((r) => r.message_id)
    if (!ids.length) return
    const { data: ms } = await supabaseBrowser.from('chat_messages').select('*').in('id', ids).is('deleted_at', null)
    setStarredMsgs((ms as CMsg[]) || [])
  }

  // ─── استبيان الجروبات ───
  const [pollDraft, setPollDraft] = useState<{ q: string; opts: string[]; multi: boolean; anon: boolean } | null>(null)
  const [pollResults, setPollResults] = useState<Record<string, { idx: number; label: string; votes: number; voters: string[] | null; mine: boolean }[]>>({})
  const pollAsked = useRef<Set<string>>(new Set()) // يمنع لوب لا نهائي لو الـRPC رجع فاضي

  async function loadPoll(pollId: string) {
    if (pollAsked.current.has(pollId)) return
    pollAsked.current.add(pollId)
    const { data } = await supabaseBrowser.rpc('chat_poll_results', { p_poll: pollId })
    if (data) setPollResults((p) => ({ ...p, [pollId]: data as { idx: number; label: string; votes: number; voters: string[] | null; mine: boolean }[] }))
  }

  async function reloadPoll(pollId: string) {
    pollAsked.current.delete(pollId)
    await loadPoll(pollId)
  }

  async function votePoll(pollId: string, idx: number) {
    const { error } = await supabaseBrowser.rpc('chat_poll_vote', { p_poll: pollId, p_option: idx })
    if (error) { setToast(error.message || 'التصويت مش راضي'); setTimeout(() => setToast(''), 2800); return }
    await reloadPoll(pollId)
  }

  async function createPoll() {
    const d = pollDraft
    if (!d || !active) return
    const opts = d.opts.map((o) => o.trim()).filter(Boolean)
    if (!d.q.trim()) { setToast('اكتب السؤال'); setTimeout(() => setToast(''), 2000); return }
    if (opts.length < 2) { setToast('لازم اختيارين على الأقل'); setTimeout(() => setToast(''), 2200); return }
    setBusy(true)
    const { error } = await supabaseBrowser.rpc('chat_poll_create', {
      p_room: active.id, p_question: d.q.trim(), p_options: opts, p_multi: d.multi, p_anonymous: d.anon,
    })
    setBusy(false)
    if (error) { setToast(error.message || 'الاستبيان مش راضي'); setTimeout(() => setToast(''), 2800); return }
    setPollDraft(null) // الرسالة بتوصل بالـrealtime
  }

  // ─── كارت جهة اتصال ───
  const [contactDraft, setContactDraft] = useState<{ name: string; phone: string } | null>(null)
  async function sendContact() {
    const d = contactDraft
    if (!d || !active || !uid) return
    const phone = normEg(d.phone)
    if (!d.name.trim() || phone.length < 10) { setToast('محتاج اسم ورقم صح'); setTimeout(() => setToast(''), 2200); return }
    setContactDraft(null)
    const { data: ins } = await supabaseBrowser.from('chat_messages').insert({
      room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName,
      body: `👤 ${d.name.trim()} — +${phone}`, kind: 'contact',
      payload: { name: d.name.trim(), phone: `+${phone}` },
    } as never).select('*').single()
    if (ins) setMessages((m) => (m.some((x) => x.id === (ins as CMsg).id) ? m : [...m, ins as CMsg]))
  }

  // ─── أكشنز الرسالة ───
  function startPress(m: CMsg) {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = setTimeout(() => { setMsgMenu(m); try { navigator.vibrate?.(15) } catch {} }, 420)
  }
  function cancelPress() { if (pressTimer.current) { clearTimeout(pressTimer.current); pressTimer.current = null } }

  function patchMsg(id: string, patch: Partial<CMsg>) {
    setMessages((list) => list.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  }

  async function react(m: CMsg, emoji: string) {
    setMsgMenu(null)
    const { data, error } = await supabaseBrowser.rpc('chat_msg_react', { p_msg: m.id, p_emoji: emoji })
    if (error) { setToast('الريأكشن مش راضي ينزل'); setTimeout(() => setToast(''), 2500); return }
    patchMsg(m.id, { reactions: (data as Record<string, string[]>) || {} })
  }

  async function toggleStar(m: CMsg) {
    setMsgMenu(null)
    const on = !starred.has(m.id)
    const { error } = await supabaseBrowser.rpc('chat_msg_star', { p_msg: m.id, p_on: on })
    if (error) { setToast('مش قادر أحفظها'); setTimeout(() => setToast(''), 2500); return }
    setStarred((s) => { const n = new Set(s); if (on) n.add(m.id); else n.delete(m.id); return n })
    setToast(on ? '⭐ اتحفظت' : 'اتشالت من المحفوظات'); setTimeout(() => setToast(''), 1800)
  }

  async function togglePin(m: CMsg) {
    setMsgMenu(null)
    const on = !m.pinned_at
    const { error } = await supabaseBrowser.rpc('chat_msg_pin', { p_msg: m.id, p_on: on })
    if (error) { setToast('مش قادر أثبّتها'); setTimeout(() => setToast(''), 2500); return }
    setMessages((list) => list.map((x) => (x.id === m.id ? { ...x, pinned_at: on ? new Date().toISOString() : null } : (on ? { ...x, pinned_at: null } : x))))
  }

  async function removeMsg(m: CMsg, forAll: boolean) {
    setMsgMenu(null)
    if (forAll && !confirm('تحذفها عند الكل؟ مش هتقدر ترجّعها.')) return
    const { error } = await supabaseBrowser.rpc('chat_msg_delete', { p_msg: m.id, p_for_all: forAll })
    if (error) { setToast(error.message || 'الحذف مش راضي'); setTimeout(() => setToast(''), 3000); return }
    if (forAll) patchMsg(m.id, { deleted_at: new Date().toISOString(), body: null, media_url: null, reactions: {} })
    else setMessages((list) => list.filter((x) => x.id !== m.id))
  }

  async function saveEdit() {
    const m = editing; const text = input.trim()
    if (!m) return
    if (!text) { setToast('اكتب حاجة'); setTimeout(() => setToast(''), 2000); return }
    setBusy(true)
    const { error } = await supabaseBrowser.rpc('chat_msg_edit', { p_msg: m.id, p_body: text })
    setBusy(false)
    if (error) { setToast('التعديل مش راضي'); setTimeout(() => setToast(''), 2500); return }
    patchMsg(m.id, { body: text, edited_at: new Date().toISOString() })
    setEditing(null); setInput('')
  }

  // ─── بحث في المحادثة ───
  async function runSearch(q: string) {
    setSearchQ(q)
    if (!active || q.trim().length < 2) { setSearchHits([]); return }
    setSearching(true)
    const { data, error } = await supabaseBrowser.rpc('chat_search', { p_room: active.id, p_q: q.trim() })
    setSearching(false)
    if (error) { setToast('البحث مش راضي'); setTimeout(() => setToast(''), 2500); return }
    setSearchHits((data as { id: string; body: string | null; sender_name: string | null; created_at: string }[]) || [])
  }

  function jumpTo(msgId: string) {
    setSearchOpen(false); setSearchQ(''); setSearchHits([])
    setTimeout(() => {
      const el = document.getElementById(`msg-${msgId}`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        el.style.transition = 'background .4s'
        const prev = el.style.background
        el.style.background = 'rgba(212,160,23,.22)'
        setTimeout(() => { el.style.background = prev }, 1400)
      } else setToast('الرسالة قديمة — مش محمّلة في الشاشة')
    }, 120)
  }

  // ─── منشن: @ بيفتح قايمة الأعضاء ───
  function onInputChange(v: string) {
    setInput(v)
    if (v) notifyTyping()
    const mt = /(?:^|\s)@([^\s@]{0,20})$/.exec(v)
    if (mt && active?.kind !== 'direct') {
      const term = (mt[1] || '').toLowerCase()
      const pool = members.filter((x) => !x.is_me && (!term || (x.member_name || '').toLowerCase().includes(term)))
      setMentionList(pool.slice(0, 6))
    } else setMentionList(null)
  }

  function pickMention(m: Member) {
    const replaced = input.replace(/(?:^|\s)@([^\s@]{0,20})$/, (full) => `${full.startsWith(' ') ? ' ' : ''}@${m.member_name} `)
    mentionMap.current[m.member_name] = m.member_id
    setInput(replaced)
    setMentionList(null)
  }

  // استخرج الـ ids من نص فيه @أسامي
  function extractMentions(text: string): string[] {
    const out: string[] = []
    for (const [name, id] of Object.entries(mentionMap.current)) {
      if (text.includes(`@${name}`) && !out.includes(id)) out.push(id)
    }
    return out
  }

  async function sendMsg() {
    if (editing) { await saveEdit(); return }
    const text = input.trim()
    if (!text || !active || !uid || busy) return
    const rt = replyTo?.id || null
    setInput(''); setReplyTo(null); setBusy(true)
    try {
      const { data: ins } = await supabaseBrowser
        .from('chat_messages')
        .insert({ room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName, body: text, kind: 'text', reply_to: rt } as never)
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

  // ضغط الصور قبل الرفع — 1280px عرض أقصى وجودة 0.7 (نفس منطق شات المارد)
  function compressImage(file: File): Promise<File> {
    return new Promise((resolve) => {
      const img = new Image(); const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, 1280 / img.width)
        if (scale === 1 && file.size < 400 * 1024) { URL.revokeObjectURL(url); resolve(file); return }
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        c.toBlob((blob) => {
          URL.revokeObjectURL(url)
          if (!blob) { resolve(file); return }
          resolve(new File([blob], (file.name || 'photo').replace(/\.\w+$/, '') + '.jpg', { type: 'image/jpeg' }))
        }, 'image/jpeg', 0.7)
      }
      img.onerror = () => { URL.revokeObjectURL(url); resolve(file) }
      img.src = url
    })
  }

  // رفع ميديا (صورة/فيديو) — بيتبعت لـ/api/chat/media اللي بيرفع للستوريج ويسجّل الرسالة
  async function sendMedia(file: File) {
    if (!active || !uid || busy) return
    if (file.type.startsWith('image/')) file = await compressImage(file)
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
        const lat = pos.coords.latitude, lng = pos.coords.longitude
        const body = `📍 موقعي: https://maps.google.com/?q=${lat.toFixed(6)},${lng.toFixed(6)}`
        const { data: ins } = await supabaseBrowser.from('chat_messages')
          .insert({ room_id: active.id, sender_id: uid, sender_kind: 'user', sender_name: myName, body, kind: 'location', lat, lng } as never)
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
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ flex: 1, minWidth: 0, fontWeight: 900, fontSize: 17, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>👥 جروباتك</div>
        <button onClick={() => setShowFriends(true)} title="أصحابي ودفتري" aria-label="أصحابي ودفتري" style={{ background: 'rgba(255,255,255,.12)', border: '1px solid rgba(255,255,255,.18)', color: '#fff', borderRadius: 999, width: 34, height: 34, display: 'grid', placeItems: 'center', fontSize: 16, cursor: 'pointer', flexShrink: 0, padding: 0 }}>🤝</button>
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <button onClick={() => setNewMenu((v) => !v)} title="جديد" aria-label="جديد" style={{ background: '#2FA084', border: 'none', color: '#fff', borderRadius: 999, width: 34, height: 34, display: 'grid', placeItems: 'center', fontSize: 20, lineHeight: 1, cursor: 'pointer', padding: 0, fontFamily: 'inherit' }}>+</button>
          {newMenu && (
            <>
              <div onClick={() => setNewMenu(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }} />
              <div style={{ position: 'absolute', top: 40, insetInlineEnd: 0, background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.22)', overflow: 'hidden', minWidth: 190, zIndex: 41 }}>
                <button onClick={() => { setNewMenu(false); createRoom() }} style={{ ...menuItem, color: '#14231E' }}>👥 جروب جديد</button>
                <div style={{ height: 1, background: '#eee' }} />
                <button onClick={() => { setNewMenu(false); setShowBook(true) }} style={{ ...menuItem, color: '#14231E' }}>📕 دفتر مضمونة</button>
              </div>
            </>
          )}
        </div>
      </header>
      <div style={{ flex: 1, overflowY: 'auto', padding: 10 }}>
        {(() => {
          // الجروبات بس — المحادثات الفردية مكانها /chat (قرار محمد 30 يوليو)
          const groups = rooms.filter((r) => r.kind !== 'direct')
          const archivedCount = groups.filter((r) => r.archivedAt).length
          const shown = groups.filter((r) => (showArchived ? !!r.archivedAt : !r.archivedAt))
          return (
            <>
              {archivedCount > 0 && (
                <button onClick={() => setShowArchived((v) => !v)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 8, background: showArchived ? '#EAE5D9' : '#fff', border: '1px solid #EAE5D9', borderRadius: 14, padding: '10px 12px', marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit' }}>
                  <span style={{ fontSize: 17 }}>🗄️</span>
                  <span style={{ flex: 1, textAlign: 'start', fontWeight: 800, fontSize: 13.5, color: '#14231E' }}>{showArchived ? 'إخفاء الأرشيف' : 'الأرشيف'}</span>
                  <span style={{ fontSize: 12, fontWeight: 800, color: '#8A9690' }}>{archivedCount}</span>
                </button>
              )}
              {shown.length === 0 && (
                <div style={{ textAlign: 'center', color: '#5A6660', fontWeight: 600, marginTop: 40, fontSize: 13.5, lineHeight: 1.9, padding: '0 20px' }}>
                  {showArchived ? 'الأرشيف فاضي.' : (
                    <>لسه مفيش جروبات.<br />اكبس ➕ واعمل جروب لفريقك أو لأصحابك.<br /><br />
                    <span style={{ fontSize: 12, color: '#8A9690' }}>المحادثات الفردية مكانها تاب 💬 محادثات</span></>
                  )}
                </div>
              )}
              {shown.map((r) => (
                <button key={r.id} onClick={() => openRoom(r)} style={{ display: 'flex', width: '100%', textAlign: 'right', alignItems: 'center', gap: 12, background: '#fff', border: '1px solid #EAE5D9', borderRadius: 16, padding: 12, marginBottom: 8, cursor: 'pointer', boxShadow: '0 1px 2px rgba(20,35,30,.06)', fontFamily: 'inherit' }}>
                  <div style={{ width: 46, height: 46, borderRadius: '50%', background: 'linear-gradient(135deg,#D4A017,#6FCF97)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 18, fontWeight: 800, flexShrink: 0 }}>{(r.name || 'ج').trim()[0]}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, color: '#14231E', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {r.roomPinnedAt && <span title="مثبّت" style={{ fontSize: 12 }}>📌</span>}
                      <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name || 'جروب'}</span>
                      {isMuted(r) && <span title="مكتوم" style={{ fontSize: 12 }}>🔕</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#8A9690', fontWeight: 600 }}>جروب</div>
                  </div>
                </button>
              ))}
            </>
          )
        })()}
      </div>
      {showStarred && (
        <div onClick={() => setShowStarred(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 96, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '18px 18px 0 0', padding: '16px 18px 22px', maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#14231E' }}>⭐ الرسايل المحفوظة</div>
              <button onClick={() => setShowStarred(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8A9690', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {starredMsgs.length === 0 ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8A9690', padding: '12px 0' }}>مفيش رسايل محفوظة. دوس مطوّل على أي رسالة واختار ⭐.</div>
            ) : starredMsgs.map((sm) => (
              <div key={sm.id} style={{ borderBottom: '1px solid #F1EEE6', padding: '10px 2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#1F6F5F' }}>{sm.sender_name || 'عضو'}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>{t(sm.created_at)}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#14231E', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{sm.body || '📎 مرفق'}</div>
              </div>
            ))}
          </div>
        </div>
      )}
      {showBook && <ContactBookSheet onClose={() => { setShowBook(false); if (uid) loadRooms(uid) }} onOpenDM={openDMByPhone} />}
      {showFriends && <FriendsSheet onOpenDM={openDMByPhone} onClose={() => setShowFriends(false)} onOpenBook={() => setShowBook(true)} />}
      <ChatBottomNav />
    </div>
  )

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#F1EEE6', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <header style={{ background: 'linear-gradient(135deg,#14231E,#1F6F5F)', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(20,35,30,.28)', zIndex: 2 }}>
        <button onClick={() => { setActive(null); setMenuOpen(false); if (chanRef.current) { supabaseBrowser.removeChannel(chanRef.current); chanRef.current = null } }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer' }}>→</button>
        <div onClick={() => { if (active.kind !== 'direct') openMembers() }} style={{ flex: 1, minWidth: 0, cursor: active.kind !== 'direct' ? 'pointer' : 'default' }}><div style={{ fontWeight: 900, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{active.kind === 'direct' ? (active.otherName || 'محادثة خاصة') : (active.name || 'جروب')}</div><div style={{ fontSize: 10.5, fontWeight: 600, color: '#6FCF97' }}>{active.kind === 'direct' ? 'اضغط 🧞 لاستدعاء المارد' : 'اضغط للأعضاء · 🧞 للمارد'}</div></div>
        <button onClick={() => startCall(false)} title="مكالمة صوتية" aria-label="مكالمة صوتية" style={callBtn}><Phone size={16} strokeWidth={2.2} /></button>
        <button onClick={() => startCall(true)} title="مكالمة فيديو" aria-label="مكالمة فيديو" style={callBtn}><Video size={17} strokeWidth={2.2} /></button>
        <button onClick={summonMaridInRoom} disabled={busy} title="استدعِ المارد" style={{ background: '#2FA084', color: '#fff', border: 'none', borderRadius: 999, padding: '5px 11px', fontSize: 12, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>🧞</button>
        <button onClick={() => setMenuOpen((v) => !v)} title="خيارات" style={{ background: 'rgba(255,255,255,.2)', color: '#fff', border: 'none', borderRadius: 14, padding: '5px 11px', fontSize: 18, lineHeight: 1, cursor: 'pointer', whiteSpace: 'nowrap' }}>⋮</button>
      </header>
      {searchOpen && (
        <div style={{ background: '#fff', borderBottom: '1px solid #EAE5D9', padding: '10px 14px', maxHeight: '52vh', overflowY: 'auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#F1EEE6', borderRadius: 999, padding: '8px 14px' }}>
            <span style={{ fontSize: 14 }}>🔍</span>
            <input autoFocus value={searchQ} onChange={(e) => runSearch(e.target.value)} placeholder="دوّر في المحادثة…"
              style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 13.5, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit' }} />
            <button onClick={() => { setSearchOpen(false); setSearchQ(''); setSearchHits([]) }} style={{ background: 'none', border: 'none', fontSize: 17, color: '#8A9690', cursor: 'pointer' }}>×</button>
          </div>
          {searching && <div style={{ fontSize: 12, fontWeight: 700, color: '#8A9690', padding: '10px 4px' }}>بدوّر…</div>}
          {!searching && searchQ.trim().length >= 2 && searchHits.length === 0 && (
            <div style={{ fontSize: 13, fontWeight: 600, color: '#8A9690', padding: '12px 4px' }}>مفيش نتايج لـ «{searchQ.trim()}».</div>
          )}
          {searchHits.map((h) => (
            <button key={h.id} onClick={() => jumpTo(h.id)} style={{ display: 'block', width: '100%', textAlign: 'start', background: 'none', border: 'none', borderBottom: '1px solid #F1EEE6', padding: '10px 4px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: '#1F6F5F' }}>{h.sender_name || 'عضو'}</span>
                <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>{t(h.created_at)}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#14231E', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.body || '📎 مرفق'}</div>
            </button>
          ))}
        </div>
      )}
      {menuOpen && (
        <div onClick={() => setMenuOpen(false)} style={{ position: 'fixed', inset: 0, zIndex: 40 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 56, insetInlineStart: 10, background: '#fff', borderRadius: 12, boxShadow: '0 6px 24px rgba(0,0,0,.22)', overflow: 'hidden', minWidth: 210, fontSize: 14 }}>
            <button onClick={() => { setMenuOpen(false); setSearchOpen(true); setSearchQ(''); setSearchHits([]) }} style={menuItem}>🔍 بحث في المحادثة</button>
            <button onClick={() => { setMenuOpen(false); setGallery(true) }} style={menuItem}>🖼️ ميديا المحادثة</button>
            <div style={{ height: 1, background: '#eee' }} />
            <button onClick={() => pinRoom(active, !active.roomPinnedAt)} style={menuItem}>{active.roomPinnedAt ? '📌 شيل تثبيت المحادثة' : '📌 ثبّت المحادثة فوق'}</button>
            {isMuted(active)
              ? <button onClick={() => muteRoom(active, 0)} style={menuItem}>🔔 شغّل الإشعارات</button>
              : (
                <>
                  <button onClick={() => muteRoom(active, 8)} style={menuItem}>🔕 اكتم ٨ ساعات</button>
                  <button onClick={() => muteRoom(active, null)} style={menuItem}>🔕 اكتم لحد ما ألغي</button>
                </>
              )}
            <button onClick={() => archiveRoom(active, !active.archivedAt)} style={menuItem}>{active.archivedAt ? '🗄️ شيل من الأرشيف' : '🗄️ أرشِف المحادثة'}</button>
            <button onClick={openStarred} style={menuItem}>⭐ الرسايل المحفوظة</button>
            <div style={{ height: 1, background: '#eee' }} />
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
      {readersFor && (
        <div onClick={() => setReadersFor(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 90, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '18px 18px 0 0', padding: '16px 18px 22px', maxHeight: '60vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#14231E' }}>👁️ مين قرأ</div>
              <button onClick={() => setReadersFor(null)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8A9690', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {readersFor.list.length === 0 ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8A9690', padding: '10px 0' }}>محدش قرأها لسه.</div>
            ) : (
              readersFor.list.map((r, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < readersFor.list.length - 1 ? '1px solid #EAE5D9' : 'none' }}>
                  <span style={{ fontSize: 13.5, fontWeight: 700, color: '#14231E' }}>{r.full_name || 'عضو'}</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#8A9690' }}>{t(r.read_at)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
      {showStarred && (
        <div onClick={() => setShowStarred(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 96, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '18px 18px 0 0', padding: '16px 18px 22px', maxHeight: '72vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 900, color: '#14231E' }}>⭐ الرسايل المحفوظة</div>
              <button onClick={() => setShowStarred(false)} style={{ background: 'none', border: 'none', fontSize: 20, color: '#8A9690', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            {starredMsgs.length === 0 ? (
              <div style={{ fontSize: 13, fontWeight: 600, color: '#8A9690', padding: '12px 0' }}>مفيش رسايل محفوظة. دوس مطوّل على أي رسالة واختار ⭐.</div>
            ) : starredMsgs.map((sm) => (
              <div key={sm.id} style={{ borderBottom: '1px solid #F1EEE6', padding: '10px 2px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontSize: 11, fontWeight: 800, color: '#1F6F5F' }}>{sm.sender_name || 'عضو'}</span>
                  <span style={{ fontSize: 10, fontWeight: 600, color: '#9CA3AF' }}>{t(sm.created_at)}</span>
                </div>
                <div style={{ fontSize: 13.5, fontWeight: 600, color: '#14231E', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{sm.body || '📎 مرفق'}</div>
                {active?.id === sm.room_id && (
                  <button onClick={() => { setShowStarred(false); jumpTo(sm.id) }} style={{ background: 'none', border: 'none', color: '#2FA084', fontSize: 11.5, fontWeight: 800, cursor: 'pointer', padding: '4px 0 0', fontFamily: 'inherit' }}>↗️ روح للرسالة</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {contactDraft && (
        <div onClick={() => setContactDraft(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 97, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '18px 18px 0 0', padding: '16px 18px 22px' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#14231E', marginBottom: 12 }}>👤 ابعت جهة اتصال</div>
            <input value={contactDraft.name} onChange={(e) => setContactDraft({ ...contactDraft, name: e.target.value })} placeholder="الاسم"
              style={{ width: '100%', boxSizing: 'border-box', background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit', marginBottom: 8 }} />
            <input value={contactDraft.phone} onChange={(e) => setContactDraft({ ...contactDraft, phone: e.target.value })} placeholder="الرقم — 01xxxxxxxxx" inputMode="tel"
              style={{ width: '100%', boxSizing: 'border-box', background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit', marginBottom: 14, direction: 'ltr' }} />
            {members.filter((x) => !x.is_me).length > 0 && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10.5, fontWeight: 800, color: '#8A9690', marginBottom: 5 }}>أو اختار من الأعضاء</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {members.filter((x) => !x.is_me).slice(0, 8).map((mm) => (
                    <button key={mm.member_id} onClick={() => setContactDraft({ ...contactDraft, name: mm.member_name || '' })}
                      style={{ background: '#F1EEE6', border: 'none', borderRadius: 999, padding: '6px 11px', fontSize: 12, fontWeight: 700, color: '#14231E', cursor: 'pointer', fontFamily: 'inherit' }}>{mm.member_name || 'عضو'}</button>
                  ))}
                </div>
              </div>
            )}
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={sendContact} style={{ flex: 1, background: 'linear-gradient(118deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer', fontFamily: 'inherit' }}>ابعت</button>
              <button onClick={() => setContactDraft(null)} style={{ background: '#F1EEE6', color: '#5A6660', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
      {pollDraft && (
        <div onClick={() => setPollDraft(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 97, display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '18px 18px 0 0', padding: '16px 18px 22px', maxHeight: '82vh', overflowY: 'auto' }}>
            <div style={{ fontSize: 15, fontWeight: 900, color: '#14231E', marginBottom: 12 }}>📊 استبيان جديد</div>
            <input value={pollDraft.q} onChange={(e) => setPollDraft({ ...pollDraft, q: e.target.value })} placeholder="السؤال"
              style={{ width: '100%', boxSizing: 'border-box', background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '11px 14px', fontSize: 14, fontWeight: 700, color: '#14231E', outline: 'none', fontFamily: 'inherit', marginBottom: 10 }} />
            {pollDraft.opts.map((o, i) => (
              <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 7 }}>
                <input value={o} onChange={(e) => { const n = [...pollDraft.opts]; n[i] = e.target.value; setPollDraft({ ...pollDraft, opts: n }) }} placeholder={`اختيار ${i + 1}`}
                  style={{ flex: 1, minWidth: 0, background: '#F1EEE6', border: 'none', borderRadius: 12, padding: '10px 14px', fontSize: 13.5, fontWeight: 600, color: '#14231E', outline: 'none', fontFamily: 'inherit' }} />
                {pollDraft.opts.length > 2 && (
                  <button onClick={() => setPollDraft({ ...pollDraft, opts: pollDraft.opts.filter((_, j) => j !== i) })}
                    style={{ background: 'none', border: 'none', fontSize: 17, color: '#E26D5C', cursor: 'pointer' }}>×</button>
                )}
              </div>
            ))}
            {pollDraft.opts.length < 12 && (
              <button onClick={() => setPollDraft({ ...pollDraft, opts: [...pollDraft.opts, ''] })}
                style={{ background: 'none', border: 'none', color: '#2FA084', fontSize: 12.5, fontWeight: 800, cursor: 'pointer', padding: '2px 0 12px', fontFamily: 'inherit' }}>➕ ضيف اختيار</button>
            )}
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 7, fontSize: 13, fontWeight: 700, color: '#14231E', cursor: 'pointer' }}>
              <input type="checkbox" checked={pollDraft.multi} onChange={(e) => setPollDraft({ ...pollDraft, multi: e.target.checked })} />
              يقدر يختار أكتر من واحد
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, fontSize: 13, fontWeight: 700, color: '#14231E', cursor: 'pointer' }}>
              <input type="checkbox" checked={pollDraft.anon} onChange={(e) => setPollDraft({ ...pollDraft, anon: e.target.checked })} />
              سري — مايبانش مين اختار إيه
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={createPoll} disabled={busy} style={{ flex: 1, background: 'linear-gradient(118deg,#1F6F5F,#2d7a52)', color: '#fff', border: 'none', borderRadius: 999, padding: '11px 0', fontSize: 14, fontWeight: 900, cursor: 'pointer', opacity: busy ? 0.6 : 1, fontFamily: 'inherit' }}>انشر الاستبيان</button>
              <button onClick={() => setPollDraft(null)} style={{ background: '#F1EEE6', color: '#5A6660', border: 'none', borderRadius: 999, padding: '11px 18px', fontSize: 14, fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}
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
              <div
                id={`msg-${m.id}`}
                onTouchStart={() => startPress(m)} onTouchEnd={cancelPress} onTouchMove={cancelPress}
                onMouseDown={() => startPress(m)} onMouseUp={cancelPress} onMouseLeave={cancelPress}
                onContextMenu={(e) => { e.preventDefault(); setMsgMenu(m) }}
                style={{ maxWidth: '82%', background: mine ? 'linear-gradient(118deg,#1F6F5F,#2d7a52)' : (marid ? '#FFF7E0' : '#fff'), color: mine ? '#fff' : '#14231E', padding: '10px 14px', borderRadius: mine ? '18px 18px 5px 18px' : '18px 18px 18px 5px', boxShadow: mine ? '0 6px 16px -8px rgba(31,111,95,.45)' : '0 1px 2px rgba(20,35,30,.06)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 14, fontWeight: 600, lineHeight: 1.65, position: 'relative', userSelect: 'none', WebkitUserSelect: 'none', opacity: m.deleted_at ? 0.75 : 1 }}>
                {!mine && <div style={{ fontSize: 11, fontWeight: 800, color: marid ? '#B78A12' : '#2FA084', marginBottom: 2 }}>{marid ? '🧞 المارد' : (m.sender_name || 'عضو')}</div>}
                {m.pinned_at && <div style={{ fontSize: 10, fontWeight: 800, color: mine ? '#CDEFE2' : '#B78A12', marginBottom: 3 }}>📌 مثبّتة</div>}
                {m.reply_to && (() => {
                  const src = messages.find((x) => x.id === m.reply_to)
                  return (
                    <div style={{ borderInlineStart: `3px solid ${mine ? '#8FE3C8' : '#2FA084'}`, background: mine ? 'rgba(255,255,255,.14)' : '#F1EEE6', borderRadius: 8, padding: '5px 8px', marginBottom: 5, fontSize: 12, fontWeight: 600, opacity: 0.95 }}>
                      <div style={{ fontWeight: 800, fontSize: 10.5, color: mine ? '#CDEFE2' : '#1F6F5F', marginBottom: 1 }}>{src?.sender_name || 'رسالة'}</div>
                      <div style={{ maxHeight: 32, overflow: 'hidden' }}>{src ? (src.deleted_at ? 'رسالة متحذفة' : (src.body || '📎 مرفق')) : 'الرسالة الأصلية مش ظاهرة'}</div>
                    </div>
                  )
                })()}
                {m.deleted_at ? (
                  <span style={{ fontStyle: 'italic', opacity: 0.8 }}>🚫 الرسالة اتحذفت</span>
                ) : (
                <>
                {m.kind === 'location' && m.lat != null && m.lng != null && (
                  <a href={`https://maps.google.com/?q=${m.lat},${m.lng}`} target="_blank" rel="noreferrer" style={{ display: 'block', textDecoration: 'none', marginBottom: 4 }}>
                    <div style={{ borderRadius: 12, overflow: 'hidden', border: `1px solid ${mine ? 'rgba(255,255,255,.25)' : '#EAE5D9'}`, width: 210 }}>
                      <div style={{ height: 92, background: mine ? 'rgba(255,255,255,.14)' : '#EAF3EF', display: 'grid', placeItems: 'center', fontSize: 30 }}>🗺️</div>
                      <div style={{ padding: '7px 9px', background: mine ? 'rgba(255,255,255,.1)' : '#fff' }}>
                        <div style={{ fontSize: 12, fontWeight: 800, color: mine ? '#fff' : '#1F6F5F' }}>📍 موقع</div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: mine ? 'rgba(255,255,255,.75)' : '#8A9690' }}>{Number(m.lat).toFixed(4)}, {Number(m.lng).toFixed(4)} · افتح في الخرايط</div>
                      </div>
                    </div>
                  </a>
                )}
                {m.kind === 'contact' && m.payload && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 9, borderRadius: 12, padding: '8px 10px', marginBottom: 4, background: mine ? 'rgba(255,255,255,.14)' : '#F1EEE6', minWidth: 190 }}>
                    <span style={{ width: 34, height: 34, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 15, fontWeight: 800, flexShrink: 0 }}>{String(m.payload.name || 'ج').trim()[0]}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 800, color: mine ? '#fff' : '#14231E' }}>{String(m.payload.name || '')}</div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: mine ? 'rgba(255,255,255,.8)' : '#8A9690', direction: 'ltr' }}>{String(m.payload.phone || '')}</div>
                    </div>
                    <a href={`https://wa.me/${String(m.payload.phone || '').replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ fontSize: 16, textDecoration: 'none' }} title="واتساب">💬</a>
                    <a href={`tel:${String(m.payload.phone || '')}`} style={{ fontSize: 15, textDecoration: 'none' }} title="اتصال">📞</a>
                  </div>
                )}
                {m.kind === 'poll' && m.payload?.poll_id && (() => {
                  const pid = String(m.payload.poll_id)
                  const res = pollResults[pid]
                  if (!res) { void loadPoll(pid) }
                  const total = (res || []).reduce((s, o) => s + o.votes, 0)
                  return (
                    <div style={{ minWidth: 215, marginBottom: 4 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800, marginBottom: 7 }}>📊 {(m.body || '').replace(/^📊\s*/, '')}</div>
                      {!res && <div style={{ fontSize: 11.5, fontWeight: 600, opacity: 0.7 }}>بحمّل…</div>}
                      {(res || []).map((o) => {
                        const pct = total ? Math.round((o.votes / total) * 100) : 0
                        return (
                          <button key={o.idx} onClick={() => votePoll(pid, o.idx)}
                            style={{ display: 'block', width: '100%', textAlign: 'start', background: mine ? 'rgba(255,255,255,.14)' : '#F1EEE6', border: o.mine ? `1.5px solid ${mine ? '#8FE3C8' : '#2FA084'}` : '1.5px solid transparent', borderRadius: 9, padding: '6px 8px', marginBottom: 5, cursor: 'pointer', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', inset: 0, width: `${pct}%`, background: mine ? 'rgba(143,227,200,.22)' : 'rgba(47,160,132,.16)' }} />
                            <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', gap: 6, fontSize: 12.5, fontWeight: 700, color: mine ? '#fff' : '#14231E' }}>
                              <span>{o.mine ? '✓ ' : ''}{o.label}</span>
                              <span style={{ opacity: 0.85 }}>{o.votes}{total ? ` · ${pct}%` : ''}</span>
                            </div>
                            {o.voters && o.voters.length > 0 && (
                              <div style={{ position: 'relative', fontSize: 10, fontWeight: 600, opacity: 0.75, marginTop: 2, color: mine ? '#fff' : '#5A6660' }}>{o.voters.join(' · ')}</div>
                            )}
                          </button>
                        )
                      })}
                      <div style={{ fontSize: 10.5, fontWeight: 700, opacity: 0.7 }}>{total} صوت</div>
                    </div>
                  )
                })()}
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
                {!['location', 'poll', 'contact'].includes(m.kind) && m.body}
                {m.body && !['location', 'poll', 'contact'].includes(m.kind) && (
                  <button onClick={() => addTask(m)} title="حوّل الرسالة لمهمة" style={{ display: 'block', marginTop: 4, background: 'none', border: 'none', color: mine ? '#CDEFE2' : '#1F6F5F', cursor: 'pointer', fontSize: 11, padding: 0, fontWeight: 800, fontFamily: 'inherit' }}>➕ حوّل لمهمة</button>
                )}
                </>
                )}
                {m.reactions && Object.keys(m.reactions).length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                    {Object.entries(m.reactions).map(([emo, who]) => (
                      <button key={emo} onClick={() => react(m, emo)}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: mine ? 'rgba(255,255,255,.18)' : '#F1EEE6', border: (who || []).includes(uid || '') ? `1.5px solid ${mine ? '#8FE3C8' : '#2FA084'}` : '1.5px solid transparent', borderRadius: 999, padding: '2px 7px', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit', color: mine ? '#fff' : '#14231E', fontWeight: 700 }}>
                        <span>{emo}</span><span style={{ fontSize: 10.5 }}>{(who || []).length}</span>
                      </button>
                    ))}
                  </div>
                )}
                <span style={{ display: 'block', textAlign: 'left', fontSize: 9.5, fontWeight: 600, color: mine ? 'rgba(255,255,255,.65)' : '#9CA3AF', marginTop: 3 }}>
                  {starred.has(m.id) && <span title="محفوظة" style={{ marginInlineEnd: 4 }}>⭐</span>}
                  {m.edited_at && <span style={{ marginInlineEnd: 4 }}>معدّلة</span>}
                  {t(m.created_at)}
                  {mine && !m.deleted_at && (
                    <button onClick={() => openReaders(m.id)} title="مين قرأ" aria-label="مين قرأ" style={{ marginInlineStart: 6, background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: '#8FE3C8', fontSize: 10, fontFamily: 'inherit' }}>👁️</button>
                  )}
                </span>
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
          <button onClick={() => { setShowPlus(false); setContactDraft({ name: '', phone: '' }) }} style={sheetBtn}>👤<div style={sheetLbl}>جهة اتصال</div></button>
          {active.kind !== 'direct' && (
            <button onClick={() => { setShowPlus(false); setPollDraft({ q: '', opts: ['', ''], multi: false, anon: false }) }} style={sheetBtn}>📊<div style={sheetLbl}>استبيان</div></button>
          )}
        </div>
      )}

      {/* ─── الكومبوزر بهوية 4b: ➕ دايرة كريمي · بيل الكتابة مع إيموجي · مايك/إرسال متدرّج ─── */}
      {msgMenu && (() => {
        const m = msgMenu
        const mine = m.sender_id === uid
        const iAmOwner = active?.role === 'owner'
        const canDeleteAll = (mine || iAmOwner) && !m.deleted_at
        const item: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'start', padding: '12px 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 700, color: '#14231E', fontFamily: 'inherit' }
        return (
          <div onClick={() => setMsgMenu(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(20,35,30,.55)', zIndex: 95, display: 'flex', alignItems: 'flex-end' }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', width: '100%', borderRadius: '18px 18px 0 0', padding: '14px 18px 22px', maxHeight: '75vh', overflowY: 'auto' }}>
              {!m.deleted_at && (
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 4, paddingBottom: 12, marginBottom: 6, borderBottom: '1px solid #EAE5D9' }}>
                  {QUICK_REACTIONS.map((e) => (
                    <button key={e} onClick={() => react(m, e)} style={{ background: '#F1EEE6', border: 'none', borderRadius: '50%', width: 42, height: 42, fontSize: 21, cursor: 'pointer', lineHeight: 1 }}>{e}</button>
                  ))}
                </div>
              )}
              {!m.deleted_at && <button style={item} onClick={() => { setReplyTo(m); setEditing(null); setMsgMenu(null) }}>↩️ رد على الرسالة</button>}
              {mine && !m.deleted_at && m.body && m.kind === 'text' && (
                <button style={item} onClick={() => { setEditing(m); setReplyTo(null); setInput(m.body || ''); setMsgMenu(null) }}>✏️ تعديل</button>
              )}
              {!m.deleted_at && <button style={item} onClick={() => toggleStar(m)}>{starred.has(m.id) ? '☆ شيل من المحفوظات' : '⭐ احفظ الرسالة'}</button>}
              {!m.deleted_at && active?.kind !== 'direct' && <button style={item} onClick={() => togglePin(m)}>{m.pinned_at ? '📌 شيل التثبيت' : '📌 ثبّت في الجروب'}</button>}
              {!m.deleted_at && m.body && (
                <button style={item} onClick={() => { navigator.clipboard?.writeText(m.body || ''); setMsgMenu(null); setToast('اتنسخت'); setTimeout(() => setToast(''), 1500) }}>📋 نسخ</button>
              )}
              <button style={{ ...item, color: '#E26D5C' }} onClick={() => removeMsg(m, false)}>🗑️ حذف عندي بس</button>
              {canDeleteAll && <button style={{ ...item, color: '#c0392b', fontWeight: 800 }} onClick={() => removeMsg(m, true)}>🚫 حذف عند الكل</button>}
              <button style={{ ...item, textAlign: 'center', color: '#8A9690' }} onClick={() => setMsgMenu(null)}>إلغاء</button>
            </div>
          </div>
        )
      })()}
      {mentionList && mentionList.length > 0 && (
        <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', maxHeight: 190, overflowY: 'auto' }}>
          <div style={{ fontSize: 10.5, fontWeight: 800, color: '#8A9690', padding: '7px 16px 3px' }}>نده على</div>
          {mentionList.map((mm) => (
            <button key={mm.member_id} onClick={() => pickMention(mm)} style={{ display: 'flex', width: '100%', alignItems: 'center', gap: 10, background: 'none', border: 'none', padding: '9px 16px', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit' }}>
              <span style={{ width: 30, height: 30, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#1F6F5F)', color: '#fff', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, flexShrink: 0 }}>{(mm.member_name || 'ع').trim()[0]}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: '#14231E' }}>{mm.member_name || 'عضو'}</span>
            </button>
          ))}
        </div>
      )}
      {(replyTo || editing) && (
        <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', padding: '8px 14px 0', display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, borderInlineStart: '3px solid #2FA084', background: '#F1EEE6', borderRadius: 8, padding: '6px 9px', minWidth: 0 }}>
            <div style={{ fontSize: 10.5, fontWeight: 800, color: '#1F6F5F' }}>{editing ? '✏️ بتعدّل' : `↩️ رد على ${replyTo?.sender_name || 'رسالة'}`}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#5A6660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{(editing || replyTo)?.body || '📎 مرفق'}</div>
          </div>
          <button onClick={() => { setReplyTo(null); if (editing) { setEditing(null); setInput('') } }} style={{ background: 'none', border: 'none', fontSize: 18, color: '#8A9690', cursor: 'pointer' }}>×</button>
        </div>
      )}
      {Object.keys(typing).length > 0 && (
        <div style={{ background: '#fff', padding: '4px 16px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ display: 'inline-flex', gap: 3 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{ width: 5, height: 5, borderRadius: '50%', background: '#2FA084', display: 'inline-block', animation: `mdTypingDot 1.2s ${i * 0.18}s infinite ease-in-out` }} />
            ))}
          </span>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: '#5A6660' }}>
            {Object.values(typing).length === 1
              ? `${Object.values(typing)[0]} بيكتب…`
              : `${Object.values(typing).slice(0, 2).join(' و')} بيكتبوا…`}
          </span>
          <style>{'@keyframes mdTypingDot{0%,60%,100%{opacity:.25;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'}</style>
        </div>
      )}
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
            onChange={(e) => onInputChange(e.target.value)}
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
