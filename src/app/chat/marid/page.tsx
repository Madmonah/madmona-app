'use client'

import { useState, useRef, useEffect, useCallback, Fragment } from 'react'
import Link from 'next/link'
import {
  Search as SearchIcon, MoreVertical, ChevronDown, Pin,
  Plus, Smile, Mic, Send, Check, Square, ArrowRight,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import ChatBottomNav from '@/components/ChatBottomNav'
import { subscribeToPush, getNotificationPermission, isPushSupported } from '@/lib/push-subscription'

// ── شات المارد — إعادة تصميم 4b (29 Jul 2026) من design_handoff_bourse_marid ──
// هوية مضمونة، مش واتساب ولا تليجرام: هيدر متدرّج غامق #14231E→#059669،
// أرضية الشات #F1EEE6 بنقشة نقط خضرا، فقاعة المستخدم متدرّج أخضر بعلامات
// قراءة #8FE3C8، فقاعة المارد بيضا مع أفاتار الجني، والكل معلّق من اليمين
// (فقاعة المستخدم مزاحة ٣٦px عشان تتحاذى مع عمود الأفاتار — زي الموك بالظبط).
// ⚠️ اللوجيك كله زي ما هو: تسجيل الدخول، الهيستوري، رد/تفاعل/تعديل/حذف/
// تثبيت/تحويل/بحث، التسجيل الصوتي، المرفقات، البوش، وبانر التثبيت.
// جديد شكلي بس: فواصل الأيام، قايمة الكباب (⋮)، والردود السريعة فوق الكومبوزر.

type Attach = { type: 'image' | 'audio' | 'video' | 'document'; mimetype: string; data_base64: string; filename?: string; previewUrl?: string }
type Msg = {
  id: string
  role: 'user' | 'bot' | 'sys'
  text: string
  time: string
  day?: string              // ليبل اليوم (النهاردة/امبارح/تاريخ) — للفواصل
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

// أفاتار الجني من Cloudinary — نسخة كبيرة للهيدر وصغيرة لجنب الفقاعات
const AVATAR_HD = 'https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_120,h_120/madmona/mascots/genie.png'
const AVATAR_SM = 'https://res.cloudinary.com/duxfgqioc/image/upload/c_crop,x_375,y_120,w_410,h_410/c_fill,w_56,h_56/madmona/mascots/genie.png'

// معرّف بسيط للرسائل المحلية (الرسائل الجاية من السيرفر ليها id حقيقي)
function mkId() { return 'local_' + Math.random().toString(36).slice(2) + Date.now().toString(36) }
function nowTime() { return new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) }

// ليبل اليوم لفواصل التاريخ — الرسائل الجديدة من غير day بتتحسب «النهاردة»
function dayLabelFromIso(iso: string): string {
  try {
    const d = new Date(iso)
    const now = new Date()
    const strip = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
    const diff = Math.round((strip(now) - strip(d)) / 86400000)
    if (diff <= 0) return 'النهاردة'
    if (diff === 1) return 'امبارح'
    return d.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' })
  } catch { return 'النهاردة' }
}
const dayOf = (m: Msg) => m.day || 'النهاردة'

// علامة تسليم آخر رسالة للمستخدم: ✓ اتبعت · ✓✓ وصلت · ✓✓ منوّرة = المارد قرأ ورد
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
// اللينكات جوه فقاعة المستخدم (الخضرا) لازم لون فاتح عشان تتقري
function linkify(text: string, onDark = false): React.ReactNode[] {
  return (text || '').split(/(https?:\/\/[^\s]+)/g).map((p, i) =>
    /^https?:\/\//.test(p) ? (
      <a key={i} href={p} target="_blank" rel="noopener noreferrer" style={{ color: onDark ? '#CDEFE2' : '#059669', fontWeight: 600, textDecoration: 'underline', wordBreak: 'break-all' }}>{p}</a>
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
  const [authedNoPhone, setAuthedNoPhone] = useState(false) // داخل بحساب مضمونة بس لسه مفيش رقم واتساب متسجّل (جوجل مثلًا)
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
  // ── حالة المميزات ──
  const [replyTo, setReplyTo] = useState<Msg | null>(null)     // بنرد على أنهي رسالة
  const [menuFor, setMenuFor] = useState<string | null>(null)  // قايمة الأكشنز مفتوحة لأنهي رسالة
  const [editingId, setEditingId] = useState<string | null>(null) // بنعدّل أنهي رسالة
  const [search, setSearch] = useState('')                     // نص البحث
  const [showSearch, setShowSearch] = useState(false)          // شريط البحث ظاهر؟
  const [forwardMsg, setForwardMsg] = useState<Msg | null>(null) // رسالة بنحوّلها (forward)
  const [showPinned, setShowPinned] = useState(false)          // لوحة المثبّتة مفتوحة؟
  const [showMenu, setShowMenu] = useState(false)              // 🆕 قايمة الكباب (⋮) في الهيدر
  const scrollRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const calRef = useRef<HTMLInputElement>(null)
  const recRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const qSentRef = useRef(false)   // يمنع إرسال سؤال الهوم (?q=) مرتين

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
        return { id: m.id || mkId(), role, text, time, day: dayLabelFromIso(m.created_at), media, status: role === 'user' ? ('read' as const) : undefined }
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
            // 🔗 حساب واحد (8 Aug 2026): جدّد توكن أقسام مضمونة في الخلفية
            import('@/lib/madmonaSession').then((m) => m.syncModuleSession()).catch(() => {})
            const hist = await loadHistory(session.access_token)
            if (hist.length) setMessages(hist)
            else welcome(nm)
          } else {
            // داخل بحساب مضمونة (جوجل غالبًا) بس لسه مسجّلش رقم واتساب —
            // هنوجهه لتأكيد الرقم مرة واحدة بدل ما نسأله الاسم والرقم كل مرة
            setName(nm)
            setAuthedNoPhone(true)
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
    if (!authChecked || !started || !pendingQ || qSentRef.current) return
    // 🐛 (8 Aug 2026) الإصلاح: النسخة القديمة كانت بتعمل setPendingQ(null) فورًا،
    //    وده بيغيّر الـdependency فبيشغّل الـcleanup اللي بيعمل clearTimeout —
    //    فالتايمر كان بيتلغي قبل ما يبعت السؤال خالص. شيلنا الـcleanup وحطينا
    //    ref يمنع الإرسال المزدوج.
    qSentRef.current = true
    const t = pendingQ
    setPendingQ(null)
    setTimeout(() => { try { submit(t, null, maridOn) } catch {} }, 350)
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

  // (11 Aug 2026) اتشال الطلب التلقائي لإذن التنبيهات من هنا — كان بيتفعّل
  // كـ side effect لإرسال أول رسالة شات، وده بالظبط النمط اللي كروم بيحسبه
  // "abusive notification request" (طلب إذن مش مربوط بإيماءة مستخدم واضحة ومباشرة)
  // وده سبب رسالة "possible spam" اللي كانت بتظهر. التفعيل بقى فقط عبر زرار
  // "🔔 فعّل التنبيهات" الصريح في قايمة الكباب (enableNotifs تحت) — إيماءة
  // مستخدم مباشرة وواضحة، متوافقة مع سياسة كروم.

  // (8 Aug 2026) دالة start() القديمة اتشالت — مفيش تسجيل موازي بالاسم والرقم؛
  // الدخول بقى حصريًا عبر حساب مضمونة الموحد (شوف بوابة !started تحت).

  async function submit(text: string, media: Attach | null, summonNow: boolean, replyToId?: string) {
    if ((!text && !media) || sending) return
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

  // ── أكشنز المميزات ──
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
      // 🐞 (١٦ أغسطس ٢٠٢٦) كان `audio/webm` مكتوب بالنص هنا مهما كان الجهاز.
      //    الآيفون بيسجّل `audio/mp4` مش webm — فكنا بنلزق اسم غلط على
      //    الملف، وWhisper يفك تشفير ضوضاء ويطلّع كلام عربي مالوش معنى
      //    («سمعت بذور على شعف مصرق يدي»). بناخد النوع الحقيقي من
      //    المسجّل نفسه دلوقتي.
      const mr = new MediaRecorder(stream); chunksRef.current = []
      mr.ondataavailable = (ev) => chunksRef.current.push(ev.data)
      mr.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop())
        const realMime = (mr.mimeType || chunksRef.current[0]?.type || 'audio/webm').split(';')[0]
        const ext = realMime.includes('mp4') ? 'm4a' : realMime.includes('ogg') ? 'ogg' : realMime.includes('mpeg') ? 'mp3' : 'webm'
        const blob = new Blob(chunksRef.current, { type: realMime })
        const b64: string = await new Promise((res) => { const r = new FileReader(); r.onload = () => res((r.result as string).split(',')[1]); r.readAsDataURL(blob) })
        setAttach({ type: 'audio', mimetype: realMime, data_base64: b64, filename: `voice.${ext}` }); setRecording(false)
      }
      recRef.current = mr; mr.start(); setRecording(true)
    } catch { alert('مش قادر أوصل للمايك') }
  }

  if (!authChecked) return <div dir="rtl" style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'linear-gradient(160deg,#14231E,#059669)', color: '#fff', fontFamily: 'system-ui' }}>لحظة…</div>

  if (!started) {
    // 🔗 (8 Aug 2026) حساب واحد فقط: المارد بقى جزء من حساب مضمونة.
    //    مفيش تسجيل موازي بالاسم والرقم — الزائر يدخل/يعمل حساب مضمونة،
    //    واللي داخل من غير رقم (جوجل) يأكد رقمه مرة واحدة عبر /auth/complete-phone.
    const backTo = '/chat/marid' + (pendingQ ? `?q=${encodeURIComponent(pendingQ)}` : '')
    const go = (path: string) => `${path}?redirect=${encodeURIComponent(backTo)}`
    return (
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(160deg,#059669 0%,#2FA084 100%)', padding: 16, fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
        <div style={{ background: '#FAFAF7', borderRadius: 22, padding: 30, width: '100%', maxWidth: 380, boxShadow: '0 18px 50px rgba(0,0,0,.28)' }}>
          <div style={{ width: 84, height: 84, margin: '0 auto 12px', borderRadius: '50%', background: 'linear-gradient(135deg,#F4C430,#2FA084)', display: 'grid', placeItems: 'center', boxShadow: '0 8px 22px rgba(47,160,132,.35)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={AVATAR_HD} alt="المارد" style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover' }} />
          </div>
          <h1 style={{ textAlign: 'center', margin: '0 0 4px', fontSize: 23, fontWeight: 800, color: '#059669' }}>شات مضمونة</h1>
          <p style={{ textAlign: 'center', margin: '0 0 18px', color: '#667', fontSize: 14 }}>
            {authedNoPhone
              ? `أهلًا${name ? ' يا ' + name : ''} 👋 فاضل خطوة واحدة بس`
              : 'حساب مضمونة واحد — للسوق والحجوزات والمارد'}
          </p>
          {pendingQ && (
            <div style={{ background: 'rgba(47,160,132,.10)', border: '1px solid rgba(47,160,132,.25)', borderRadius: 14, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#059669', textAlign: 'center', lineHeight: 1.6 }}>
              💬 سؤالك محفوظ: «{pendingQ}»
              <span style={{ display: 'block', fontSize: 11.5, color: '#667', marginTop: 2 }}>هيتبعت للمارد لوحده بعد الدخول — مش هتكتبه تاني</span>
            </div>
          )}
          {authedNoPhone ? (
            <>
              <p style={{ margin: '0 0 14px', color: '#556', fontSize: 13, lineHeight: 1.8, textAlign: 'center' }}>
                عشان المارد يقدر يبعتلك ويحجزلك على واتساب، محتاجين نأكد رقمك مرة واحدة — وبعدها مش هنسألك تاني على أي جهاز.
              </p>
              <a href={go('/auth/complete-phone')} style={{ ...btnPrimary, width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>أكّد رقم الواتساب</a>
            </>
          ) : (
            <>
              <a href={go('/auth/login')} style={{ ...btnPrimary, width: '100%', display: 'block', textAlign: 'center', textDecoration: 'none', boxSizing: 'border-box' }}>سجّل دخول</a>
              <a href={go('/auth/signup')} style={{ display: 'block', textAlign: 'center', textDecoration: 'none', width: '100%', boxSizing: 'border-box', marginTop: 10, padding: '13px 16px', borderRadius: 24, border: '2px solid rgba(250, 129, 37,.25)', color: '#059669', fontWeight: 800, fontSize: 15, background: '#fff' }}>أول مرة؟ اعمل حساب في دقيقة</a>
              <p style={{ margin: '14px 0 0', color: '#889', fontSize: 11.5, textAlign: 'center', lineHeight: 1.7 }}>تدخل مرة واحدة — المارد يعرفك ويكمّل معاك من آخر كلام على أي جهاز.</p>
            </>
          )}
        </div>
      </div>
    )
  }

  const hasText = input.trim().length > 0 || !!attach
  const q = search.trim().toLowerCase()
  const visible = q ? messages.filter((m) => (m.text || '').toLowerCase().includes(q)) : messages
  const pinnedList = messages.filter((m) => m.pinned && !m.deleted)
  const lastPinned = pinnedList[pinnedList.length - 1]

  return (
    <div dir="rtl" style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#F1EEE6', fontFamily: "var(--font-cairo), system-ui, sans-serif" }}>
      <style>{`
        
        @keyframes maridTyping{0%,60%,100%{transform:translateY(0)}30%{transform:translateY(-3px)}}
        .marid-dot{animation:maridTyping 1.2s infinite}
        @media (prefers-reduced-motion: reduce){.marid-dot{animation:none}}
        .mchat-hs{scrollbar-width:none}
        .mchat-hs::-webkit-scrollbar{display:none}
      `}</style>

      {/* ─── الهيدر: متدرّج غامق #14231E→#059669 + شريط المثبّتات جوّاه ─── */}
      <header style={{ background: 'linear-gradient(135deg,#14231E,#059669)', color: '#fff', paddingBottom: 12, position: 'relative', zIndex: 25, boxShadow: '0 2px 14px rgba(20,35,30,.28)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 11, padding: '10px 16px 0' }}>
          <Link href="/chat" aria-label="رجوع" style={{ color: '#fff', display: 'flex', flexShrink: 0, padding: 2 }}>
            <ArrowRight size={20} strokeWidth={2.5} />
          </Link>
          <span style={{ position: 'relative', flexShrink: 0 }}>
            <span style={{ width: 42, height: 42, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#059669)', border: '2px solid rgba(255,255,255,.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={AVATAR_HD} alt="المارد" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            </span>
            <span style={{ position: 'absolute', bottom: 0, left: 0, width: 11, height: 11, borderRadius: '50%', background: '#6FCF97', border: '2px solid #14231E' }} />
          </span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ display: 'block', fontSize: 15.5, fontWeight: 900, lineHeight: 1.25 }}>المارد</span>
            <span style={{ display: 'block', fontSize: 10.5, fontWeight: 600, color: '#6FCF97' }}>{sending ? 'بيكتب…' : 'متصل — بيرد فوري ٢٤/٧'}</span>
          </span>
          <button onClick={() => { setShowSearch((v) => !v); setSearch(''); setShowMenu(false) }} title="بحث" aria-label="بحث" style={hdrBtn}>
            <SearchIcon size={19} strokeWidth={2} />
          </button>
          <button onClick={() => setShowMenu((v) => !v)} title="المزيد" aria-label="المزيد" style={{ ...hdrBtn, marginRight: 2 }}>
            <MoreVertical size={19} strokeWidth={2} />
          </button>
        </div>

        {/* قايمة الكباب (⋮) — بحث · المثبّتات · التنبيهات · الإعدادات */}
        {showMenu && (
          <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 56, left: 12, background: '#fff', borderRadius: 14, boxShadow: '0 10px 30px rgba(0,0,0,.22)', overflow: 'hidden', zIndex: 40, minWidth: 180 }}>
            <button onClick={() => { setShowSearch((v) => !v); setSearch(''); setShowMenu(false) }} style={menuItem}>🔍 بحث في المحادثة</button>
            {pinnedList.length > 0 && (
              <button onClick={() => { setShowPinned((v) => !v); setShowMenu(false) }} style={menuItem}>📌 الرسائل المثبّتة ({pinnedList.length})</button>
            )}
            {notifState === 'default' && (
              <button onClick={() => { enableNotifs(); setShowMenu(false) }} style={menuItem}>🔔 فعّل التنبيهات</button>
            )}
            <Link href="/chat/settings" style={{ ...menuItem, textDecoration: 'none', display: 'block' }}>⚙️ الإعدادات</Link>
          </div>
        )}

        {/* شريط المثبّتات — مخفي لو مفيش حاجة متثبّتة */}
        {lastPinned && (
          <button onClick={() => { setShowPinned((v) => !v); setShowMenu(false) }} style={{ margin: '12px 16px 0', width: 'calc(100% - 32px)', display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,.09)', border: '1px solid rgba(255,255,255,.12)', borderRadius: 12, padding: '8px 12px', cursor: 'pointer', textAlign: 'start', fontFamily: 'inherit' }}>
            <Pin size={13} color="#FFE9A8" style={{ flexShrink: 0 }} />
            <span style={{ flex: 1, minWidth: 0, fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.85)', overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
              📌 مثبّتة: {snippet(lastPinned)}
            </span>
            <ChevronDown size={13} color="rgba(255,255,255,.6)" style={{ flexShrink: 0, transition: 'transform .15s', transform: showPinned ? 'rotate(180deg)' : 'none' }} />
          </button>
        )}
      </header>

      {showSearch && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', background: '#fff', borderBottom: '1px solid rgba(0,0,0,.05)' }}>
          <input autoFocus value={search} onChange={(e) => setSearch(e.target.value)} placeholder="دوّر في المحادثة…" style={{ flex: 1, border: 'none', background: '#F1EEE6', borderRadius: 999, padding: '9px 15px', fontSize: 13, fontWeight: 500, color: '#14231E', outline: 'none', fontFamily: 'inherit' }} />
          {q && <span style={{ fontSize: 12, color: '#8A9690', whiteSpace: 'nowrap' }}>{visible.length} نتيجة</span>}
        </div>
      )}

      {/* لوحة المثبّتات — بتفتح من شريط الهيدر أو الكباب */}
      {showPinned && pinnedList.length > 0 && (
        <div style={{ maxHeight: 180, overflowY: 'auto', background: '#fff', borderBottom: '1px solid rgba(0,0,0,.06)' }}>
          {pinnedList.map((pm) => (
            <div key={pm.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderBottom: '1px solid #F4F1E8', fontSize: 13 }}>
              <span style={{ fontSize: 10.5, fontWeight: 800, color: pm.role === 'user' ? '#2FA084' : '#059669', flexShrink: 0 }}>{pm.role === 'user' ? 'انت' : 'المارد'}</span>
              <span style={{ flex: 1, minWidth: 0, color: '#5A6660', fontWeight: 600, fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(pm)}</span>
              <button onClick={() => togglePin(pm.id)} title="إلغاء التثبيت" style={{ border: 'none', background: 'none', color: '#E26D5C', cursor: 'pointer', fontSize: 13, flexShrink: 0 }}>✕</button>
            </div>
          ))}
        </div>
      )}

      {(installEvt || iosHint) && !installDismissed && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', background: '#FFF7E0', borderBottom: '1px solid #f0e2b8', fontSize: 13, color: '#8a6d1a' }}>
          <span style={{ fontSize: 18 }}>📲</span>
          {installEvt ? (
            <>
              <span style={{ flex: 1 }}>ثبّت شات مضمونة على تليفونك — أيقونة مستقلة، رد فوري بضغطة.</span>
              <button onClick={installApp} style={{ background: '#059669', color: '#fff', border: 'none', borderRadius: 16, padding: '6px 14px', fontSize: 13, fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap' }}>ثبّت</button>
            </>
          ) : (
            <span style={{ flex: 1 }}>عايز الشات كأيقونة؟ اضغط زر المشاركة ⬆️ في سفاري واختار «إضافة إلى الشاشة الرئيسية».</span>
          )}
          <button onClick={() => setInstallDismissed(true)} aria-label="إغلاق" style={{ border: 'none', background: 'none', color: '#8a6d1a', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>✕</button>
        </div>
      )}

      {/* ─── منطقة الرسائل: #F1EEE6 + نقشة نقط خضرا خفيفة (٢٦px) ─── */}
      <div
        ref={scrollRef}
        onClick={() => { setMenuFor(null); setShowMenu(false) }}
        style={{ flex: 1, overflowY: 'auto', padding: '16px 14px 8px', background: '#F1EEE6', backgroundImage: 'radial-gradient(circle at 1.5px 1.5px, rgba(250, 129, 37,.07) 1.5px, transparent 0)', backgroundSize: '26px 26px' }}
      >
        {visible.map((m, i) => {
          const showDay = !q && (i === 0 || dayOf(visible[i - 1]) !== dayOf(m))
          const daySep = showDay ? (
            <div style={{ textAlign: 'center', margin: i === 0 ? '0 0 10px' : '14px 0 10px' }}>
              <span style={{ background: 'rgba(20,35,30,.07)', color: '#5A6660', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 999, display: 'inline-block' }}>{dayOf(m)}</span>
            </div>
          ) : null

          if (m.role === 'sys') return (
            <Fragment key={m.id}>
              {daySep}
              <div style={{ textAlign: 'center', margin: '6px 0 10px' }}>
                <span style={{ background: 'rgba(20,35,30,.07)', color: '#5A6660', fontSize: 11.5, fontWeight: 700, padding: '5px 12px', borderRadius: 999, display: 'inline-block', maxWidth: '85%' }}>{m.text}</span>
              </div>
            </Fragment>
          )

          const mine = m.role === 'user'
          const parent = m.replyToId ? messages.find((x) => x.id === m.replyToId) : undefined
          const url = m.deleted ? null : firstUrl(m.text)
          return (
            <Fragment key={m.id}>
              {daySep}
              {/* الكل معلّق من اليمين (RTL): المارد بأفاتاره، والمستخدم مزاح ٣٦px */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', justifyContent: 'flex-start', marginBottom: m.reactions?.length ? 18 : 10 }}>
                {!mine && (
                  <span style={{ width: 28, height: 28, borderRadius: '50%', background: 'radial-gradient(circle at 35% 30%,#2FA084,#059669)', overflow: 'hidden', flexShrink: 0 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={AVATAR_SM} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </span>
                )}
                <div style={{ position: 'relative', maxWidth: mine ? '78%' : '85%', marginRight: mine ? 36 : 0, minWidth: 0 }}>
                  <div
                    onClick={(e) => { e.stopPropagation(); setShowMenu(false); if (!m.deleted) setMenuFor(menuFor === m.id ? null : m.id) }}
                    style={{
                      background: m.deleted ? '#ECE9DF' : mine ? 'linear-gradient(118deg,#059669,#34D399)' : '#fff',
                      color: m.deleted ? '#8A9690' : mine ? '#fff' : '#14231E',
                      borderRadius: mine ? '18px 18px 5px 18px' : '18px 18px 18px 5px',
                      padding: '11px 14px',
                      boxShadow: m.deleted ? 'none' : mine ? '0 6px 16px -8px rgba(250, 129, 37,.45)' : '0 1px 2px rgba(20,35,30,.06)',
                      outline: menuFor === m.id ? '1.5px solid #2FA084' : 'none',
                      fontSize: 13, fontWeight: 600, lineHeight: 1.65,
                      whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                      cursor: m.deleted ? 'default' : 'pointer',
                    }}
                  >
                    {parent && (
                      <div style={{ background: mine ? 'rgba(255,255,255,.15)' : 'rgba(250, 129, 37,.06)', borderRight: mine ? '3px solid rgba(255,255,255,.85)' : '3px solid #059669', borderRadius: 8, padding: '6px 10px', marginBottom: 8 }}>
                        <div style={{ fontSize: 9.5, fontWeight: 800, color: mine ? '#fff' : '#059669' }}>{parent.role === 'user' ? 'انت' : 'المارد'}</div>
                        <div style={{ fontSize: 10.5, fontWeight: 600, color: mine ? 'rgba(255,255,255,.8)' : '#5A6660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{snippet(parent)}</div>
                      </div>
                    )}
                    {m.deleted ? (
                      <span style={{ fontStyle: 'italic' }}>🚫 اتحذفت الرسالة دي</span>
                    ) : (
                      <>
                        {m.forwarded && <div style={{ fontSize: 10, fontWeight: 700, marginBottom: 3, fontStyle: 'italic', color: mine ? 'rgba(255,255,255,.75)' : '#2FA084' }}>↗️ رسالة محوّلة</div>}
                        {m.media?.type === 'image' && m.media.previewUrl && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={m.media.previewUrl} alt="" style={{ maxWidth: '100%', borderRadius: 12, marginBottom: m.text ? 6 : 0, display: 'block' }} />
                        )}
                        {m.media?.type === 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>🎤 رسالة صوتية</div>}
                        {m.media && m.media.type !== 'image' && m.media.type !== 'audio' && <div style={{ marginBottom: m.text ? 6 : 0 }}>📎 {m.media.filename || m.media.type}</div>}
                        {linkify(m.text, mine)}
                        {url && (
                          <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', marginTop: 8, textDecoration: 'none', border: mine ? '1px solid rgba(255,255,255,.25)' : '1px solid #EAE5D9', borderRadius: 14, overflow: 'hidden', background: mine ? 'rgba(255,255,255,.12)' : '#FAFAF7' }}>
                            <div style={{ padding: '8px 11px' }}>
                              <div style={{ fontSize: 9.5, fontWeight: 800, color: mine ? '#CDEFE2' : '#059669' }}>🔗 {domainOf(url)}</div>
                              <div style={{ fontSize: 10.5, fontWeight: 600, color: mine ? 'rgba(255,255,255,.85)' : '#5A6660', wordBreak: 'break-all', marginTop: 1 }}>{url.slice(0, 70)}</div>
                            </div>
                          </a>
                        )}
                        <span style={{ display: 'flex', alignItems: 'center', justifyContent: mine ? 'flex-start' : 'flex-end', gap: 4, marginTop: 4 }}>
                          {m.edited && <span style={{ fontSize: 9, fontWeight: 600, fontStyle: 'italic', color: mine ? 'rgba(255,255,255,.65)' : '#9CA3AF' }}>معدّلة</span>}
                          <span style={{ fontSize: 9, fontWeight: 600, color: mine ? 'rgba(255,255,255,.65)' : '#9CA3AF' }}>{m.time}</span>
                          {mine && m.status && (
                            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '-1px', color: m.status === 'read' ? '#8FE3C8' : 'rgba(255,255,255,.65)' }}>{m.status === 'sent' ? '✓' : '✓✓'}</span>
                          )}
                        </span>
                      </>
                    )}
                  </div>

                  {/* تفاعلات معروضة على ركن الفقاعة */}
                  {m.reactions && m.reactions.length > 0 && (
                    <div style={{ position: 'absolute', bottom: -8, right: 10, display: 'flex', gap: 2, background: '#fff', borderRadius: 999, padding: '2px 7px', boxShadow: '0 1px 3px rgba(0,0,0,.12)', fontSize: 10 }}>
                      {m.reactions.map((e, ix) => <span key={ix}>{e}</span>)}
                    </div>
                  )}

                  {/* شريط التفاعل السريع (بيظهر فوق الرسالة لما تفتح القايمة) */}
                  {menuFor === m.id && !m.deleted && (
                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', bottom: 'calc(100% + 6px)', insetInlineStart: 0, display: 'flex', gap: 4, background: '#fff', borderRadius: 22, padding: '6px 10px', boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 20 }}>
                      {REACTS.map((e) => (
                        <button key={e} onClick={() => toggleReaction(m.id, e)} style={{ border: 'none', background: 'none', fontSize: 20, cursor: 'pointer', padding: 2, transition: 'transform .1s' }} onMouseDown={(ev) => ((ev.currentTarget as HTMLButtonElement).style.transform = 'scale(1.3)')} onMouseUp={(ev) => ((ev.currentTarget as HTMLButtonElement).style.transform = 'scale(1)')}>{e}</button>
                      ))}
                    </div>
                  )}

                  {/* قايمة الأكشنز */}
                  {menuFor === m.id && !m.deleted && (
                    <div onClick={(e) => e.stopPropagation()} style={{ position: 'absolute', top: 'calc(100% + 4px)', insetInlineStart: 0, background: '#fff', borderRadius: 14, boxShadow: '0 6px 20px rgba(0,0,0,.2)', overflow: 'hidden', zIndex: 20, minWidth: 150 }}>
                      <button onClick={() => beginReply(m)} style={menuItem}>↩️ رد</button>
                      <button onClick={() => setForwardMsg(m)} style={menuItem}>↗️ تحويل</button>
                      <button onClick={() => togglePin(m.id)} style={menuItem}>{m.pinned ? '📌 إلغاء التثبيت' : '📌 تثبيت'}</button>
                      {m.text && <button onClick={() => copyMsg(m)} style={menuItem}>📋 نسخ</button>}
                      {mine && m.text && <button onClick={() => startEdit(m)} style={menuItem}>✏️ تعديل</button>}
                      {mine && <button onClick={() => deleteMsg(m.id)} style={{ ...menuItem, color: '#E26D5C' }}>🗑️ حذف</button>}
                    </div>
                  )}
                </div>
              </div>
            </Fragment>
          )
        })}

        {/* المارد بيكتب… — تلات نقط بهوية مضمونة */}
        {sending && (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginRight: 36, marginBottom: 6 }}>
            <span style={{ background: '#fff', borderRadius: 18, padding: '9px 14px', boxShadow: '0 1px 2px rgba(20,35,30,.06)', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
              <span className="marid-dot" style={{ ...typDot, opacity: .9 }} />
              <span className="marid-dot" style={{ ...typDot, opacity: .55, animationDelay: '.15s' }} />
              <span className="marid-dot" style={{ ...typDot, opacity: .3, animationDelay: '.3s' }} />
            </span>
            <span style={{ fontSize: 9.5, fontWeight: 600, color: '#9CA3AF' }}>المارد بيكتب…</span>
          </div>
        )}
      </div>

      {/* ─── ردود سريعة فوق الكومبوزر (سكرول عرضي) ─── */}
      {maridOn && !sending && !q && !editingId && messages[messages.length - 1]?.role === 'bot' && (
        <div style={{ padding: '8px 14px 0', background: '#F1EEE6' }}>
          <div className="mchat-hs" style={{ display: 'flex', gap: 7, overflowX: 'auto', paddingBottom: 8 }}>
            {QUICKS.map((qq) => (
              <button key={qq} onClick={() => sendQuick(qq)} style={{ flex: 'none', background: '#fff', border: '1.5px solid rgba(250, 129, 37,.25)', color: '#059669', fontSize: 11.5, fontWeight: 800, padding: '8px 14px', borderRadius: 999, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{qq}</button>
            ))}
          </div>
        </div>
      )}

      {showEmoji && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, padding: 8, background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', maxHeight: 160, overflowY: 'auto' }}>
          {EMOJIS.map((e) => (
            <button key={e} onClick={() => setInput((v) => v + e)} style={{ border: 'none', background: 'none', fontSize: 24, cursor: 'pointer', padding: 3 }}>{e}</button>
          ))}
        </div>
      )}

      {showPlus && (
        <div style={{ display: 'flex', gap: 10, padding: 12, background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)' }}>
          <button onClick={() => fileRef.current?.click()} style={sheetBtn}>🖼️<div style={sheetLbl}>صورة/ملف</div></button>
          <button onClick={sendLocation} style={sheetBtn}>📍<div style={sheetLbl}>موقعي</div></button>
          <button onClick={() => { const el = calRef.current; if (el) { try { el.showPicker() } catch { el.click() } } }} style={sheetBtn}>🗓️<div style={sheetLbl}>ميعاد</div></button>
        </div>
      )}

      {/* شريط الرد/التعديل فوق خانة الكتابة — بستايل الاقتباس */}
      {(replyTo || editingId) && (
        <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', padding: '8px 12px 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(250, 129, 37,.06)', borderRight: '3px solid #059669', borderRadius: 8, padding: '6px 10px' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 9.5, fontWeight: 800, color: '#059669' }}>{editingId ? '✏️ تعديل الرسالة' : `↩️ رد على ${replyTo?.role === 'user' ? 'نفسك' : 'المارد'}`}</div>
              <div style={{ fontSize: 10.5, fontWeight: 600, color: '#5A6660', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{editingId ? (messages.find((x) => x.id === editingId)?.text || '') : snippet(replyTo || undefined)}</div>
            </div>
            <button onClick={() => { setReplyTo(null); setEditingId(null); if (editingId) setInput('') }} aria-label="إلغاء" style={{ border: 'none', background: 'none', color: '#059669', cursor: 'pointer', fontSize: 17, lineHeight: 1, flexShrink: 0 }}>✕</button>
          </div>
        </div>
      )}

      {attach && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', fontSize: 13, fontWeight: 600, color: '#14231E' }}>
          <span>{attach.type === 'image' ? '🖼️ صورة جاهزة' : attach.type === 'audio' ? '🎤 صوت جاهز' : '📎 ' + (attach.filename || 'ملف')}</span>
          <button onClick={() => setAttach(null)} style={{ marginInlineStart: 'auto', border: 'none', background: 'none', color: '#E26D5C', cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
      )}

      {/* ─── الكومبوزر: ➕ دايرة كريمي · بيل الكتابة · زرار مايك/إرسال متدرّج ─── */}
      <div style={{ background: '#fff', borderTop: '1px solid rgba(0,0,0,.05)', padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <input ref={fileRef} type="file" accept="image/*,video/*,application/pdf" onChange={onFile} style={{ display: 'none' }} />
        <input ref={calRef} type="datetime-local" onChange={onCal} style={{ display: 'none' }} />
        <button onClick={() => { setShowPlus((v) => !v); setShowEmoji(false) }} title="إرفاق" aria-label="إرفاق" style={{ width: 38, height: 38, borderRadius: '50%', background: '#F1EEE6', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, transition: 'transform .15s', transform: showPlus ? 'rotate(45deg)' : 'none' }}>
          <Plus size={18} color="#5A6660" strokeWidth={2.2} />
        </button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: '#F1EEE6', borderRadius: 999, padding: '10px 15px', minWidth: 0 }}>
          <input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            onFocus={() => { setShowEmoji(false); setShowPlus(false) }}
            placeholder={recording ? 'بسجّل…' : editingId ? 'عدّل رسالتك…' : 'اكتب رسالتك…'}
            style={{ flex: 1, minWidth: 0, border: 'none', background: 'transparent', fontSize: 13, fontWeight: 500, color: '#14231E', outline: 'none', fontFamily: 'inherit' }}
          />
          <button onClick={() => { setShowEmoji((v) => !v); setShowPlus(false) }} title="إيموجي" aria-label="إيموجي" style={{ border: 'none', background: 'none', cursor: 'pointer', padding: 0, display: 'flex', flexShrink: 0 }}>
            <Smile size={17} color="#8A9690" strokeWidth={2} />
          </button>
        </div>
        {hasText ? (
          <button onClick={send} disabled={sending} title={editingId ? 'حفظ التعديل' : 'إرسال'} aria-label={editingId ? 'حفظ التعديل' : 'إرسال'} style={{ ...actionBtn, opacity: sending ? .6 : 1 }}>
            {editingId ? <Check size={19} color="#fff" strokeWidth={2.5} /> : <Send size={18} color="#fff" strokeWidth={2.2} style={{ transform: 'scaleX(-1)' }} />}
          </button>
        ) : (
          <button onClick={toggleRec} title="تسجيل صوت" aria-label="تسجيل صوت" style={{ ...actionBtn, background: recording ? '#E26D5C' : actionBtn.background, boxShadow: recording ? '0 8px 18px -6px rgba(226,109,92,.5)' : actionBtn.boxShadow }}>
            {recording ? <Square size={16} color="#fff" fill="#fff" /> : <Mic size={19} color="#fff" strokeWidth={2.2} />}
          </button>
        )}
      </div>

      {/* نافذة تأكيد التحويل (forward) */}
      {forwardMsg && (
        <div onClick={() => setForwardMsg(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'grid', placeItems: 'center', zIndex: 50, padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: 18, padding: 20, width: '100%', maxWidth: 340, boxShadow: '0 18px 50px rgba(0,0,0,.3)' }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#059669', marginBottom: 10 }}>↗️ تحويل الرسالة</div>
            <div style={{ background: '#FAFAF7', border: '1px solid #EAE5D9', borderRadius: 10, padding: '10px 12px', fontSize: 13.5, color: '#5A6660', maxHeight: 120, overflowY: 'auto', marginBottom: 16 }}>{snippet(forwardMsg) || '📎 ملف'}</div>
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={() => setForwardMsg(null)} style={{ flex: 1, background: '#F1EEE6', color: '#5A6660', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>إلغاء</button>
              <button onClick={() => doForward(forwardMsg)} style={{ flex: 1, background: 'linear-gradient(135deg,#059669,#2FA084)', color: '#fff', border: 'none', borderRadius: 12, padding: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>حوّل هنا</button>
            </div>
          </div>
        </div>
      )}

      <ChatBottomNav />
    </div>
  )
}

// (8 Aug 2026) ستايل inp بتاع فورم الاسم/الرقم القديم اتشال مع الفورم نفسه
const btnPrimary: React.CSSProperties = { background: 'linear-gradient(135deg,#F4C430 0%,#2FA084 55%,#059669 100%)', color: '#fff', border: 'none', borderRadius: 24, height: 48, fontSize: 18, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 14px rgba(250, 129, 37,.32)', fontFamily: 'inherit' }
const hdrBtn: React.CSSProperties = { background: 'none', color: 'rgba(255,255,255,.85)', border: 'none', padding: 6, cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center' }
const actionBtn: React.CSSProperties = { width: 44, height: 44, borderRadius: '50%', background: 'linear-gradient(135deg,#059669,#2FA084)', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0, boxShadow: '0 8px 18px -6px rgba(250, 129, 37,.5)' }
const typDot: React.CSSProperties = { width: 6, height: 6, borderRadius: '50%', background: '#059669', display: 'inline-block' }
const sheetBtn: React.CSSProperties = { border: '1px solid #EAE5D9', background: '#FAFAF7', borderRadius: 12, padding: '10px 16px', fontSize: 26, cursor: 'pointer', display: 'grid', placeItems: 'center', gap: 2, fontFamily: 'inherit' }
const sheetLbl: React.CSSProperties = { fontSize: 12, color: '#5A6660', fontWeight: 600 }
const menuItem: React.CSSProperties = { display: 'block', width: '100%', textAlign: 'start', background: 'none', border: 'none', padding: '10px 14px', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit', color: '#14231E', borderBottom: '1px solid #F4F1E8' }
