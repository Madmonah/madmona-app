'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import { subscribeToPush, getNotificationPermission, isPushSupported } from '@/lib/push-subscription'

// ═══════════════════════════════════════════════════════════════════════
//  شات مضمونة — المارد · نسخة مطوّرة (٢٧ يوليو ٢٠٢٦)
//  تصميم أصلي (مش نسخة واتساب ولا تليجرام) بهوية مضمونة: كريم/أخضر/ذهبي.
//  مميزات: رد على رسالة · تفاعلات · تعديل · حذف · (قادم: تثبيت/تحويل/بحث)
// ═══════════════════════════════════════════════════════════════════════

// ── هوية مضمونة اللونية ─────────────────────────────────────────────────
const C = {
  cream: '#FAFAF7',
  green: '#1F6F5F',
  greenDk: '#175449',
  greenLt: '#2FA084',
  mint: '#6FCF97',
  gold: '#E4B95B',
  ink: '#14201d',
  sub: '#6b7d78',
  line: 'rgba(31,111,95,.10)',
  bubbleMe: '#DCF0E8',   // فقاعة المستخدم — منت فاتح
  bubbleBot: '#FFFFFF',  // فقاعة المارد — أبيض ناصع
  bg: 'linear-gradient(170deg,#F3F6F2 0%,#E9F1EC 55%,#E3EEE8 100%)',
}
const MARID_AVATAR = 'https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_120,h_120/madmona/mascots/genie.png'

const EMOJIS = ['😀','😂','🥰','😍','👍','🙏','🔥','🎉','❤️','😅','😊','🤝','👌','💪','🙌','😎','🤔','😢','😮','🥳','😉','🫡','💯','✅','⭐','🎁','📦','🚗','🏠','🍔','☕','💰','📞','✍️','👏','😇','🤩','🌹','🙈','🤗']
const QUICKS = ['عايز أشوف العروض 🛍️', 'احجزلي ميعاد 🗓️', 'كلمني عن العقارات 🏠', 'عايز أضيف إعلان ➕']
// تفاعلات سريعة تظهر فوق الرسالة عند الضغط المطوّل
const REACTIONS = ['❤️','👍','😂','😮','😢','🙏','🔥']

// ── الأنواع ──────────────────────────────────────────────────────────────
type Attach = { type: 'image' | 'audio' | 'video' | 'document'; mimetype: string; data_base64: string; filename?: string; previewUrl?: string }
type Msg = {
  id: string
  role: 'user' | 'bot' | 'sys'
  text: string
  time: string
  media?: Attach
  status?: 'sent' | 'delivered' | 'read'
  reaction?: string          // تفاعل واحد على الرسالة (إيموجي)
  replyToId?: string         // معرّف الرسالة اللي بنرد عليها
  edited?: boolean           // اتعدّلت؟
  deleted?: boolean          // اتحذفت؟ (بنسيبها كـ«رسالة اتشالت»)
}
type BIPEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> }

// ── أدوات ────────────────────────────────────────────────────────────────
let _idc = 0
function newId() { _idc += 1; return `m${Date.now()}_${_idc}` }
function nowTime() {
  return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })
}
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
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: C.green, fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}>{p}</a>
    ) : (
      <span key={i}>{p}</span>
    )
  )
}
// مقتطف قصير من رسالة (للرد/الاقتباس)
function snippet(m?: Msg): string {
  if (!m) return ''
  if (m.deleted) return 'رسالة اتشالت'
  if (m.text) return m.text.length > 60 ? m.text.slice(0, 60) + '…' : m.text
  if (m.media?.type === 'image') return '📷 صورة'
  if (m.media?.type === 'audio') return '🎤 رسالة صوتية'
  if (m.media) return '📎 ' + (m.media.filename || 'ملف')
  return '…'
}

export default function ChatPage() {
  const [phone, setPhone] = useState('')
  const [name, setName] = useState('')
  const [started, setStarted] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
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

  // ── حالة المميزات الجديدة ──────────────────────────────────────────────
  const [replyTo, setReplyTo] = useState<Msg | null>(null)   // بنرد على إيه دلوقتي
  const [editing, setEditing] = useState<Msg | null>(null)   // بنعدّل رسالة إيه
  const [menuFor, setMenuFor] = useState<string | null>(null) // قايمة الأكشن مفتوحة لأنهي رسالة

  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const longPressRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const welcome = useCallback((nm: string) => {
    setMessages([{ id: newId(), role: 'sys', text: `أهلاً${nm ? ' يا ' + nm : ''} 👋 أنا المارد، مساعدك الشخصي على مضمونة — اسألني في أي حاجة.`, time: nowTime() }])
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
        return { id: m.id || newId(), role, text, time, media, status: role === 'user' ? ('read' as const) : undefined }
      })
    } catch { return [] }
  }

  // ── التهيئة (auth + تحميل التاريخ) ─────────────────────────────────────
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

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, sending])

  // ── تثبيت PWA ──────────────────────────────────────────────────────────
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
      setMessages((m) => [...m, { id: newId(), role: 'sys', text: '🔔 تمام — هنبعتلك تنبيه لو المارد رد وانت مش فاتح الشات.', time: nowTime() }])
    } else {
      setMessages((m) => [...m, { id: newId(), role: 'sys', text: r.error || 'مش قادر أفعّل التنبيهات دلوقتي.', time: nowTime() }])
      if (getNotificationPermission() === 'denied') setNotifState('denied')
    }
  }

  // (11 Aug 2026) اتشال الطلب التلقائي لإذن التنبيهات من هنا — نفس السبب
  // المذكور في page.tsx: كان بيتفعّل كـ side effect لإرسال رسالة، وده اللي
  // كروم بيحسبه "abusive notification request". التفعيل بقى فقط عبر زرار
  // "🔔 فعّل التنبيهات" الصريح (enableNotifs تحت).

  function start() { if (normEg(phone).length < 11) return; setStarted(true); welcome(name.trim()) }

  // ── إرسال رسالة (بيدعم الرد على رسالة) ─────────────────────────────────
  async function submit(text: string, media: Attach | null, summonNow: boolean, replyToId?: string) {
    if ((!text && !media) || sending) return
    const myId = newId()
    setMessages((m) => [...m, { id: myId, role: 'user', text, time: nowTime(), media: media || undefined, status: 'sent', replyToId }])
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
        if (data.reply) setMessages((m) => [...m, { id: newId(), role: 'bot', text: data.reply, time: nowTime() }])
      } else {
        setMessages((m) => [...m, { id: newId(), role: 'sys', text: data?.error || 'حصل خطأ مؤقت، جرّب تاني.', time: nowTime() }])
      }
    } catch {
      setMessages((m) => [...m, { id: newId(), role: 'sys', text: 'مش قادر أوصل للسيرفر دلوقتي، جرّب تاني.', time: nowTime() }])
    } finally {
      setSending(false)
    }
  }

  function send() {
    const t = input.trim(); const m = attach
    if (!t && !m) return
    // وضع التعديل: بنعدّل نص رسالة موجودة (محليًا) بدل ما نبعت جديدة
    if (editing) {
      const targetId = editing.id
      setMessages((ms) => ms.map((x) => x.id === targetId ? { ...x, text: t, edited: true } : x))
      setEditing(null); setInput(''); setShowEmoji(false); setShowPlus(false)
      return
    }
    const rid = replyTo?.id
    setInput(''); setAttach(null); setShowEmoji(false); setShowPlus(false); setReplyTo(null)
    submit(t, m, maridOn, rid)
  }
  function sendQuick(t: string) { submit(t, null, maridOn) }

  // ── أكشنز الرسالة: رد · تفاعل · تعديل · حذف ─────────────────────────────
  function actReply(m: Msg) { setReplyTo(m); setEditing(null); setMenuFor(null); inputRef.current?.focus() }
  function actReact(m: Msg, emoji: string) {
    setMessages((ms) => ms.map((x) => x.id === m.id ? { ...x, reaction: x.reaction === emoji ? undefined : emoji } : x))
    setMenuFor(null)
  }
  function actEdit(m: Msg) {
    if (m.role !== 'user' || m.deleted) return
    setEditing(m); setReplyTo(null); setInput(m.text); setMenuFor(null)
    setTimeout(() => inputRef.current?.focus(), 30)
  }
  function actDelete(m: Msg) {
    setMessages((ms) => ms.map((x) => x.id === m.id ? { ...x, deleted: true, text: '', media: undefined, reaction: undefined } : x))
    setMenuFor(null)
    if (replyTo?.id === m.id) setReplyTo(null)
    if (editing?.id === m.id) { setEditing(null); setInput('') }
  }
  function actCopy(m: Msg) {
    try { navigator.clipboard?.writeText(m.text || '') } catch {}
    setMenuFor(null)
  }

  // ضغط مطوّل = يفتح قايمة الأكشن (للموبايل)
  function pressStart(id: string) {
    longPressRef.current = setTimeout(() => setMenuFor(id), 420)
  }
  function pressEnd() {
    if (longPressRef.current) { clearTimeout(longPressRef.current); longPressRef.current = null }
  }

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

  // ── شاشات التحميل / الدخول ─────────────────────────────────────────────
  if (!authChecked) return <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: C.greenDk, color: '#fff', fontFamily: 'system-ui' }}>لحظة…</div>

  if (!started) {
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: `radial-gradient(circle at 30% 20%, ${C.greenLt} 0%, ${C.greenDk} 70%)`, padding: 16, fontFamily: "'Cairo', system-ui, sans-serif" }}>
        <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');"}</style>
        <div style={{ background: '#fff', borderRadius: 22, padding: 30, width: '100%', maxWidth: 380, boxShadow: '0 20px 60px rgba(0,0,0,.35)' }}>
          <div style={{ width: 76, height: 76, borderRadius: '50%', margin: '0 auto 12px', background: `linear-gradient(135deg,${C.gold},${C.green})`, display: 'grid', placeItems: 'center', overflow: 'hidden', boxShadow: '0 8px 24px rgba(31,111,95,.35)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={MARID_AVATAR} alt="المارد" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 23, color: C.green, fontWeight: 800 }}>شات مضمونة</h1>
          <p style={{ textAlign: 'center', margin: '0 0 20px', color: C.sub, fontSize: 14 }}>كلّم المارد مباشرة — مساعدك الشخصي على مضمونة</p>
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="اسمك" style={inp} />
          <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="رقم موبايلك" inputMode="tel" style={inp} onKeyDown={(e) => e.key === 'Enter' && start()} />
          <button onClick={start} style={{ ...btnMain, width: '100%', marginTop: 6, borderRadius: 14, height: 50 }}>ابدأ المحادثة</button>
        </div>
      </div>
    )
  }

  const hasText = input.trim().length > 0 || !!attach
  const byId = (id?: string) => messages.find((x) => x.id === id)

  return (
    <div dir="rtl" style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: C.bg, fontFamily: "'Cairo', system-ui, sans-serif" }} onClick={() => menuFor && setMenuFor(null)}>
      <style>{"@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap');"}</style>

      {/* ── الهيدر ── */}
      <header style={{ background: `linear-gradient(135deg,${C.greenLt} 0%,${C.green} 55%,${C.greenDk} 100%)`, color: '#fff', padding: '11px 14px', display: 'flex', alignItems: 'center', gap: 11, boxShadow: '0 3px 16px rgba(23,84,73,.28)', zIndex: 3 }}>
        <Link href="/chat" aria-label="رجوع" style={{ color: '#fff', textDecoration: 'none', fontSize: 25, lineHeight: 1, padding: '2px 4px', flexShrink: 0 }}>→</Link>
        <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fff', overflow: 'hidden', flexShrink: 0, border: `2px solid ${C.gold}` }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={MARID_AVATAR} alt="المارد" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 16, display: 'flex', alignItems: 'center', gap: 6 }}>المارد <span style={{ fontSize: 13 }}>🧞</span></div>
          <div style={{ fontSize: 12, opacity: .9, display: 'flex', alignItems: 'center', gap: 5 }}>
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: sending ? C.gold : C.mint, display: 'inline-block' }} />
            {sending ? 'بيكتب…' : 'مساعدك الشخصي · حاضر ٢٤/٧'}
          </div>
        </div>
        {notifState === 'default' && (
          <button onClick={enableNotifs} title="فعّل التنبيهات" aria-label="فعّل التنبيهات" style={{ background: 'rgba(255,255,255,.18)', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, fontSize: 17, cursor: 'pointer', flexShrink: 0 }}>🔔</button>
        )}
      </header>

      {/* ── بانر تثبيت التطبيق ── */}
      {(installEvt || iosHint) && !installDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#EDF7F0', borderBottom: `1px solid ${C.line}`, fontSize: 13, color: C.greenDk }}>
          <span style={{ fontSize: 18 }}>📲</span>
          {installEvt ? (
            <>
              <span style={{ flex: 1 }}>ثبّت شات مضمونة على تليفونك — أيقونة مستقلة، رد فوري بضغطة.</span>
              <button onClick={installApp} style={{ background: C.green, color: '#fff', border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>ثبّت</button>
            </>
          ) : (
            <span style={{ flex: 1 }}>عايز الشات كأيقونة؟ اضغط زر المشاركة ⬆️ في سفاري واختار «إضافة إلى الشاشة الرئيسية».</span>
          )}
          <button onClick={() => setInstallDismissed(true)} aria-label="إغلاق" style={{ border: 'none', background: 'none', color: C.greenDk, cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ── قائمة الرسايل ── */}
      <div ref={scrollRef} style={{ flex: 1, overflowY: 'auto', padding: '14px 10px 6px' }}>
        {messages.map((m) => {
          if (m.role === 'sys') return (
            <div key={m.id} style={{ textAlign: 'center', margin: '10px 0' }}>
              <span style={{ background: 'rgba(31,111,95,.10)', color: C.greenDk, fontSize: 12, padding: '5px 12px', borderRadius: 12, display: 'inline-block', maxWidth: '85%' }}>{m.text}</span>
            </div>
          )
          const mine = m.role === 'user'
          const q = byId(m.replyToId) // الرسالة اللي بنرد عليها
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-start' : 'flex-end', marginBottom: m.reaction ? 16 : 8, position: 'relative' }}>
              <div style={{ position: 'relative', maxWidth: '82%' }}>
                <div
                  onContextMenu={(e) => { e.preventDefault(); setMenuFor(m.id) }}
                  onTouchStart={() => pressStart(m.id)}
                  onTouchEnd={pressEnd}
                  onTouchMove={pressEnd}
                  onDoubleClick={() => !m.deleted && actReact(m, '❤️')}
                  style={{
                    background: m.deleted ? 'rgba(255,255,255,.55)' : (mine ? C.bubbleMe : C.bubbleBot),
                    padding: '8px 12px', borderRadius: 16,
                    borderTopRightRadius: mine ? 16 : 5, borderTopLeftRadius: mine ? 5 : 16,
                    boxShadow: '0 1px 3px rgba(20,32,29,.10)', whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                    fontSize: 15, lineHeight: 1.6, color: m.deleted ? C.sub : C.ink,
                    fontStyle: m.deleted ? 'italic' : 'normal', cursor: 'default', userSelect: 'none',
                  }}
                >
                  {/* اقتباس الرد */}
                  {q && !m.deleted && (
                    <div style={{ borderInlineStart: `3px solid ${C.gold}`, background: 'rgba(31,111,95,.06)', borderRadius: 8, padding: '4px 8px', marginBottom: 6, fontSize: 12.5 }}>
                      <div style={{ color: C.green, fontWeight: 700, marginBottom: 1 }}>{q.role === 'user' ? 'أنت' : 'المارد'}</div>
                      <div style={{ color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(q)}</div>
                    </div>
                  )}
                  {m.deleted ? '🚫 رسالة اتشالت' : (<>
                    {m.media?.type === 'image' && m.media.previewUrl && <img src={m.media.previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: 10, marginBottom: m.text ? 6 : 0 }} />}
                    {m.media?.type === 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>🎤 رسالة صوتية</div>}
                    {m.media && m.media.type !== 'image' && m.media.type !== 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>📎 {m.media.filename || m.media.type}</div>}
                    {linkify(m.text)}
                  </>)}
                  <span style={{ display: 'block', textAlign: 'left', fontSize: 10, color: C.sub, marginTop: 2, opacity: .8 }}>
                    {m.edited && !m.deleted && <span style={{ marginInlineEnd: 4 }}>مُعدّلة</span>}
                    {m.time}
                    {mine && m.status && !m.deleted && (
                      <span style={{ marginInlineStart: 4, fontWeight: 700, color: m.status === 'read' ? C.greenLt : C.sub }}>
                        {m.status === 'sent' ? '✓' : '✓✓'}
                      </span>
                    )}
                  </span>
                </div>

                {/* التفاعل المعروض على الفقاعة */}
                {m.reaction && !m.deleted && (
                  <div style={{ position: 'absolute', bottom: -13, insetInlineEnd: mine ? 'auto' : 8, insetInlineStart: mine ? 8 : 'auto', background: '#fff', borderRadius: 12, padding: '1px 5px', fontSize: 14, boxShadow: '0 1px 4px rgba(0,0,0,.18)' }}>{m.reaction}</div>
                )}
              </div>
            </div>
          )
        })}
        {sending && <div style={{ textAlign: 'end', color: C.sub, fontSize: 13, padding: '2px 8px' }}>المارد بيكتب…</div>}
        {maridOn && !sending && messages[messages.length - 1]?.role === 'bot' && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end', marginTop: 6 }}>
            {QUICKS.map((quick) => (
              <button key={quick} onClick={() => sendQuick(quick)} style={{ background: '#fff', border: `1px solid ${C.mint}`, color: C.green, borderRadius: 16, padding: '6px 12px', fontSize: 13, cursor: 'pointer' }}>{quick}</button>
            ))}
          </div>
        )}
      </div>

      {/* ── قايمة الأكشن (تظهر عند الضغط المطوّل / كليك يمين على رسالة) ── */}
      {menuFor && (() => {
        const m = messages.find((x) => x.id === menuFor)
        if (!m || m.role === 'sys') return null
        const mine = m.role === 'user'
        return (
          <div onClick={(e) => { e.stopPropagation(); setMenuFor(null) }} style={{ position: 'fixed', inset: 0, background: 'rgba(20,32,29,.28)', zIndex: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
            <div onClick={(e) => e.stopPropagation()} dir="rtl" style={{ background: '#fff', borderRadius: 18, overflow: 'hidden', width: '100%', maxWidth: 300, boxShadow: '0 20px 50px rgba(0,0,0,.35)' }}>
              {/* شريط التفاعلات */}
              {!m.deleted && (
                <div style={{ display: 'flex', justifyContent: 'space-around', padding: '10px 8px', borderBottom: `1px solid ${C.line}`, background: C.cream }}>
                  {REACTIONS.map((e) => (
                    <button key={e} onClick={() => actReact(m, e)} style={{ border: 'none', background: m.reaction === e ? 'rgba(31,111,95,.14)' : 'none', borderRadius: '50%', width: 38, height: 38, fontSize: 22, cursor: 'pointer', transition: 'transform .1s' }}>{e}</button>
                  ))}
                </div>
              )}
              {/* الأكشنز */}
              {!m.deleted && <button onClick={() => actReply(m)} style={menuRow}><span style={menuIco}>↩️</span> رد</button>}
              {!m.deleted && m.text && <button onClick={() => actCopy(m)} style={menuRow}><span style={menuIco}>📋</span> نسخ</button>}
              {mine && !m.deleted && <button onClick={() => actEdit(m)} style={menuRow}><span style={menuIco}>✏️</span> تعديل</button>}
              {!m.deleted && <button onClick={() => actDelete(m)} style={{ ...menuRow, color: '#c0392b' }}><span style={menuIco}>🗑️</span> حذف</button>}
              <button onClick={() => setMenuFor(null)} style={{ ...menuRow, justifyContent: 'center', color: C.sub, borderTop: `1px solid ${C.line}` }}>إلغاء</button>
            </div>
          </div>
        )
      })()}

      {/* ── بانر الرد / التعديل فوق صندوق الكتابة ── */}
      {(replyTo || editing) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#EDF7F0', borderTop: `1px solid ${C.line}` }}>
          <span style={{ fontSize: 18 }}>{editing ? '✏️' : '↩️'}</span>
          <div style={{ flex: 1, minWidth: 0, borderInlineStart: `3px solid ${C.gold}`, paddingInlineStart: 8 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: C.green }}>{editing ? 'تعديل الرسالة' : `رد على ${replyTo?.role === 'user' ? 'نفسك' : 'المارد'}`}</div>
            <div style={{ fontSize: 12.5, color: C.sub, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(editing || replyTo || undefined)}</div>
          </div>
          <button onClick={() => { setReplyTo(null); setEditing(null); if (editing) setInput('') }} aria-label="إلغاء" style={{ border: 'none', background: 'none', color: C.sub, cursor: 'pointer', fontSize: 18 }}>✕</button>
        </div>
      )}

      {/* ── لوحة الإيموجي ── */}
      {showEmoji && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: '#fff', borderTop: `1px solid ${C.line}`, maxHeight: 160, overflowY: 'auto' }}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setInput((v) => v + e)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 3 }}>{e}</button>
          ))}
        </div>
      )}

      {/* ── لوحة الإرفاق ── */}
      {showPlus && (
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#fff', borderTop: `1px solid ${C.line}` }}>
          <button onClick={() => fileRef.current?.click()} style={sheetBtn}>🖼️<div style={sheetLbl}>صورة/ملف</div></button>
          <button onClick={sendLocation} style={sheetBtn}>📍<div style={sheetLbl}>موقعي</div></button>
          <button onClick={() => { const el = calRef.current; if (el) { try { el.showPicker() } catch { el.click() } } }} style={sheetBtn}>🗓️<div style={sheetLbl}>ميعاد</div></button>
        </div>
      )}

      {/* ── معاينة المرفق ── */}
      {attach && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#EDF7F0', fontSize: 13 }}>
          <span>{attach.type === 'image' ? '🖼️ صورة جاهزة' : attach.type === 'audio' ? '🎤 صوت جاهز' : '📎 ' + (attach.filename || 'ملف')}</span>
          <button onClick={() => setAttach(null)} style={{ marginInlineStart: 'auto', border: 'none', background: 'none', color: '#c0392b', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ── صندوق الكتابة ── */}
      <div style={{ display: 'flex', gap: 6, padding: 10, background: 'rgba(255,255,255,.94)', borderTop: `1px solid ${C.line}`, boxShadow: '0 -2px 12px rgba(20,32,29,.05)', alignItems: 'center' }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />
        <input ref={calRef} type="datetime-local" onChange={onCal} style={{ display: 'none' }} />
        <button onClick={() => { setShowPlus((v) => !v); setShowEmoji(false) }} title="إرفاق" style={{ ...iconBtn, transform: showPlus ? 'rotate(45deg)' : 'none', color: C.green }}>➕</button>
        <button onClick={() => { setShowEmoji((v) => !v); setShowPlus(false) }} title="إيموجي" style={{ ...iconBtn, color: C.green }}>😊</button>
        <input ref={inputRef} value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && send()} onFocus={() => { setShowEmoji(false); setShowPlus(false) }} placeholder={editing ? 'عدّل رسالتك…' : recording ? 'بسجّل…' : 'اكتب رسالة'} style={{ ...inp, margin: 0, flex: 1 }} />
        {hasText ? (
          <button onClick={send} disabled={sending} style={{ ...btnMain, width: 48, padding: 0, opacity: sending ? .6 : 1 }}>{editing ? '✓' : '➤'}</button>
        ) : (
          <button onClick={toggleRec} title="تسجيل صوت" style={{ ...btnMain, width: 48, padding: 0, background: recording ? '#c0392b' : `linear-gradient(135deg,${C.greenLt},${C.green})` }}>{recording ? '⏹️' : '🎤'}</button>
        )}
      </div>
      <ChatBottomNav />
    </div>
  )
}

// ── ستايلات ──────────────────────────────────────────────────────────────
const inp: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: '12px 16px', margin: '0 0 12px', border: `1px solid ${C.line}`, borderRadius: 24, fontSize: 15, outline: 'none', background: '#fff', fontFamily: "'Cairo', system-ui, sans-serif" }
const btnMain: React.CSSProperties = { background: `linear-gradient(135deg,${C.greenLt},${C.green})`, color: '#fff', border: 'none', borderRadius: '50%', height: 48, fontSize: 18, fontWeight: 700, cursor: 'pointer', boxShadow: '0 3px 10px rgba(31,111,95,.35)' }
const iconBtn: React.CSSProperties = { border: 'none', background: 'none', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1, transition: 'transform .15s' }
const sheetBtn: React.CSSProperties = { border: `1px solid ${C.line}`, background: C.cream, borderRadius: 12, padding: '10px 16px', fontSize: 26, cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 2 }
const sheetLbl: React.CSSProperties = { fontSize: 12, color: C.sub }
const menuRow: React.CSSProperties = { width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '13px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, color: C.ink, fontFamily: "'Cairo', system-ui, sans-serif", textAlign: 'start' }
const menuIco: React.CSSProperties = { fontSize: 18, width: 22, textAlign: 'center' }
