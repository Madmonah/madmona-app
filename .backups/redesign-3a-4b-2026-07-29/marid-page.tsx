'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import { subscribeToPush, getNotificationPermission, isPushSupported } from '@/lib/push-subscription'

// ── شات المارد — نسخة مطوّرة: تصميم مضمونة الأصلي + مميزات (رد/تفاعل/تعديل/حذف) ──
// الهوية البصرية: كريم #FAFAF7، أخضر مضمونة #1F6F5F/#2FA084، تدرّج ذهبي→أخضر،
// خط Cairo. مش واتساب (أخضر غامق) ولا تليجرام (أزرق) — هوية مضمونة نفسها، أنضف من الاتنين.

type Attach = { type: 'image' | 'audio' | 'video' | 'document'; mimetype: string; data_base64: string; filename?: string; previewUrl?: string }
type Msg = {
  id: string
  role: 'user' | 'bot' | 'sys'
  text: string
  time: string
  media?: Attach
  status?: 'sent' | 'delivered' | 'read'
  replyToId?: string        // رد على رسالة معيّنة
  reactions?: string[]      // تفاعلات (إيموجي)
  edited?: boolean          // اتعدّلت؟
  deleted?: boolean         // اتحذفت؟
  pinned?: boolean          // مثبّتة؟
  forwarded?: boolean       // متحوّلة (forward)؟
}

// كشف أول لينك في النص لعمل بطاقة معاينة بسيطة (اسم الدومين + رابط قابل للفتح)
function firstUrl(text: string): string | null {
  const m = (text || '').match(/(https?:\/\/[^\s]+)/)
  return m ? m[1] : null
}
function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

const EMOJIS = ['😀','😂','🥰','😍','👍','🙏','🔥','🎉','❤️','😅','😊','🤝','👌','💪','🙌','😎','🤔','😢','😮','🥳','😉','🫡','💯','✅','⭐','🎁','📦','🚗','🏠','🍔','☕','💰','📞','✍️','👏','😇','🤩','🌹','🙈','🤗']
const REACTS = ['❤️','👍','😂','😮','🙏','🔥']   // تفاعلات سريعة زي تليجرام/واتساب
const QUICKS = ['عايز أشوف العروض 🛍️', 'احجزلي ميعاد 🗓️', 'كلمني عن العقارات 🏠', 'عايز أضيف إعلان ➕']

// معرّف بسيط للرسائل المحلية (الرسائل الجاية من السيرفر ليها id حقيقي)
function mkId() { return 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36) }
function nowTime() { return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }

// علامة تسليم آخر رسالة للمستخدم: ✓ اتبعت · ✓✓ وصلت · ✓✓ أزرق = المارد قرأ ورد
function markLastUser(msgs: Msg[], status: Msg['status']): Msg[] {
  for (let i = msgs.length - 1; i >= 0; i--) {
    if (msgs[i].role === 'user') {
      const copy = msgs.slice()
      copy[i] = { ...copy[i], status }
      return copy
    }
  }
  return msgs
}
function normEg(raw: string) {
  let d = (raw || '').replace(/\D/g, '')
  if (d.startsWith('0') && d.length === 11) d = '20' + d.slice(1)
  if (d.length === 10) d = '20' + d
  return d
}
function linkify(text: string): React.ReactNode[] {
  return (text || '').split(/(https?:\/\/[^\s]+)/g).map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: '#1F6F5F', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}>{p}</a>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}
// اقتطاف مختصر لعرضه في فقاعة الرد (الاقتباس)
function snippet(m: Msg | undefined): string {
  if (!m) return ''
  if (m.deleted) return 'رسالة محذوفة'
  if (m.media && !m.text) return m.media.type === 'image' ? '📷 صورة' : m.media.type === 'audio' ? '🎤 رسالة صوتية' : '📎 ملف'
  return (m.text || '').slice(0, 60)
}

export default function ChatPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [pendingQ, setPendingQ] = useState<string | null>(null)   // سؤال جاي من هوم «اسأل المارد» (?q=)
  const [attach, setAttach] = useState<Attach | null>(null)
  const [sending, setSending] = useState(false)
  const [recording, setRecording] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [showPlus, setShowPlus] = useState(false)
  const [maridOn] = useState(true)
  const [installEvt, setInstallEvt] = useState<BIPEvent | null>(null)
  const [iosHint, setIosHint] = useState(false)
  const [installDismissed, setInstallDismissed] = useState(false)
  const [notifState, setNotifState] = useState<'unsupported' | 'default' | 'granted' | 'denied'>('default')
  // ── حالة المميزات الجديدة ──
  const [replyTo, setReplyTo] = useState<Msg | null>(null)     // بنرد على أنهي رسالة
  const [menuFor, setMenuFor] = useState<string | null>(null)  // قايمة الأكشنز مفتوحة لأنهي رسالة
  const [editingId, setEditingId] = useState<string | null>(null) // بنعدّل أنهي رسالة
  const [search, setSearch] = useState('')                     // نص البحث
  const [showSearch, setShowSearch] = useState(false)          // شريط البحث ظاهر؟
  const [forwardMsg, setForwardMsg] = useState<Msg | null>(null) // رسالة بنحوّلها (forward)
  const [showPinned, setShowPinned] = useState(false)          // لوحة المثبّتة مفتوحة؟
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  const welcome = useCallback((nm: string) => {
    setMessages([{ id: mkId(), role: 'sys', text: `أهلاً${nm ? ' يا ' + nm : ''} 👋 أنا المارد، مساعدك الشخصي على مضمونة — اسألني في أي حاجة.`, time: nowTime() }])
  }, [])

  async function loadHistory(token: string): Promise<Msg[]> {
    try {
      const res = await fetch('/api/chat', { headers: { Authorization: `Bearer ${token}` } })
      const data = await res.json()
      if (!data?.ok || !Array.isArray(data.messages)) return []
      type HistRow = { id?: string; direction: string; message_type: string; text: string; media_url: string | null; created_at: string }
      return (data.messages as HistRow[]).map((m): Msg => {
        const role: Msg['role'] = m.direction === 'inbound' ? 'user' : 'bot'
        let media: Attach | undefined
        let text = m.text || ''
        if (m.message_type === 'image' && m.media_url) {
          media = { type: 'image', mimetype: 'image/jpeg', data_base64: '', previewUrl: m.media_url }
        } else if (m.media_url) {
          text = (text ? text + '\n' : '') + m.media_url
        }
        const time = (() => { try { return new Date(m.created_at).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return nowTime() } })()
        return { id: m.id || mkId(), role, text, time, media, status: role === 'user' ? ('read' as const) : undefined }
      })
    } catch { return [] }
  }

  useEffect(() => {
    ;(async () => {
      try {
        const { data: { session } } = await supabaseBrowser.auth.getSession()
        if (session?.user) {
          const { data: prof } = await supabaseBrowser.from('profiles').select('phone, full_name').eq('id', session.user.id).maybeSingle()
          const p = normEg((prof as { phone?: string } | null)?.phone || session.user.phone || '')
          const nm = ((prof as { full_name?: string } | null)?.full_name || '').trim()
          if (p && p.length >= 11) {
            setPhone(p); setName(nm); setStarted(true)
            const hist = await loadHistory(session.access_token)
            if (hist.length) setMessages(hist)
            else welcome(nm)
          }
        }
      } catch {}
      setAuthChecked(true)
    })()
  }, [welcome])

  // اسأل المارد من الهوم: اقرا ?q= وابعته أوتوماتيك أول ما الشات يجهز
  useEffect(() => {
    try { const qp = new URLSearchParams(window.location.search).get('q'); if (qp) setPendingQ(qp) } catch {}
  }, [])
  useEffect(() => {
    if (!authChecked || !started || !pendingQ) return
    const t = pendingQ
    setPendingQ(null)
    const id = setTimeout(() => { try { submit(t, null, maridOn) } catch {} }, 350)
    return () => clearTimeout(id)
  }, [authChecked, started, pendingQ])

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, sending])

  useEffect(() => {
    const standalone = window.matchMedia?.('(display-mode: standalone)')?.matches
      || (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return
    const onBip = (e: Event) => { e.preventDefault(); setInstallEvt(e as BIPEvent) }
    const onInstalled = () => { setInstallEvt(null); setIosHint(false) }
    window.addEventListener('beforeinstallprompt', onBip)
    window.addEventListener('appinstalled', onInstalled)
    const ua = navigator.userAgent || ''
    const isIOS = /iphone|ipad|ipod/i.test(ua)
    const isSafari = /^((?!chrome|android|crios|fxios).)*safari/i.test(ua)
    if (isIOS && isSafari) setIosHint(true)
    return () => {
      window.removeEventListener('beforeinstallprompt', onBip)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function installApp() {
    if (!installEvt) return
    try { await installEvt.prompt(); await installEvt.userChoice } catch {}
    setInstallEvt(null)
  }

  useEffect(() => {
    if (!isPushSupported()) { setNotifState('unsupported'); return }
    const p = getNotificationPermission()
    setNotifState(p === 'unsupported' ? 'unsupported' : p)
  }, [])

  async function enableNotifs() {
    const r = await subscribeToPush()
    if (r.ok) {
      setNotifState('granted')
      setMessages((m) => [...m, { id: mkId(), role: 'sys', text: '🔔 تمام — هنبعتلك تنبيه لو المارد رد وانت مش فاتح الشات.', time: nowTime() }])
    } else {
      setMessages((m) => [...m, { id: mkId(), role: 'sys', text: r.error || 'مش قادر أفعّل التنبيهات دلوقتي.', time: nowTime() }])
      if (getNotificationPermission() === 'denied') setNotifState('denied')
    }
  }

  const askedNotifRef = useRef(false)
  async function maybeAutoEnableNotifs() {
    if (askedNotifRef.current) return
    if (!isPushSupported()) return
    const perm = getNotificationPermission()
    if (perm !== 'default') return
    askedNotifRef.current = true
    try { await subscribeToPush().then((r) => { if (r.ok) setNotifState('granted') }) } catch {}
  }

  function start() { if (normEg(phone).length < 11) return; setStarted(true); welcome(name.trim()) }

  async function submit(text: string, media: Attach | null, summonNow: boolean, replyToId?: string) {
    if ((!text && !media) || sending) return
    void maybeAutoEnableNotifs()
    const myId = mkId()
    setMessages((m) => [...m, { id: myId, role: 'user', text, time: nowTime(), media: media || undefined, status: 'sent', replyToId }])
    setReplyTo(null)
    if (summonNow) setSending(true)
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, name, message: text, summon: summonNow, media: media ? { type: media.type, mimetype: media.mimetype, data_base64: media.data_base64, filename: media.filename } : undefined }),
      })
      const data = await res.json()
      if (data?.ok) {
        setMessages((m) => markLastUser(m, data.reply ? 'read' : 'delivered'))
        if (data.reply) setMessages((m) => [...m, { id: mkId(), role: 'bot', text: data.reply, time: nowTime() }])
      } else {
        setMessages((m) => [...m, { id: mkId(), role: 'sys', text: data?.error || 'حصل خطأ مؤقت، جرّب تاني.', time: nowTime() }])
      }
    } catch {
      setMessages((m) => [...m, { id: mkId(), role: 'sys', text: 'مش قادر أوصل للسيرفر دلوقتي، جرّب تاني.', time: nowTime() }])
    } finally {
      setSending(false)
    }
  }

  function send() {
    const t = input.trim(); const m = attach
    if (!t && !m) return
    // وضع التعديل: بنعدّل رسالة موجودة بدل ما نبعت جديدة
    if (editingId) {
      setMessages((ms) => ms.map((x) => x.id === editingId ? { ...x, text: t, edited: true } : x))
      setEditingId(null); setInput(''); setShowEmoji(false); setShowPlus(false)
      return
    }
    const rid = replyTo?.id
    setInput(''); setAttach(null); setShowEmoji(false); setShowPlus(false)
    submit(t, m, maridOn, rid)
  }
  function sendQuick(t: string) { submit(t, null, maridOn) }
  function sendLocation() {
    setShowPlus(false)
    if (!navigator.geolocation) { alert('الموقع مش متاح في المتصفح ده'); return }
    navigator.geolocation.getCurrentPosition(
      (pos) => submit(`📍 موقعي: https://maps.google.com/?q=${pos.coords.latitude.toFixed(6)},${pos.coords.longitude.toFixed(6)}`, null, maridOn),
      () => alert('مش قادر أجيب موقعك — اسمح للمتصفح بالوصول للموقع')
    )
  }
  function onCal(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value; e.target.value = ''; setShowPlus(false)
    if (!v) return
    submit(`🗓️ أنا متاح: ${new Date(v).toLocaleString('ar-EG', { dateStyle: 'full', timeStyle: 'short' })}`, null, maridOn)
  }

  // ── أكشنز المميزات الجديدة ──
  function toggleReaction(id: string, emoji: string) {
    setMessages((ms) => ms.map((m) => {
      if (m.id !== id) return m
      const cur = m.reactions || []
      const has = cur.includes(emoji)
      return { ...m, reactions: has ? cur.filter((e) => e !== emoji) : [...cur, emoji] }
    }))
    setMenuFor(null)
  }
  function startEdit(m: Msg) {
    setEditingId(m.id); setInput(m.text); setReplyTo(null); setMenuFor(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  function deleteMsg(id: string) {
    setMessages((ms) => ms.map((m) => m.id === id ? { ...m, deleted: true, text: '', media: undefined, reactions: [] } : m))
    setMenuFor(null)
  }
  function copyMsg(m: Msg) {
    try { navigator.clipboard?.writeText(m.text || '') } catch {}
    setMenuFor(null)
  }
  function beginReply(m: Msg) {
    setReplyTo(m); setMenuFor(null); setEditingId(null)
    setTimeout(() => inputRef.current?.focus(), 50)
  }
  function togglePin(id: string) {
    setMessages((ms) => ms.map((m) => m.id === id ? { ...m, pinned: !m.pinned } : m))
    setMenuFor(null)
  }
  // تحويل رسالة: بنبعتها من جديد كرسالة من المستخدم مع علامة «محوّلة»
  function doForward(m: Msg) {
    const fwdText = m.text || ''
    setMessages((ms) => [...ms, { id: mkId(), role: 'user', text: fwdText, time: nowTime(), status: 'sent', media: m.media, forwarded: true }])
    setForwardMsg(null); setMenuFor(null)
  }

  function compressImage(file: File): Promise<Attach> {
    return new Promise((resolve) => {
      const img = new Image(); const url = URL.createObjectURL(file)
      img.onload = () => {
        const scale = Math.min(1, 1280 / img.width)
        const c = document.createElement('canvas')
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
        c.getContext('2d')!.drawImage(img, 0, 0, c.width, c.height)
        const dataUrl = c.toDataURL('image/jpeg', 0.7); URL.revokeObjectURL(url)
        resolve({ type: 'image', mimetype: 'image/jpeg', data_base64: dataUrl.split(',')[1], filename: file.name, previewUrl: dataUrl })
      }
      img.src = url
    })
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return; e.target.value = ''; setShowPlus(false)
    if (file.size > 30 * 1024 * 1024) { alert('الملف كبير أوي (أقصى ٣٠ ميجا)'); return }
    if (file.type.startsWith('image/')) { setAttach(await compressImage(file)); return }
    const b64: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(file) })
    const type = file.type.startsWith('video/') ? 'video' : file.type.startsWith('audio/') ? 'audio' : 'document'
    setAttach({ type, mimetype: file.type || 'application/octet-stream', data_base64: b64, filename: file.name })
  }
  async function toggleRec() {
    if (recording) { recRef.current?.stop(); return }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mr = new MediaRecorder(stream); chunksRef.current = []
      mr.ondataavailable = (ev) => chunksRef.current.push(ev.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        const b64: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(blob) })
        setAttach({ type: 'audio', mimetype: 'audio/webm', data_base64: b64, filename: 'voice.webm' }); setRecording(false)
      }
      recRef.current = mr; mr.start(); setRecording(true)
    } catch { alert('مش قادر أوصل للمايك') }
  }

  if (!authChecked) return <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#1F6F5F,#2FA084)', color: '#fff', fontFamily: 'system-ui' }}>لحظة…</div>

  if (!started) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#1F6F5F 0%,#2FA084 100%)', padding: 16, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');"}</style>
        <div style={{ background: '#FAFAF7', borderRadius: 22, padding: 30, width: '100%', maxWidth: 380, boxShadow: '0 18px 50px rgba(0,0,0,.28)' }}>
          <div style={{ width: 84, height: 84, margin: '0 auto 12px', borderRadius: '50%', background: 'linear-gradient(135deg,#F4C430,#2FA084)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 22px rgba(47,160,132,.35)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_72,h_72/madmona/mascots/genie.png" alt="المارد" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 23, fontWeight: 800, color: '#1F6F5F' }}>شات مضمونة</h1>
          <p style={{ textAlign: 'center', margin: '0 0 22px', color: '#667', fontSize: 14 }}>كلّم المارد مباشرة — مساعدك الشخصي ٢٤/٧</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" style={inp} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم موبايلك" inputMode="tel" style={inp} onKeyDown={(e) => e.key === 'Enter' && start()} />
          <button onClick={start} style={{ ...btnPrimary, width: '100%', marginTop: 6 }}>ابدأ المحادثة</button>
        </div>
      </div>
    )
  }

  const hasText = input.trim().length > 0 || !!attach
  const q = search.trim().toLowerCase()
  const visible = q ? messages.filter((m) => (m.text || '').toLowerCase().includes(q)) : messages
  const pinnedList = messages.filter((m) => m.pinned && !m.deleted)

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#FAFAF7', fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');"}</style>

      <header style={{ background: 'linear-gradient(135deg,#1F6F5F 0%,#2FA084 100%)', color: '#fff', padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, boxShadow: '0 2px 14px rgba(31,111,95,.25)', zIndex: 5 }}>
        <Link href="/chat" aria-label="رجوع" style={{ color: '#fff', textDecoration: 'none', fontSize: 24, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>→</Link>
        <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'linear-gradient(135deg,#F4C430,#6FCF97)', padding: 2, flexShrink: 0 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_120,h_120/madmona/mascots/genie.png" alt="المارد" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>المارد 🧞</div>
          <div style={{ fontSize: 12, opacity: .9 }}>{sending ? 'بيكتب…' : 'مساعدك الشخصي · حاضر'}</div>
        </div>
        <button onClick={() => { setShowSearch((v) => !v); setSearch('') }} title="بحث" aria-label="بحث" style={hdrBtn}>🔍</button>
        {notifState === 'default' && (
          <button onClick={enableNotifs} title="فعّل التنبيهات" aria-label="فعّل التنبيهات" style={hdrBtn}>🔔</button>
        )}
      </header>

      {showSearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid #eee' }}>
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="دوّر في المحادثة…" style={{ flex: 1, border: '1px solid #e3e3e3', borderRadius: 20, padding: '8px 14px', fontSize: 14, outline: 'none', fontFamily: 'inherit' }} />
          {q && <span style={{ fontSize: 12, color: '#8a8a8a', whiteSpace: 'nowrap' }}>{visible.length} نتيجة</span>}
        </div>
      )}

      {/* شريط الرسائل المثبّتة (زي تليجرام) */}
      {pinnedList.length > 0 && (
        <div style={{ background: '#F0F8F5', borderBottom: '1px solid #d9ede5' }}>
          <button onClick={() => setShowPinned((v) => !v)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'start' }}>
            <span style={{ fontSize: 15 }}>📌</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#1F6F5F' }}>رسائل مثبّتة ({pinnedList.length})</div>
              <div style={{ fontSize: 12.5, color: '#4a6a60', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(pinnedList[pinnedList.length - 1])}</div>
            </div>
            <span style={{ fontSize: 12, color: '#2FA084' }}>{showPinned ? '▲' : '▼'}</span>
          </button>
          {showPinned && (
            <div style={{ maxHeight: 180, overflowY: 'auto', borderTop: '1px solid #e3f0ea' }}>
              {pinnedList.map((pm) => (
                <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #eef6f2', fontSize: 13 }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: pm.role === 'user' ? '#2FA084' : '#1F6F5F', flexShrink: 0 }}>{pm.role === 'user' ? 'أنت' : 'المارد'}</span>
                  <span style={{ flex: 1, minWidth: 0, color: '#4a6a60', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(pm)}</span>
                  <button onClick={() => togglePin(pm.id)} title="إلغاء التثبيت" style={{ border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {(installEvt || iosHint) && !installDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FFF7E0', borderBottom: '1px solid #f0e2b8', fontSize: 13, color: '#8a6d1a' }}>
          <span style={{ fontSize: 18 }}>📲</span>
          {installEvt ? (
            <>
              <span style={{ flex: 1 }}>ثبّت شات مضمونة على تليفونك — أيقونة مستقلة، رد فوري بضغطة.</span>
              <button onClick={installApp} style={{ background: '#1F6F5F', color: '#fff', border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>ثبّت</button>
            </>
          ) : (
            <span style={{ flex: 1 }}>عايز الشات كأيقونة؟ اضغط زر المشاركة ⬆️ في سفاري واختار «إضافة إلى الشاشة الرئيسية».</span>
          )}
          <button onClick={() => setInstallDismissed(true)} aria-label="إغلاق" style={{ border: 'none', background: 'none', color: '#8a6d1a', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      <div ref={scrollRef} onClick={() => setMenuFor(null)} style={{ flex: 1, overflowY: 'auto', padding: '14px 10px', background: 'radial-gradient(circle at 20% 10%, #f2efe6 0, #FAFAF7 60%)' }}>
        {visible.map((m) => {
          if (m.role === 'sys') return (
            <div key={m.id} style={{ textAlign: 'center', margin: '10px 0' }}>
              <span style={{ background: '#E6F0EC', color: '#1F6F5F', fontSize: 12, padding: '5px 12px', borderRadius: 12, display: 'inline-block', maxWidth: '85%' }}>{m.text}</span>
            </div>
          )
          const mine = m.role === 'user'
          const parent = m.replyToId ? messages.find((x) => x.id === m.replyToId) : undefined
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: m.reactions?.length ? 16 : 8, position: 'relative' }}>
              <div style={{ position: 'relative', maxWidth: '82%' }}>
                <div
                  onClick={(e) => { e.stopPropagation(); if (!m.deleted) setMenuFor(menuFor === m.id ? null : m.id) }}
                  style={{ background: m.deleted ? '#f0efe9' : mine ? 'linear-gradient(135deg,#DFF3E4,#CFEeDA)' : '#fff', padding: '9px 13px', borderRadius: 16, borderTopRightRadius: mine ? 16 : 4, borderTopLeftRadius: mine ? 4 : 16, boxShadow: '0 1px 5px rgba(0,0,0,.08)', whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 15, lineHeight: 1.65, cursor: m.deleted ? 'default' : 'pointer', border: menuFor === m.id ? '1.5px solid #2FA084' : '1.5px solid transparent' }}
                >
                  {parent && (
                    <div style={{ borderInlineStart: '3px solid #2FA084', background: 'rgba(47,160,132,.08)', borderRadius: 6, padding: '4px 8px', marginBottom: 6, fontSize: 12.5, color: '#4a6a60' }}>
                      <div style={{ fontWeight: 700, color: '#1F6F5F', fontSize: 11 }}>{parent.role === 'user' ? 'أنت' : 'المارد'}</div>
                      <div style={{ opacity: .85, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(parent)}</div>
                    </div>
                  )}
                  {m.deleted ? (
                    <span style={{ fontStyle: 'italic', color: '#999' }}>🚫 اتحذفت الرسالة دي</span>
                  ) : (
                    <>
                      {m.forwarded && <div style={{ fontSize: 11, color: '#2FA084', fontWeight: 700, marginBottom: 3, fontStyle: 'italic' }}>↗️ رسالة محوّلة</div>}
                      {m.media?.type === 'image' && m.media.previewUrl && <img src={m.media.previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: 8, marginBottom: m.text ? 6 : 0 }} />}
                      {m.media?.type === 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>🎤 رسالة صوتية</div>}
                      {m.media && m.media.type !== 'image' && m.media.type !== 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>📎 {m.media.filename || m.media.type}</div>}
                      {linkify(m.text)}
                      {firstUrl(m.text) && (
                        <a href={firstUrl(m.text)!} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 6, textDecoration: 'none', border: '1px solid #e2e8e4', borderRadius: 10, overflow: 'hidden', background: '#F7FBF9' }}>
                          <div style={{ padding: '8px 10px', borderInlineStart: '3px solid #2FA084' }}>
                            <div style={{ fontSize: 11, color: '#2FA084', fontWeight: 700 }}>🔗 {domainOf(firstUrl(m.text)!)}</div>
                            <div style={{ fontSize: 12.5, color: '#1F6F5F', fontWeight: 600, wordBreak: 'break-all', marginTop: 1 }}>{firstUrl(m.text)!.slice(0, 70)}</div>
                          </div>
                        </a>
                      )}
                      <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: '#8a8a8a', marginTop: 2 }}>
                        {m.edited && <span style={{ marginInlineEnd: 4, fontStyle: 'italic' }}>معدّلة</span>}
                        {m.time}
                        {mine && m.status && (
                          <span style={{ marginInlineStart: 4, fontWeight: 700, color: m.status === 'read' ? '#2FA084' : '#8a8a8a' }}>{m.status === 'sent' ? '✓' : '✓✓'}</span>
                        )}
                      </span>
                    </>
                  )}
                </div>

                {/* تفاعلات معروضة تحت الفقاعة */}
                {m.reactions && m.reactions.length > 0 && (
                  <div style={{ position: 'absolute', bottom: -12, insetInlineEnd: mine ? 'auto' : 8, insetInlineStart: mine ? 8 : 'auto', display: 'flex', gap: 2, background: '#fff', borderRadius: 12, padding: '1px 6px', boxShadow: '0 2px 6px rgba(0,0,0,.15)', fontSize: 13, border: '1px solid #eee' }}>
                    {m.reactions.map((e, ix) => <span key={ix}>{e}</span>)}
                  </div>
                )}

                {/* شريط التفاعل السريع (بيظهر فوق الرسالة لما تفتح القايمة) */}
                {menuFor === m.id && !m.deleted && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 'calc(100% + 6px)', insetInlineEnd: mine ? 'auto' : 0, insetInlineStart: mine ? 0 : 'auto', display: 'flex', gap: 4, background: '#fff', borderRadius: 22, padding: '6px 10px', boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 20 }}>
                    {REACTS.map((e) => (
                      <button key={e} onClick={() => toggleReaction(m.id, e)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', padding: 2, transition: 'transform .1s' }} onMouseDown={(ev) => ((ev.currentTarget as HTMLButtonElement).style.transform = 'scale(1.3)')} onMouseUp={(ev) => ((ev.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}>{e}</button>
                    ))}
                  </div>
                )}

                {/* قايمة الأكشنز */}
                {menuFor === m.id && !m.deleted && (
                  <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', insetInlineEnd: mine ? 'auto' : 0, insetInlineStart: mine ? 0 : 'auto', background: '#fff', borderRadius: 12, boxShadow: '0 6px 20px rgba(0,0,0,.2)', overflow: 'hidden', zIndex: 20, minWidth: 150 }}>
                    <button onClick={() => beginReply(m)} style={menuItem}>↩️ رد</button>
                    <button onClick={() => setForwardMsg(m)} style={menuItem}>↗️ تحويل</button>
                    <button onClick={() => togglePin(m.id)} style={menuItem}>{m.pinned ? '📌 إلغاء التثبيت' : '📌 تثبيت'}</button>
                    {m.text && <button onClick={() => copyMsg(m)} style={menuItem}>📋 نسخ</button>}
                    {mine && m.text && <button onClick={() => startEdit(m)} style={menuItem}>✏️ تعديل</button>}
                    {mine && <button onClick={() => deleteMsg(m.id)} style={{ ...menuItem, color: '#c0392b' }}>🗑️ حذف</button>}
                  </div>
                )}
              </div>
            </div>
          )
        })}
        {sending && <div style={{ textAlign: 'end', color: '#667', fontSize: 13, padding: '2px 8px' }}>المارد بيكتب…</div>}
        {maridOn && !sending && !q && messages[messages.length - 1]?.role === 'bot' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            {QUICKS.map((qq) => (
              <button key={qq} onClick={() => sendQuick(qq)} style={{ background: '#fff', border: '1px solid #2FA084', color: '#1F6F5F', borderRadius: 16, padding: '6px 12px', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{qq}</button>
            ))}
          </div>
        )}
      </div>

      {showEmoji && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: '#fff', borderTop: '1px solid #eee', maxHeight: 160, overflowY: 'auto' }}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setInput((v) => v + e)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 3 }}>{e}</button>
          ))}
        </div>
      )}

      {showPlus && (
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#fff', borderTop: '1px solid #eee' }}>
          <button onClick={() => fileRef.current?.click()} style={sheetBtn}>🖼️<div style={sheetLbl}>صورة/ملف</div></button>
          <button onClick={sendLocation} style={sheetBtn}>📍<div style={sheetLbl}>موقعي</div></button>
          <button onClick={() => { const el = calRef.current; if (el) { try { el.showPicker() } catch { el.click() } } }} style={sheetBtn}>🗓️<div style={sheetLbl}>ميعاد</div></button>
        </div>
      )}

      {/* شريط الرد/التعديل فوق خانة الكتابة */}
      {(replyTo || editingId) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#EAF5F0', borderTop: '1px solid #d4e9e1', borderInlineStart: '3px solid #2FA084' }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#1F6F5F' }}>{editingId ? '✏️ تعديل الرسالة' : `↩️ رد على ${replyTo?.role === 'user' ? 'نفسك' : 'المارد'}`}</div>
            <div style={{ fontSize: 13, color: '#4a6a60', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingId ? (messages.find((x) => x.id === editingId)?.text || '') : snippet(replyTo || undefined)}</div>
          </div>
          <button onClick={() => { setReplyTo(null); setEditingId(null); if (editingId) setInput('') }} aria-label="إلغاء" style={{ border: 'none', background: 'none', color: '#1F6F5F', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {attach && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#EAF5F0', fontSize: 13 }}>
          <span>{attach.type === 'image' ? '🖼️ صورة جاهزة' : attach.type === 'audio' ? '🎤 صوت جاهز' : '📎 ' + (attach.filename || 'ملف')}</span>
          <button onClick={() => setAttach(null)} style={{ marginInlineStart: 'auto', border: 'none', background: 'none', color: '#c00', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      <div style={{ display: 'flex', gap: 6, padding: 10, background: '#fff', borderTop: '1px solid #eee', boxShadow: '0 -2px 12px rgba(0,0,0,.04)', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />
        <input ref={calRef} type="datetime-local" onChange={onCal} style={{ display: 'none' }} />
        <button onClick={() => { setShowPlus((v) => !v); setShowEmoji(false) }} title="إرفاق" style={{ ...iconBtn, transform: showPlus ? 'rotate(45deg)' : 'none' }}>➕</button>
        <button onClick={() => { setShowEmoji((v) => !v); setShowPlus(false) }} title="إيموجي" style={iconBtn}>😊</button>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} onFocus={() => { setShowEmoji(false); setShowPlus(false) }} placeholder={recording ? 'بسجّل…' : editingId ? 'عدّل رسالتك…' : 'اكتب رسالة'} style={{ ...inp, margin: 0, flex: 1 }} />
        {hasText ? (
          <button onClick={send} disabled={sending} style={{ ...btnPrimary, width: 48, height: 48, padding: 0, borderRadius: '50%', opacity: sending ? .6 : 1 }}>{editingId ? '✓' : '➤'}</button>
        ) : (
          <button onClick={toggleRec} title="تسجيل صوت" style={{ ...btnPrimary, width: 48, height: 48, padding: 0, borderRadius: '50%', background: recording ? '#c0392b' : undefined }}>{recording ? '⏹️' : '🎤'}</button>
        )}
      </div>
      {/* نافذة تأكيد التحويل (forward) */}
      {forwardMsg && (
        <div onClick={() => setForwardMsg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 340, boxShadow: '0 18px 50px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1F6F5F', marginBottom: 10 }}>↗️ تحويل الرسالة</div>
            <div style={{ background: '#F7FBF9', border: '1px solid #e2e8e4', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: '#4a6a60', maxHeight: 120, overflowY: 'auto', marginBottom: 16 }}>{snippet(forwardMsg) || '📎 ملف'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setForwardMsg(null)} style={{ flex: 1, background: '#f0f0f0', color: '#555', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
              <button onClick={() => doForward(forwardMsg)} style={{ flex: 1, background: 'linear-gradient(135deg,#2FA084,#1F6F5F)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>حوّل هنا</button>
            </div>
          </div>
        </div>
      )}

      <ChatBottomNav />
    </div>
  )
}

const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 16px', margin: '0 0 12px', border: '1px solid #e3e3e3', borderRadius: 24, fontSize: 15, outline: 'none', background: '#fff', fontFamily: 'inherit' }
const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg,#F4C430 0%,#2FA084 55%,#1F6F5F 100%)', color: '#fff', border: 'none', borderRadius: 24, height: 48, fontSize: 18, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(31,111,95,.32)', fontFamily: 'inherit' }
const iconBtn: React.CSSProperties = { border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1, transition: 'transform .15s' }
const sheetBtn: React.CSSProperties = { border: '1px solid #eee', background: '#FAFAF7', borderRadius: 12, padding: '10px 16px', fontSize: 26, cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 2 }
const sheetLbl: React.CSSProperties = { fontSize: 12, color: '#555' }
const hdrBtn: React.CSSProperties = { background: 'rgba(255,255,255,.16)', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, fontSize: 15, cursor: 'pointer', flexShrink: 0 }
const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'start', background: 'none', border: 'none', padding: '10px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#222', borderBottom: '1px solid #f4f4f4' }
