'use client'

/* ============================================================================
   /crm — شاشة الموظف على الموبايل: كلّم · فرّغ · التاسكات تتوزّع لوحدها
   ============================================================================
   🎯 محمد (٢١ أغسطس ٢٠٢٦):
     «قولي هنوزّع الأرقام إزاي، وإزاي موظفين مضمونة هيتصلوا من الأبليكيشن،
      وإزاي هنفرّغ المكالمة ونبدأ ندي تعليمات وتاسكات … وأهم حاجة قولي
      هنشغّل النظام ده إزاي من الموبايل»

   الصفحة دي هي الرد. مفتوحة على `madmonacairo.com/crm` من متصفح الموبايل،
   والموظف يعمل «إضافة إلى الشاشة الرئيسية» فتبقى أيقونة زي أي أبليكيشن.

   الدورة كاملة في ٤ لمسات:
     ١) الشاشة بتفتح على **أرقامي أنا** بالترتيب (اللي ليه معاد فات الأول،
        وبعده اللي عمره ما اتكلّم معاه).
     ٢) لمسة على «اتصال» → التليفون بيرن (`tel:`)، أو «واتساب» → الشات بيفتح.
     ٣) بعد ما تقفل: «سجّل المكالمة» → تكتب أو **تقول بصوتك** اللي حصل.
     ٤) «المارد يفرّغ» → بيطلّع الملخّص والنتيجة والتاسكات، وأي تاسك تخصّه
        شخص تاني **بينزل عنده هو** أوتوماتيك.

   🎙️ (٢٢ أغسطس ٢٠٢٦) محمد: «عايز التطبيق بتاعنا هو اللي يسجّل حتى لو
      هيسجّل كلام الموظفين بتوعنا احنا بس» — اتعمل.
      الأبليكيشن دلوقتي **بيسجّل صوت حقيقي** بالمايك (MediaRecorder)،
      بيرفعه على bucket خاص `crm-calls`، وبيربطه بالمكالمة. التسجيل بيتسمع
      من ملف العميل في أي وقت.
      وفي نفس الوقت تفريغ الصوت المدمج في المتصفح بيمشي على التوازي فبنطلع
      **نص كمان** من غير أي تكلفة، والمارد بيشتغل على النص ده.

   ⚠️ **حدّ التقنية اللي مينفعش نلفّ حواليه**: أندرويد وiOS **بيقفلوا
      المايك على المتصفح طول ما فيه مكالمة تليفون شغّالة** — ده قفل من نظام
      التشغيل مش نقص عندنا. يعني التسجيل بيشتغل **بعد ما تقفل** (أو لو
      حطيت السماعة على مكبّر الصوت وسجّلت من جهاز تاني).
      التسجيل التلقائي للمكالمة نفسها بالصوتين محتاج **رقم مركزي
      (كول سنتر/VoIP)** والمكالمات كلها تعدّي منه — قرار لوحده.

   ⚠️ **الأرضي مالوش واتساب.** الأرقام اللي `phone_kind='landline'`
      (٢٦٤ رقم، أغلبهم مصانع) بيبان عليها زرار الاتصال بس.

   🧭 (٢٢ أغسطس ٢٠٢٦) الشاشة دي **جزء من «شغلي»**، مش بديل ليه.
      «شغلي» = `/account/work` (حضور · طلبات · مصاريف · تاسكات) — موجود من
      ٢٠ أغسطس. الصفحة دي هي قسم «مكالماتي» جوّاه، وبيتفتح من كارت هناك.
      أول نسخة سمّيتها «شغلي» كمان وده كان تصادم في الاسم — اتصلح.

   🔐 لازم تسجيل دخول بحساب مضمونة — الـRPC نفسها بترفض أي حد تاني.
   ============================================================================ */

import NotificationPrompt from '@/components/NotificationPrompt'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { MutableRefObject } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import BottomNav from '@/components/BottomNav'
import { sinceLabel, fmtDateTime } from '@/lib/arDateTime'
// 🗣️ اسكريبت البيع بتاع كل نشاط — بيغذّي زرار «واتساب» وورق الفريق المطبوع
import { waLink as waScriptLink, waAppLink, canPickWaApp, scriptFor, scriptText } from '@/lib/crmScripts'
import {
  Phone, MessageCircle, Loader2, RefreshCw, ListChecks, CheckCircle2,
  Mic, Sparkles, X, ChevronLeft, MapPin, CornerDownLeft, LogIn, AlertTriangle, Home, Users, Search,
  FileText, Tag, Package, Clock, Info, ClipboardCheck, Square, Trash2, PlayCircle,
} from 'lucide-react'

const C = {
  bg: '#F6F7F5', card: '#ffffff', ink: '#16241f', sub: '#5b6b64',
  green: '#059669', green2: '#2FA084', line: '#e7e9e5',
  danger: '#b3261e', warn: '#9a6b00', wa: '#25D366',
}

type Lead = {
  id: string; phone: string; phone_kind: string; name: string | null; city: string | null
  specialty: string | null; specialty_ar: string | null; status: string
  notes: string | null; source: string | null
  last_contact_at: string | null; next_action_at: string | null; calls: number
  owner?: string | null
}
type Task = {
  id: string; title: string; detail: string | null; priority: string; status: string
  due_at: string | null; specialty_ar: string | null
  route_reason: string | null; routed_from: string | null
  owner?: string | null
  contact_id: string | null; contact_phone: string | null; contact_name: string | null
}
type ListingRow = {
  id: string; title: string; slug: string; status: string; status_ar: string
  price: number | null; price_on_request: boolean
  city: string | null; district: string | null; category: string | null
  created_at: string; reason: string | null
}
type CallRow = {
  id: string; started_at: string; summary: string | null; transcript: string | null
  outcome: string | null; staff: string | null; channel: string
  audio_path: string | null; audio_seconds: number | null; transcript_source: string | null
}
type Detail = {
  ok: boolean; error?: string
  contact: Lead & {
    business: string | null; raw_category: string | null; specialty_src: string | null
    owner: string | null; business_city: string | null
  }
  listings: ListingRow[]
  calls: CallRow[]
  tasks: Task[]
  messages: { at: string; dir: string; body: string }[]
  activity: { bookings: number; orders: number; inquiries: number }
}
type TeamRow = {
  profile_id: string; name: string; receives: boolean
  mine: number; due: number; done: number
  calls: number; calls_today: number; open_tasks: number
}
type Queue = {
  ok: boolean; error?: string
  me: {
    id: string; name: string; is_dispatcher: boolean
    viewing: string; viewing_name: string | null
    specialties: { key: string; name_ar: string }[]
  } | null
  team: TeamRow[] | null
  counts: { mine: number; todo: number; due: number; never: number }
  open_tasks: number
  unassigned: number
  queue: Lead[]
  tasks: Task[]
}

/* شرايح فلترة سريعة في تاب المدير — المفاتيح من `crm_specialties`.
   ⚠️ دي عرض بس؛ الفلترة الحقيقية بتتعمل في الداتابيز باللي إنت باعته. */
const SPEC_CHIPS: { k: string; label: string }[] = [
  { k: 'properties', label: 'عقارات' },
  { k: 'vehicles', label: 'عربيات' },
  { k: 'food', label: 'مطاعم' },
  { k: 'medical', label: 'طبي' },
  { k: 'beauty', label: 'تجميل' },
  { k: 'factories', label: 'مصانع' },
  { k: 'marine', label: 'يخوت' },
  { k: '__none__', label: 'مش متصنّف' },
]

const STATUS_AR: Record<string, string> = {
  new: 'لسه جديد', contacted: 'اتكلّمنا', interested: 'مهتم',
  offer_sent: 'اتبعتله عرض', won: 'اتقفل', lost: 'ضاع', spam: 'سبام',
}
const OUTCOMES: { k: string; label: string }[] = [
  { k: 'interested', label: 'مهتم' },
  { k: 'offer_sent', label: 'بعتله عرض' },
  { k: 'no_answer', label: 'مردّش' },
  { k: 'contacted', label: 'اتكلّمنا' },
  { k: 'won', label: 'اتقفل ✅' },
  { k: 'not_interested', label: 'مش مهتم' },
]

/* 🗣️ (٢٣ أغسطس ٢٠٢٦ — محمد: «في زرار مكتوب عليه واتساب، هو ده اللي أنا
   عايز الاسكريبت يسمع فيه»)

   زرار «واتساب» كان بيفتح الشات **فاضي** — الموظف يبص للشاشة ويفكّر
   يكتب إيه، وكل واحد بيكتب حاجة مختلفة. دلوقتي بيفتح والرسالة مكتوبة
   حسب **نشاط الرقم ده بالذات** (عقارات غير عربيات غير مصانع)، بتنادي
   العميل باسمه وتوقّع باسم الموظف اللي فاتح الشاشة.

   الموظف يقدر يعدّل قبل ما يبعت — الرسالة بتفتح في خانة الكتابة مش
   بتتبعت لوحدها. ولو الرقم اتكلّمنا معاه قبل كده، يمسحها ويكتب متابعته.

   المحتوى في src/lib/crmScripts.ts — نفس المصدر اللي بيطبع ورق الفريق. */
const waLink = (l: { phone: string; specialty: string | null; name: string | null }, me: string | null) =>
  waScriptLink(l.phone, l.specialty, l.name, me)

/* 📋 (٢٣ أغسطس ٢٠٢٦ — محمد: «لسة زرار واتساب بيفتح الرسالة فاضية»)
   بننسخ الاسكريبت للكليبورد في نفس ضغطة الزرار. السبب: واتساب بيرمي
   الـtext في حالات كتير لما ويندوز/أندرويد يسلّم اللينك للتطبيق المثبّت
   بدل المتصفح — وساعتها الشات بيفتح فاضي والموظف واقف. النسخ بيضمن إنه
   بيلزق بضغطة مهما حصل.
   ⚠️ لازم يتنده جوّه الـonClick نفسه — الكليبورد مابيشتغلش من غير
      ضغطة مستخدم مباشرة. */
async function copyScript(l: { phone: string; specialty: string | null; name: string | null }, me: string | null) {
  const txt = scriptText(l.specialty, l.name, me)
  try {
    await navigator.clipboard.writeText(txt)
    return true
  } catch {
    // متصفحات قديمة / سياق مش آمن
    try {
      const ta = document.createElement('textarea')
      ta.value = txt
      ta.style.position = 'fixed'; ta.style.opacity = '0'
      document.body.appendChild(ta); ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
      return true
    } catch { return false }
  }
}

export default function CrmMobilePage() {
  const [q, setQ] = useState<Queue | null>(null)
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  /* 📋 رسالة «الاسكريبت اتنسخ» — بتبان تحت لما يدوس واتساب */
  const [copied, setCopied] = useState<null | boolean>(null)
  /* ⏱️ (٢٣ أغسطس ٢٠٢٦) المهلة كانت ٥ ثواني — والموظف بيكون وقتها راح
     لواتساب خلاص، فبيرجع مايلاقيش حاجة ويفتكر إن مفيش اسكريبت اتنسخ.
     ٣٠ ثانية عشان تفضل مستنياه لما يرجع. */
  const onCopied = useCallback((ok: boolean) => {
    setCopied(ok)
    setTimeout(() => setCopied(null), 30000)
  }, [])
  /* 📱 أندرويد بس هو اللي بيقدر يفتح تطبيق واتساب بعينه — بنقرا الـUA بعد
     ما الصفحة تركب عشان مايحصلش اختلاف بين السيرفر والمتصفح. */
  const [pickApp, setPickApp] = useState(false)
  useEffect(() => { setPickApp(canPickWaApp()) }, [])
  const [tab, setTab] = useState<'calls' | 'tasks' | 'team' | 'all'>('calls')
  /* 🧑‍💼 (٢٢ أغسطس) تاب «كل الأرقام» للمدير — محمد: «افتح لينا إحنا كمان
     الجدول، ممكن الأمور تكون محتاجة مدير يتواصل معاهم».
     المدير بيدوّر ويكلّم أي رقم حتى لو مش بتاعه، **والملكية مابتتغيّرش**. */
  const [allRows, setAllRows] = useState<Lead[]>([])
  const [allTotal, setAllTotal] = useState(0)
  const [allQ, setAllQ] = useState('')
  const [allSpec, setAllSpec] = useState('')
  const [allBusy, setAllBusy] = useState(false)
  /* 👥 الموزّع بيقدر يفتح قايمة أي حد في الفريق — للمتابعة وسماع مكالماته */
  const [viewAs, setViewAs] = useState<string | null>(null)

  // 📇 كارت المكالمة — بيفتح مع دوسة «اتصال» عشان الموظف يقرا وهو بيرن
  const [detail, setDetail] = useState<Detail | null>(null)
  const [detailFor, setDetailFor] = useState<Lead | null>(null)
  const [detailBusy, setDetailBusy] = useState(false)

  // شيت تسجيل المكالمة
  const [sheet, setSheet] = useState<Lead | null>(null)
  const [text, setText] = useState('')
  const [rec, setRec] = useState(false)
  // 🎙️ التسجيل الصوتي الحقيقي
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recSec, setRecSec] = useState(0)
  const [micErr, setMicErr] = useState<string | null>(null)
  const mediaRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ summary: string | null; tasks: { title: string; specialty: string | null }[]; routed: number } | null>(null)
  const recRef = useRef<{ stop: () => void } | null>(null)
  const startedAt = useRef<number | null>(null)

  const load = useCallback(async () => {
    setLoading(true); setErr(null)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) { setNeedLogin(true); setLoading(false); return }
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: Queue | null; error: { message: string } | null }>)('crm_my_queue', { p_limit: 60, p_as: viewAs })
      if (error) setErr(error.message)
      else if (data?.ok === false) setErr(data.error || 'مش مسموح')
      else setQ(data)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مقدرناش نحمّل') }
    setLoading(false)
  }, [viewAs])

  useEffect(() => { load() }, [load])

  const searchAll = useCallback(async () => {
    setAllBusy(true)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: { ok: boolean; total: number; rows: Lead[] } | null; error: unknown }>)(
        'crm_contacts_list',
        { p_q: allQ || null, p_specialty: allSpec || null, p_limit: 40, p_offset: 0 })
      if (data?.ok) { setAllRows(data.rows || []); setAllTotal(data.total || 0) }
    } catch (e) { setErr(e instanceof Error ? e.message : 'خطأ') }
    setAllBusy(false)
  }, [allQ, allSpec])

  useEffect(() => { if (tab === 'all' && allRows.length === 0 && !allBusy) searchAll() }, [tab])

  /* 🎙️ تفريغ الصوت المدمج في المتصفح — كروم أندرويد وسفاري.
     مش موجود في كل المتصفحات، فالزرار بيختفي لو مش مدعوم. */
  const speechOk = typeof window !== 'undefined' &&
    !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
       (window as unknown as Record<string, unknown>).webkitSpeechRecognition)

  /* 🎙️ تسجيل حقيقي بالمايك + تفريغ المتصفح في نفس الوقت.
     الاتنين مع بعض عن قصد: الصوت هو الدليل، والنص هو اللي المارد بيشتغل عليه. */
  async function toggleMic() {
    if (rec) {
      try { recRef.current?.stop() } catch { /* — */ }
      try { mediaRef.current?.stop() } catch { /* — */ }
      if (tickRef.current) { clearInterval(tickRef.current); tickRef.current = null }
      setRec(false)
      return
    }
    setMicErr(null)
    // ١) الصوت
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find(m => typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(m))
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      chunksRef.current = []
      mr.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      mr.onstop = () => {
        stream.getTracks().forEach(t => t.stop())
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || 'audio/webm' })
        if (blob.size > 0) {
          setAudioBlob(blob)
          setAudioUrl(u => { if (u) URL.revokeObjectURL(u); return URL.createObjectURL(blob) })
        }
      }
      mr.start()
      mediaRef.current = mr
      setRecSec(0)
      tickRef.current = setInterval(() => setRecSec(v => v + 1), 1000)
    } catch {
      // ⚠️ ده اللي بيحصل لو المكالمة لسه شغّالة: نظام التشغيل ماسك المايك.
      setMicErr('مقدرناش نفتح المايك. لو المكالمة لسه شغّالة اقفلها الأول — الموبايل بيقفل المايك على المتصفح وقت المكالمة. أو اسمح للموقع بالمايك من إعدادات المتصفح.')
      return
    }
    // ٢) التفريغ (لو المتصفح بيدعمه) — مش شرط ينجح عشان الصوت يتسجّل
    startSpeech()
    setRec(true)
  }

  function startSpeech() {
    const W = window as unknown as Record<string, unknown>
    const Ctor = (W.SpeechRecognition || W.webkitSpeechRecognition) as (new () => {
      lang: string; continuous: boolean; interimResults: boolean
      onresult: (e: { resultIndex: number; results: { isFinal: boolean; 0: { transcript: string } }[] }) => void
      onend: () => void; start: () => void; stop: () => void
    }) | undefined
    if (!Ctor) return
    const r = new Ctor()
    r.lang = 'ar-EG'; r.continuous = true; r.interimResults = false
    r.onresult = (e) => {
      let add = ''
      for (let i = e.resultIndex; i < e.results.length; i++) {
        if (e.results[i].isFinal) add += e.results[i][0].transcript + ' '
      }
      if (add) setText(t => (t ? t + ' ' : '') + add.trim())
    }
    // ⚠️ مابنطفّيش التسجيل لو التفريغ وقف — الصوت أهم
    r.onend = () => { /* الصوت لسه بيتسجّل */ }
    try { r.start(); recRef.current = r } catch { /* التفريغ اختياري — الصوت هو الأساس */ }
  }

  const mmss = (n: number) => `${String(Math.floor(n / 60)).padStart(2, '0')}:${String(n % 60).padStart(2, '0')}`

  function clearAudio() {
    setAudioBlob(null)
    setAudioUrl(u => { if (u) URL.revokeObjectURL(u); return null })
    setRecSec(0)
  }

  /* بيتنادى مع «اتصال» و«التفاصيل» — التليفون بيرن والكارت بيفتح ورا،
     فلما الموظف يرجع من المكالمة يلاقي كل حاجة قدامه وزرار «سجّل». */
  async function openDetail(l: Lead) {
    setDetailFor(l); setDetail(null); setDetailBusy(true)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        f: string, a: Record<string, unknown>,
      ) => Promise<{ data: Detail | null; error: unknown }>)('crm_contact_detail', { p_contact: l.id })
      if (data?.ok) setDetail(data)
      else setErr(data?.error || 'مقدرناش نفتح الملف')
    } catch (e) { setErr(e instanceof Error ? e.message : 'خطأ') }
    setDetailBusy(false)
  }

  function openSheet(l: Lead) {
    setSheet(l); setText(''); setResult(null); setMicErr(null); clearAudio()
  }

  /* ⬆️ رفع التسجيل على bucket `crm-calls` (خاص، موظفين مضمونة بس).
     المسار: <contact-id>/<timestamp>.<ext> — عشان يفضل مربوط بالعميل حتى
     لو المكالمة نفسها اتمسحت. */
  async function uploadAudio(contactId: string): Promise<string | null> {
    if (!audioBlob) return null
    const type = audioBlob.type || 'audio/webm'
    const ext = type.includes('mp4') ? 'm4a' : type.includes('ogg') ? 'ogg' : 'webm'
    const path = `${contactId}/${Date.now()}.${ext}`
    const { error } = await supabaseBrowser.storage.from('crm-calls')
      .upload(path, audioBlob, { contentType: type, upsert: false })
    if (error) { setErr(`التسجيل ماترفعش: ${error.message}`); return null }
    return path
  }

  async function submit(outcomeFallback?: string) {
    if (!sheet) return
    setSending(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const token = session?.access_token
      if (!token) { setNeedLogin(true); return }
      const dur = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : null
      // الصوت الأول — لو الرفع وقع بنكمّل التسجيل من غيره بدل ما نضيّع المكالمة
      const audioPath = await uploadAudio(sheet.id)
      const res = await fetch('/api/crm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contactId: sheet.id, transcript: text.trim(),
          durationSec: dur, channel: 'phone', direction: 'outbound',
          skipMarid: !text.trim(), outcome: outcomeFallback,
          summary: !text.trim() ? (OUTCOMES.find(o => o.k === outcomeFallback)?.label || null) : undefined,
          audioPath, audioSeconds: audioBlob ? recSec : null,
          transcriptSource: text.trim() ? (audioBlob ? 'speech' : 'typed') : null,
        }),
      })
      const j = await res.json()
      if (!j.ok) { setErr(j.error || 'مقدرناش نسجّل'); setSending(false); return }
      setResult({
        summary: j.summary, routed: j.tasks_routed || 0,
        tasks: (j.tasks || []).map((t: { title: string; specialty: string | null }) => ({ title: t.title, specialty: t.specialty })),
      })
      await load()
    } catch (e) { setErr(e instanceof Error ? e.message : 'خطأ') }
    setSending(false)
  }

  async function closeTask(id: string) {
    try {
      await (supabaseBrowser.rpc as unknown as (f: string, a: Record<string, unknown>) => Promise<unknown>)(
        'crm_task_update', { p_task: id, p_status: 'done' })
      await load()
    } catch { /* — */ }
  }

  const btn = (kind: 'primary' | 'wa' | 'ghost' = 'ghost'): React.CSSProperties => ({
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
    padding: '11px 14px', borderRadius: 14, fontSize: 14, fontWeight: 800, cursor: 'pointer',
    border: `1px solid ${kind === 'primary' ? C.green : kind === 'wa' ? C.wa : C.line}`,
    background: kind === 'primary' ? C.green : kind === 'wa' ? C.wa : '#fff',
    color: kind === 'ghost' ? C.ink : '#fff', textDecoration: 'none', flex: 1,
    minHeight: 46,
  })
  const card: React.CSSProperties = {
    background: C.card, border: `1px solid ${C.line}`, borderRadius: 18, padding: 14, marginBottom: 10,
  }

  if (needLogin) {
    return (
      <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, fontFamily: 'Cairo, system-ui, sans-serif' }}>
        <div style={{ ...card, textAlign: 'center', maxWidth: 340 }}>
          <LogIn style={{ width: 30, height: 30, color: C.green, margin: '0 auto 10px' }} />
          <h1 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 6px' }}>شغلك في مضمونة</h1>
          <p style={{ fontSize: 13, color: C.sub, margin: '0 0 16px' }}>سجّل دخولك بحسابك عشان تشوف أرقامك وتاسكاتك.</p>
          <Link href="/auth/login?redirect=/crm" style={{ ...btn('primary'), width: '100%' }}>دخول</Link>
        </div>
      </div>
    )
  }

  return (
    <div dir="rtl" style={{ minHeight: '100dvh', background: C.bg, color: C.ink, fontFamily: 'Cairo, system-ui, sans-serif', paddingBottom: 90 }}>
      {/* هيدر */}
      <header style={{ position: 'sticky', top: 0, zIndex: 30, background: 'rgba(255,255,255,.92)', backdropFilter: 'blur(10px)', borderBottom: `1px solid ${C.line}` }}>
        <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* الرجوع لـ«شغلي» — دي القسم بتاعه مش شاشة لوحدها */}
          <Link href="/account/work" aria-label="شغلي" style={{ ...btn(), flex: '0 0 auto', padding: 10, minHeight: 40 }}>
            <Home style={{ width: 16, height: 16 }} />
          </Link>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>
              {viewAs && q?.me?.viewing_name ? `مكالمات ${q.me.viewing_name}` : 'مكالماتي'}
            </div>
            <div style={{ fontSize: 11.5, color: C.sub }}>
              {q?.me?.is_dispatcher && !viewAs
                ? 'إنت موزّع — الأرقام بتتوزّع على الفريق مش عليك'
                : (q?.me?.specialties?.length
                    ? q.me.specialties.map(s => s.name_ar).join(' · ')
                    : 'لسه مفيش تخصص متحدّد')}
            </div>
          </div>
          {viewAs && (
            <button onClick={() => setViewAs(null)} style={{ ...btn(), flex: '0 0 auto', padding: 10, minHeight: 40 }}>
              <X style={{ width: 16, height: 16 }} />
            </button>
          )}
          <button onClick={load} disabled={loading} style={{ ...btn(), flex: '0 0 auto', padding: 10, minHeight: 40 }}>
            <RefreshCw style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ display: 'flex', borderTop: `1px solid ${C.line}` }}>
          {([
            ['calls', `مكالمات (${q?.counts?.todo ?? 0})`],
            ['tasks', `تاسكات (${q?.open_tasks ?? 0})`],
            ...(q?.me?.is_dispatcher
              ? [['team', 'الفريق'] as const, ['all', 'كل الأرقام'] as const]
              : []),
          ] as const).map(([k, label]) => (
            <button key={k} onClick={() => setTab(k)}
              style={{
                flex: 1, padding: '11px 0', border: 0, background: 'transparent', cursor: 'pointer',
                fontSize: 13.5, fontWeight: 800, fontFamily: 'inherit',
                color: tab === k ? C.green : C.sub,
                borderBottom: `2px solid ${tab === k ? C.green : 'transparent'}`,
              }}>{label}</button>
          ))}
        </div>
      </header>

      <main style={{ padding: 12 }}>
        {err && (
          <div style={{ ...card, borderColor: C.danger, color: C.danger, fontSize: 13, fontWeight: 700, display: 'flex', gap: 8 }}>
            <AlertTriangle style={{ width: 16, height: 16, flexShrink: 0 }} />{err}
          </div>
        )}

        {loading && !q && (
          <div style={{ textAlign: 'center', padding: 40 }}>
            <Loader2 style={{ width: 24, height: 24, color: C.green }} className="animate-spin" />
          </div>
        )}

        {/* ــــــ المكالمات ــــــ */}
        {tab === 'calls' && q && (
          <>
            {q.counts.due > 0 && (
              <div style={{ ...card, background: '#fffbf0', borderColor: '#e6c25a', padding: '10px 12px', fontSize: 13, fontWeight: 700, color: C.warn }}>
                فيه {q.counts.due} عميل معادهم النهاردة أو فات
              </div>
            )}
            {q.queue.length === 0 && (
              /* 🐞 (٢٢ أغسطس ٢٠٢٦) الرسالة القديمة كانت بتقول «التوزيع لسه ماتعملش»
                 حتى لو كان اتعمل — ودي كانت بتخلّي الموزّع يفتكر إن الشاشة مش
                 مربوطة. دلوقتي بتقول السبب الحقيقي. */
              <div style={{ ...card, padding: 20, fontSize: 13.5, lineHeight: 1.9 }}>
                {q.me?.is_dispatcher && !viewAs ? (
                  <>
                    <b style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>إنت موزّع — مش مستقبِل</b>
                    <span style={{ color: C.sub }}>
                      الأرقام بتتوزّع على الفريق مش عليك، فطبيعي التاب ده يبقى فاضي.
                      {q.team && ` الفريق ماسك دلوقتي ${q.team.reduce((a, t) => a + t.mine, 0).toLocaleString('ar-EG')} رقم.`}
                    </span>
                    <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                      <button onClick={() => setTab('team')} style={{ ...btn('primary'), flex: '1 1 140px' }}>
                        <Users style={{ width: 15, height: 15 }} /> شوف شغل الفريق
                      </button>
                      <Link href="/admin/crm" style={{ ...btn(), flex: '1 1 140px' }}>شاشة التوزيع</Link>
                    </div>
                  </>
                ) : (
                  <>
                    <b style={{ fontSize: 15, display: 'block', marginBottom: 6 }}>مفيش أرقام متوزّعة عليك</b>
                    <span style={{ color: C.sub }}>
                      {q.unassigned > 0
                        ? `فيه ${q.unassigned.toLocaleString('ar-EG')} رقم لسه ملهمش صاحب — كلّم أحمد سامي يوزّعهم.`
                        : 'كل الأرقام متوزّعة على زمايلك. لو المفروض ياخد نصيب، كلّم أحمد سامي.'}
                    </span>
                  </>
                )}
              </div>
            )}
            {q.queue.map(l => (
              <LeadCard key={l.id} l={l} onOpen={openDetail} onLog={openSheet}
                card={card} btn={btn} C={C} startedAt={startedAt} me={q.me?.name ?? null} onCopied={onCopied} pickApp={pickApp} />
            ))}
          </>
        )}

        {/* ــــــ 🧑‍💼 كل الأرقام (للمدير) ــــــ
             محمد: «افتح لينا إحنا كمان الجدول — ممكن الأمور تكون محتاجة مدير
             يتواصل معاهم». المدير بيوصل لأي رقم، بيكلّم، وبيسجّل —
             **والرقم يفضل مع صاحبه**، المكالمة بس بتتوسم «من المدير». */}
        {tab === 'all' && q?.me?.is_dispatcher && (
          <>
            <div style={{ ...card, padding: 12 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, border: `1px solid ${C.line}`,
                  borderRadius: 12, padding: '8px 10px', flex: 1 }}>
                  <Search style={{ width: 15, height: 15, color: C.sub }} />
                  <input value={allQ} onChange={e => setAllQ(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') searchAll() }}
                    placeholder="رقم · اسم · منطقة"
                    style={{ border: 0, outline: 0, flex: 1, fontSize: 14, background: 'transparent', fontFamily: 'inherit', minWidth: 0 }} />
                </div>
                <button onClick={searchAll} disabled={allBusy} style={{ ...btn('primary'), flex: '0 0 auto', paddingInline: 16 }}>
                  {allBusy ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : 'دوّر'}
                </button>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                <button onClick={() => { setAllSpec(''); setTimeout(searchAll, 0) }}
                  style={{ ...btn(), flex: '0 0 auto', padding: '6px 12px', fontSize: 12, minHeight: 34,
                    background: allSpec === '' ? C.green : '#fff', color: allSpec === '' ? '#fff' : C.ink,
                    borderColor: allSpec === '' ? C.green : C.line }}>الكل</button>
                {(q.me?.specialties || []).length === 0 && null}
                {SPEC_CHIPS.map(sc => (
                  <button key={sc.k} onClick={() => { setAllSpec(sc.k); setTimeout(searchAll, 0) }}
                    style={{ ...btn(), flex: '0 0 auto', padding: '6px 12px', fontSize: 12, minHeight: 34,
                      background: allSpec === sc.k ? C.green : '#fff', color: allSpec === sc.k ? '#fff' : C.ink,
                      borderColor: allSpec === sc.k ? C.green : C.line }}>{sc.label}</button>
                ))}
              </div>
              <div style={{ fontSize: 11.5, color: C.sub, marginTop: 8 }}>
                {allTotal > 0 ? `${allTotal.toLocaleString('ar-EG')} رقم · بيبان أول ٤٠` : 'اكتب واضغط دوّر'}
              </div>
            </div>

            {allRows.map(l => <LeadCard key={l.id} l={l} showOwner onOpen={openDetail} onLog={openSheet}
              card={card} btn={btn} C={C} startedAt={startedAt} me={q?.me?.name ?? null} onCopied={onCopied} pickApp={pickApp} />)}

            {allRows.length === 0 && !allBusy && (
              <div style={{ ...card, textAlign: 'center', color: C.sub, padding: 26, fontSize: 13.5 }}>
                مفيش نتايج — جرّب رقم أو اسم تاني.
              </div>
            )}
          </>
        )}

        {/* ــــــ 👥 الفريق (للموزّع) ــــــ
             محمد: «أحمد سامي هو اللي هيوزّع» — فالموزّع لازم يشوف شغل الكل
             من موبايله، ويقدر يفتح قايمة أي حد ويسمع مكالماته. */}
        {tab === 'team' && q?.team && (
          <>
            <div style={{ ...card, padding: '10px 12px', fontSize: 12.5, color: C.sub, lineHeight: 1.8 }}>
              دوس على أي حد تشوف أرقامه ومكالماته.
              {q.unassigned > 0 && (
                <b style={{ color: C.warn, display: 'block', marginTop: 4 }}>
                  فيه {q.unassigned.toLocaleString('ar-EG')} رقم لسه ملهمش صاحب
                </b>
              )}
            </div>
            {q.team.map(t => (
              <button key={t.profile_id} onClick={() => { setViewAs(t.profile_id); setTab('calls') }}
                style={{ ...card, width: '100%', textAlign: 'right', cursor: 'pointer', fontFamily: 'inherit',
                  display: 'block', border: `1px solid ${C.line}`, opacity: t.receives ? 1 : 0.7 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <b style={{ fontSize: 14.5, flex: 1 }}>{t.name}</b>
                  {!t.receives && (
                    <span style={{ fontSize: 10, background: '#eef2ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>
                      موزّع
                    </span>
                  )}
                  <ChevronLeft style={{ width: 16, height: 16, color: C.sub }} />
                </div>
                <div style={{ display: 'flex', gap: 14, marginTop: 8, fontSize: 12, color: C.sub, flexWrap: 'wrap' }}>
                  <span><b style={{ color: C.ink, fontSize: 14 }}>{t.mine.toLocaleString('ar-EG')}</b> رقم</span>
                  <span><b style={{ color: t.due > 0 ? C.warn : C.ink, fontSize: 14 }}>{t.due.toLocaleString('ar-EG')}</b> مستنّي</span>
                  <span><b style={{ color: C.green, fontSize: 14 }}>{t.calls_today}</b> مكالمة النهاردة</span>
                  <span><b style={{ color: C.ink, fontSize: 14 }}>{t.calls}</b> إجمالي</span>
                  {t.open_tasks > 0 && <span><b style={{ color: C.ink, fontSize: 14 }}>{t.open_tasks}</b> تاسك</span>}
                </div>
              </button>
            ))}
          </>
        )}

        {/* ــــــ التاسكات ــــــ */}
        {tab === 'tasks' && q && (
          <>
            {q.tasks.length === 0 && (
              <div style={{ ...card, textAlign: 'center', color: C.sub, padding: 30, fontSize: 13.5 }}>
                <ListChecks style={{ width: 26, height: 26, color: C.line, margin: '0 auto 8px', display: 'block' }} />
                مفيش تاسكات مفتوحة عليك.
              </div>
            )}
            {q.tasks.map(t => (
              <div key={t.id} style={card}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <b style={{ fontSize: 14.5, flex: 1 }}>{t.title}</b>
                  {t.priority === 'high' && <span style={{ fontSize: 10.5, background: '#fdecea', color: C.danger, padding: '2px 8px', borderRadius: 999, fontWeight: 800 }}>عاجل</span>}
                </div>
                {t.detail && <p style={{ fontSize: 12.5, color: C.sub, margin: '6px 0 0', lineHeight: 1.7 }}>{t.detail}</p>}
                {t.route_reason && (
                  <div style={{ marginTop: 8, fontSize: 12, background: '#eef7f3', border: `1px solid ${C.green2}`, color: C.green, borderRadius: 10, padding: '6px 10px', display: 'flex', gap: 6 }}>
                    <CornerDownLeft style={{ width: 13, height: 13, flexShrink: 0, marginTop: 2 }} />
                    <span>{t.route_reason}{t.routed_from ? ` — من ${t.routed_from}` : ''}</span>
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {t.contact_phone && (
                    <a href={`tel:${t.contact_phone}`} style={btn('primary')}>
                      <Phone style={{ width: 15, height: 15 }} /> {t.contact_name || t.contact_phone}
                    </a>
                  )}
                  <button onClick={() => closeTask(t.id)} style={{ ...btn(), flex: '0 0 auto', paddingInline: 14 }}>
                    <CheckCircle2 style={{ width: 15, height: 15 }} /> خلص
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </main>

      {/* ــــــ 📇 كارت المكالمة: مين ده، وعنده إيه ــــــ
           محمد: «هل تفاصيل الإعلان أو الشخص بيظهر للموظف لما بيدوس اتصال؟» */}
      {detailFor && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => { setDetailFor(null); setDetail(null) }}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', width: '100%', borderRadius: '22px 22px 0 0', maxHeight: '92dvh', display: 'flex', flexDirection: 'column' }}>

            {/* هيدر ثابت */}
            <div style={{ padding: '14px 16px 10px', borderBottom: `1px solid ${C.line}`, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 900, lineHeight: 1.4 }}>
                  {detail?.contact?.name || detailFor.name || detailFor.phone}
                </div>
                <div style={{ fontSize: 12, color: C.sub, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ direction: 'ltr' }}>{detailFor.phone}</span>
                  {detailFor.phone_kind === 'landline' && <span style={{ color: C.warn, fontWeight: 700 }}>أرضي</span>}
                  {(detail?.contact?.city || detailFor.city) &&
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
                      <MapPin style={{ width: 11, height: 11 }} />{detail?.contact?.city || detailFor.city}
                    </span>}
                  {detailFor.specialty_ar && <span style={{ background: '#eef7f3', color: C.green, padding: '1px 8px', borderRadius: 999, fontWeight: 700 }}>{detailFor.specialty_ar}</span>}
                </div>
              </div>
              <button onClick={() => { setDetailFor(null); setDetail(null) }} style={{ ...btn(), flex: '0 0 auto', padding: 9, minHeight: 38 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {/* المحتوى */}
            <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
              {/* 🗣️ (٢٣ أغسطس ٢٠٢٦ — محمد: «لسة إرسال الواتساب مش بيحضّر
                  الاسكريبت في التاب اللي جمب اتصال»)

                  اتأكدنا إن الكود الحي بيولّد اللينك بالنص صح — بس **واتساب
                  ديسكتوب على ويندوز بيتجاهل النص المجهّز** في اللينك، وده
                  خارج إيدينا تمامًا. وكنا بننسخه للكليبورد ونعرض رسالة، بس
                  الرسالة بتختفي بعد ثواني والموظف يكون وقتها في واتساب —
                  فعمره ما شافها.

                  الحل اللي مايعتمدش على واتساب خالص: الاسكريبت **مكتوب
                  قدامه هنا** في الملف، بزرار نسخ صريح. يقرا، ينسخ، يفتح
                  واتساب، يلزق. مفيش تخمين ومفيش حاجة بتضيع في السكة. */}
              <div style={{ border: `1px solid ${C.line}`, borderRadius: 14, overflow: 'hidden', marginBottom: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: '#f4f8f6', borderBottom: `1px solid ${C.line}` }}>
                  <Sparkles style={{ width: 15, height: 15, color: C.green }} />
                  <b style={{ fontSize: 13 }}>الاسكريبت الجاهز — {scriptFor(detailFor.specialty).label}</b>
                  <button
                    onClick={async () => {
                      const ok = await copyScript(detailFor, q?.me?.name ?? null)
                      onCopied(ok)
                    }}
                    style={{ ...btn('primary'), marginRight: 'auto', flex: '0 0 auto', padding: '6px 12px', fontSize: 12, minHeight: 32 }}>
                    <ClipboardCheck style={{ width: 14, height: 14 }} /> انسخ
                  </button>
                </div>
                <div style={{ padding: '11px 13px', fontSize: 12.5, lineHeight: 1.85, whiteSpace: 'pre-wrap', color: C.ink }}>
                  {scriptText(detailFor.specialty, detail?.contact?.name || detailFor.name, q?.me?.name ?? null)}
                </div>
                <div style={{ padding: '0 13px 11px', fontSize: 11, color: C.sub, lineHeight: 1.7 }}>
                  دوس «انسخ» وبعدها «واتساب» تحت والزق. عدّل فيه زي ما تحب قبل ما تبعت.
                </div>
              </div>

              {detailBusy && !detail && (
                <div style={{ textAlign: 'center', padding: 30 }}>
                  <Loader2 style={{ width: 22, height: 22, color: C.green }} className="animate-spin" />
                </div>
              )}

              {detail && (
                <>
                  {/* إعلاناته عندنا */}
                  {detail.listings.length > 0 && (
                    <Section icon={<Package style={{ width: 15, height: 15 }} />} title={`إعلاناته عندنا (${detail.listings.length})`}>
                      {detail.listings.map(l => (
                        <a key={l.id} href={`/marketplace/${l.slug}`} target="_blank" rel="noreferrer"
                          style={{ display: 'block', border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, marginBottom: 7, textDecoration: 'none', color: C.ink }}>
                          <div style={{ fontSize: 13.5, fontWeight: 700, lineHeight: 1.5 }}>{l.title}</div>
                          <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                            <span style={{
                              fontWeight: 700,
                              color: l.status === 'published' ? C.green : l.status === 'rejected' ? C.danger : C.warn,
                            }}>{l.status_ar}</span>
                            {l.category && <span><Tag style={{ width: 10, height: 10, display: 'inline' }} /> {l.category}</span>}
                            {l.price != null && <span>{Number(l.price).toLocaleString('ar-EG')} ج</span>}
                            {l.price_on_request && <span>السعر عند الطلب</span>}
                            {(l.district || l.city) && <span>{[l.district, l.city].filter(Boolean).join(' · ')}</span>}
                          </div>
                          {l.reason && <div style={{ fontSize: 11.5, color: C.warn, marginTop: 4 }}>السبب: {l.reason}</div>}
                        </a>
                      ))}
                    </Section>
                  )}

                  {/* آخر رسالة منه — أهم سطر قبل ما يتكلّم */}
                  {(() => {
                    const inb = detail.messages.find(m => m.dir === 'inbound')
                    if (!inb) return null
                    return (
                      <Section icon={<MessageCircle style={{ width: 15, height: 15 }} />} title="آخر رسالة منه">
                        <div style={{ background: '#f4f6f4', border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, fontSize: 13, lineHeight: 1.8 }}>
                          {inb.body}
                          <div style={{ fontSize: 10.5, color: C.sub, marginTop: 5 }}>{fmtDateTime(inb.at)}</div>
                        </div>
                      </Section>
                    )
                  })()}

                  {/* المكالمات السابقة + تسجيلاتها */}
                  {detail.calls.length > 0 && (
                    <Section icon={<Phone style={{ width: 15, height: 15 }} />} title={`المكالمات (${detail.calls.length})`}>
                      {detail.calls.slice(0, 5).map(k => (
                        <div key={k.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, marginBottom: 7 }}>
                          <div style={{ fontSize: 11.5, color: C.sub, marginBottom: 4 }}>
                            {fmtDateTime(k.started_at)} · {k.staff || '—'}
                            {k.audio_seconds ? ` · ${Math.floor(k.audio_seconds / 60)}:${String(k.audio_seconds % 60).padStart(2, '0')}` : ''}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700 }}>{k.summary || '—'}</div>
                          {k.audio_path && <AudioPlayer path={k.audio_path} />}
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* التاسكات المفتوحة */}
                  {detail.tasks.filter(t => t.status !== 'done').length > 0 && (
                    <Section icon={<ListChecks style={{ width: 15, height: 15 }} />} title="مطلوب معاه">
                      {detail.tasks.filter(t => t.status !== 'done').map(t => (
                        <div key={t.id} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 9, marginBottom: 6, fontSize: 13 }}>
                          <b>{t.title}</b>
                          {t.owner && <span style={{ fontSize: 11, color: C.sub, marginRight: 6 }}>({t.owner})</span>}
                        </div>
                      ))}
                    </Section>
                  )}

                  {/* الملاحظة اللي جت مع الرقم */}
                  {detail.contact.notes && (
                    <Section icon={<Info style={{ width: 15, height: 15 }} />} title="ملاحظات على الرقم">
                      <div style={{ fontSize: 13, color: C.sub, lineHeight: 1.8 }}>{detail.contact.notes}</div>
                    </Section>
                  )}

                  {/* من فين جه الرقم + نشاطه */}
                  <Section icon={<Clock style={{ width: 15, height: 15 }} />} title="خلفية">
                    <div style={{ fontSize: 12, color: C.sub, lineHeight: 2 }}>
                      <div>الحالة: <b style={{ color: C.ink }}>{STATUS_AR[detail.contact.status] || detail.contact.status}</b></div>
                      {detail.contact.business && <div>البيزنس: <b style={{ color: C.ink }}>{detail.contact.business}</b></div>}
                      {detail.contact.raw_category && <div>تصنيفه الأصلي: {detail.contact.raw_category}</div>}
                      {detail.contact.source && <div>مصدر الرقم: {detail.contact.source}</div>}
                      {detail.contact.last_contact_at && <div>آخر تواصل: {sinceLabel(detail.contact.last_contact_at)}</div>}
                      {(detail.activity.bookings + detail.activity.orders + detail.activity.inquiries) > 0 && (
                        <div>
                          نشاطه: {detail.activity.bookings} حجز · {detail.activity.orders} طلب · {detail.activity.inquiries} استفسار
                        </div>
                      )}
                      {detail.listings.length === 0 && detail.messages.length === 0 && (
                        <div style={{ color: C.warn, fontWeight: 700 }}>
                          مفيش عندنا عنه غير الرقم — المكالمة دي هي اللي هتعرّفنا هو مين.
                        </div>
                      )}
                    </div>
                  </Section>
                </>
              )}
            </div>

            {/* أزرار ثابتة تحت */}
            <div style={{ borderTop: `1px solid ${C.line}`, padding: 12, display: 'flex', gap: 8,
              paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}>
              <a href={`tel:${detailFor.phone}`} onClick={() => { startedAt.current = Date.now() }} style={btn('primary')}>
                <Phone style={{ width: 16, height: 16 }} /> اتصال
              </a>
              {/* 📱 نفس اختيار التطبيق بتاع كارت الرقم — أندرويد بيحدّد، غيره لأ */}
              {detailFor.phone_kind !== 'landline' && (pickApp ? (
                <>
                  <a href={waAppLink('normal', detailFor.phone, detailFor.specialty, detail?.contact?.name || detailFor.name, q?.me?.name ?? null)}
                     onClick={() => { copyScript(detailFor, q?.me?.name ?? null).then(onCopied) }}
                     style={{ ...btn('wa'), paddingInline: 10 }} title="واتساب العادي">
                    <MessageCircle style={{ width: 15, height: 15 }} /> عادي
                  </a>
                  <a href={waAppLink('business', detailFor.phone, detailFor.specialty, detail?.contact?.name || detailFor.name, q?.me?.name ?? null)}
                     onClick={() => { copyScript(detailFor, q?.me?.name ?? null).then(onCopied) }}
                     style={{ ...btn('wa'), background: '#0B7A5C', borderColor: '#0B7A5C', paddingInline: 10 }} title="واتساب بيزنس">
                    <MessageCircle style={{ width: 15, height: 15 }} /> بيزنس
                  </a>
                </>
              ) : (
                <a href={waLink(detailFor, q?.me?.name ?? null)} target="_blank" rel="noreferrer" style={btn('wa')}
                   onClick={() => { copyScript(detailFor, q?.me?.name ?? null).then(onCopied) }}
                   title={`اسكريبت ${scriptFor(detailFor.specialty).label} — جاهز في الشات ومتنسخ كمان`}>
                  <MessageCircle style={{ width: 16, height: 16 }} /> واتساب
                </a>
              ))}
              {/* 🗒️ (٢٢ أغسطس ٢٠٢٦ — محمد: «طيب إيه موضوع سجّل ده؟»)
                  «سجّل» لوحدها ماكانتش بتقول إيه اللي هيتسجّل. الاسم بقى
                  بيقول الشغلانة نفسها: «خلّصت؟ سجّل». */}
              <button onClick={() => { const l = detailFor; setDetailFor(null); setDetail(null); if (l) openSheet(l) }}
                style={{ ...btn(), flex: '0 0 auto', paddingInline: 14, whiteSpace: 'nowrap' }}>
                <ClipboardCheck style={{ width: 15, height: 15 }} /> خلّصت؟ سجّل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ــــــ شيت تسجيل المكالمة ــــــ */}
      {sheet && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'flex-end' }}
          onClick={() => !sending && setSheet(null)}>
          <div onClick={e => e.stopPropagation()}
            style={{ background: '#fff', width: '100%', borderRadius: '22px 22px 0 0', padding: 16, maxHeight: '92dvh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 900 }}>{sheet.name || sheet.phone}</div>
                <div style={{ fontSize: 12, color: C.sub, direction: 'ltr', textAlign: 'right' }}>{sheet.phone}</div>
              </div>
              <button onClick={() => setSheet(null)} style={{ ...btn(), flex: '0 0 auto', padding: 9, minHeight: 38 }}>
                <X style={{ width: 16, height: 16 }} />
              </button>
            </div>

            {!result ? (
              <>
                <div style={{ background: '#eef7f3', border: `1px solid ${C.green2}`, borderRadius: 12, padding: 10, marginBottom: 10 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 800, color: C.green, marginBottom: 4 }}>
                    ده مش تسجيل صوت — ده «قول اللي حصل»
                  </div>
                  <p style={{ fontSize: 12, color: C.sub, margin: 0, lineHeight: 1.8 }}>
                    بعد ما تقفل المكالمة، قول أو اكتب اللي حصل بلغتك العادية.
                    المارد بيطلّع منها <b>ملخّص المكالمة</b> و<b>نتيجتها</b> و<b>معاد المتابعة</b>
                    و<b>التاسكات</b> — وأي حاجة ظهرت وبتخصّ زميل تاني، التاسك بينزل عنده هو.
                    <br />
                    من غير الخطوة دي، المكالمة مش موجودة عندنا: مفيش سجل، ومفيش متابعة.
                  </p>
                </div>
                <textarea rows={5} value={text} onChange={e => setText(e.target.value)}
                  placeholder="مثال: العميل عايز شقة ١٢٠ متر في سموحة بحدود ٢.٥ مليون، وقال إن عنده عربية مستعملة عايز يعرضها. قال نكلّمه الأسبوع الجاي."
                  style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7 }} />

                {/* 🎙️ التسجيل الحقيقي */}
                <div style={{ marginTop: 10, border: `1px solid ${rec ? C.danger : C.line}`, borderRadius: 14, padding: 12, background: rec ? '#fdf3f2' : '#fafbfa' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button onClick={toggleMic}
                      style={{ ...btn(), flex: '0 0 auto', width: 52, height: 52, borderRadius: 999, padding: 0,
                        background: rec ? C.danger : C.green, borderColor: rec ? C.danger : C.green, color: '#fff' }}>
                      {rec ? <Square style={{ width: 18, height: 18 }} /> : <Mic style={{ width: 20, height: 20 }} />}
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13.5, fontWeight: 800 }}>
                        {rec ? `بيسجّل… ${mmss(recSec)}` : audioBlob ? `التسجيل جاهز · ${mmss(recSec)}` : 'سجّل صوتك'}
                      </div>
                      <div style={{ fontSize: 11.5, color: C.sub, marginTop: 2, lineHeight: 1.6 }}>
                        {rec
                          ? 'اتكلّم عادي — الصوت بيتحفظ والكلام بيتكتب تحت لوحده'
                          : audioBlob
                            ? 'التسجيل هيتحفظ مع المكالمة وتقدر تسمعه في أي وقت'
                            : 'الأبليكيشن بيسجّل صوتك ويحفظه مع المكالمة'}
                      </div>
                    </div>
                    {audioBlob && !rec && (
                      <button onClick={clearAudio} title="امسح التسجيل"
                        style={{ ...btn(), flex: '0 0 auto', padding: 9, minHeight: 38, color: C.danger, borderColor: C.line }}>
                        <Trash2 style={{ width: 15, height: 15 }} />
                      </button>
                    )}
                  </div>

                  {audioUrl && !rec && (
                    /* eslint-disable-next-line jsx-a11y/media-has-caption */
                    <audio src={audioUrl} controls style={{ width: '100%', marginTop: 10, height: 38 }} />
                  )}

                  {micErr && (
                    <div style={{ marginTop: 10, fontSize: 12, color: C.danger, lineHeight: 1.7, display: 'flex', gap: 6 }}>
                      <AlertTriangle style={{ width: 14, height: 14, flexShrink: 0, marginTop: 2 }} />
                      <span>{micErr}</span>
                    </div>
                  )}
                  {!speechOk && !micErr && (
                    <div style={{ marginTop: 8, fontSize: 11, color: C.sub }}>
                      المتصفح ده مابيحوّلش الصوت لنص — التسجيل هيتحفظ، واكتب سطر يوضّح اللي حصل.
                    </div>
                  )}
                </div>

                <button onClick={() => submit()} disabled={sending || (!text.trim() && !audioBlob)}
                  style={{ ...btn('primary'), width: '100%', marginTop: 10, opacity: ((!text.trim() && !audioBlob) || sending) ? .55 : 1 }}>
                  {sending ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Sparkles style={{ width: 16, height: 16 }} />}
                  احفظ المكالمة {text.trim() ? '— والمارد يعمل التاسكات' : ''}
                </button>

                <div style={{ marginTop: 16, borderTop: `1px solid ${C.line}`, paddingTop: 12 }}>
                  <div style={{ fontSize: 12, color: C.sub, marginBottom: 8 }}>أو سجّل النتيجة بسرعة من غير تفريغ:</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                    {OUTCOMES.map(o => (
                      <button key={o.k} disabled={sending} onClick={() => submit(o.k)}
                        style={{ ...btn(), flex: '0 0 auto', padding: '9px 14px', fontSize: 13, minHeight: 40 }}>
                        {o.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div style={{ background: '#eef7f3', border: `1px solid ${C.green2}`, borderRadius: 14, padding: 12, marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 800, color: C.green, marginBottom: 4 }}>الملخّص</div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.8 }}>{result.summary || '—'}</div>
                </div>
                <div style={{ fontSize: 13, fontWeight: 800, marginBottom: 8 }}>
                  التاسكات اللي اتعملت ({result.tasks.length})
                  {result.routed > 0 && <span style={{ color: C.green, fontWeight: 700 }}> — منهم {result.routed} راحوا لزمايلك</span>}
                </div>
                {result.tasks.length === 0 && <div style={{ fontSize: 13, color: C.sub, marginBottom: 10 }}>مفيش خطوة محتاجة تاسك.</div>}
                {result.tasks.map((t, i) => (
                  <div key={i} style={{ border: `1px solid ${C.line}`, borderRadius: 12, padding: 10, marginBottom: 7, fontSize: 13.5 }}>
                    {t.title}
                    {t.specialty && <span style={{ fontSize: 11, color: C.sub, marginRight: 6 }}>({t.specialty})</span>}
                  </div>
                ))}
                <button onClick={() => setSheet(null)} style={{ ...btn('primary'), width: '100%', marginTop: 10 }}>
                  تمام <ChevronLeft style={{ width: 16, height: 16 }} />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* 📋 (٢٣ أغسطس ٢٠٢٦ — محمد: «لسة زرار واتساب بيفتح الرسالة فاضية»)
          واتساب بيرمي النص المجهّز في حالات كتير (خصوصًا لما ويندوز أو
          أندرويد يسلّم اللينك للتطبيق المثبّت). فبننسخ الاسكريبت في نفس
          الضغطة ونقول للموظف — لو الشات فتح فاضي، لزقة واحدة وخلاص. */}
      {copied !== null && (
        <div style={{
          position: 'fixed', insetInline: 12, bottom: 'calc(72px + env(safe-area-inset-bottom))',
          zIndex: 9999, background: copied ? '#14231E' : '#b3261e', color: '#fff',
          borderRadius: 12, padding: '11px 14px', fontSize: 13, fontWeight: 700,
          boxShadow: '0 8px 24px rgba(0,0,0,.22)', textAlign: 'center', lineHeight: 1.7,
        }}>
          {copied
            ? 'الاسكريبت اتنسخ ✅ — لو الشات فتح فاضي، الزق بس (ضغطة طويلة → لصق)'
            : 'مقدرناش ننسخ الاسكريبت — افتح «الملف» واقراه منه'}
        </div>
      )}

      {/* الشريط السفلي بتاع مضمونة — الرجوع للموقع بلمسة، و«شغلي» بيبان منوّر */}
      <BottomNav />
    </div>
  )
}

/* عنوان قسم صغير جوّه كارت المكالمة */
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7, color: '#059669' }}>
        {icon}
        <b style={{ fontSize: 13, color: '#16241f' }}>{title}</b>
      </div>
      {children}
    </div>
  )
}

/* 🎧 مشغّل تسجيل المكالمة.
   الـbucket خاص، فبنطلب **لينك موقّع** ساعة بجلسة الموظف نفسه.
   بيتطلب بالدوس بس — عشان مانجيبش عشر لينكات مع كل فتحة ملف. */
function AudioPlayer({ path }: { path: string }) {
  const [url, setUrl] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function load() {
    setBusy(true); setFailed(false)
    const { data, error } = await supabaseBrowser.storage.from('crm-calls').createSignedUrl(path, 3600)
    if (error || !data?.signedUrl) setFailed(true)
    else setUrl(data.signedUrl)
    setBusy(false)
  }

  if (failed) return <div style={{ fontSize: 11.5, color: '#b3261e', marginTop: 6 }}>مقدرناش نفتح التسجيل</div>
  if (url) {
    // eslint-disable-next-line jsx-a11y/media-has-caption
    return <audio src={url} controls autoPlay style={{ width: '100%', marginTop: 8, height: 36 }} />
  }
  return (
    <button onClick={load} disabled={busy}
      style={{ marginTop: 8, display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff',
        border: '1px solid #e7e9e5', borderRadius: 10, padding: '6px 12px', fontSize: 12.5,
        fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', color: '#059669' }}>
      {busy ? <Loader2 style={{ width: 14, height: 14 }} className="animate-spin" /> : <PlayCircle style={{ width: 15, height: 15 }} />}
      اسمع التسجيل
    </button>
  )
}

/* 🧾 كارت الرقم — بيتستخدم في «مكالماتي» وفي «كل الأرقام» بتاع المدير.
   `showOwner` بيبان في تاب المدير بس: مين ماسك الرقم ده. */
function LeadCard({
  l, onOpen, onLog, card, btn, C, startedAt, showOwner = false, me = null, onCopied, pickApp = false,
}: {
  /** أندرويد؟ يبقى نعرض «عادي» و«بيزنس» بدل زرار واتساب واحد */
  pickApp?: boolean
  l: Lead
  onOpen: (l: Lead) => void
  onLog: (l: Lead) => void
  card: React.CSSProperties
  btn: (k?: 'primary' | 'wa' | 'ghost') => React.CSSProperties
  C: Record<string, string>
  startedAt: MutableRefObject<number | null>
  showOwner?: boolean
  /** اسم الموظف اللي فاتح الشاشة — بيتوقّع بيه آخر رسالة الواتساب */
  me?: string | null
  /** بيتنده بعد نسخ الاسكريبت عشان نوريه رسالة «اتنسخ» */
  onCopied?: (ok: boolean) => void
}) {
  void onLog
  return (
              <div style={card}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 15, fontWeight: 800, lineHeight: 1.4 }}>
                      {l.name || l.phone}
                    </div>
                    <div style={{ fontSize: 12, color: C.sub, marginTop: 3, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{ direction: 'ltr' }}>{l.phone}</span>
                      {l.phone_kind === 'landline' && <span style={{ color: C.warn, fontWeight: 700 }}>أرضي</span>}
                      {l.city && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}><MapPin style={{ width: 11, height: 11 }} />{l.city}</span>}
                    </div>
                    <div style={{ fontSize: 11.5, color: C.sub, marginTop: 4 }}>
                      {l.specialty_ar && <span style={{ background: '#eef7f3', color: C.green, padding: '2px 8px', borderRadius: 999, fontWeight: 700, marginLeft: 6 }}>{l.specialty_ar}</span>}
                      {STATUS_AR[l.status] || l.status}
                      {showOwner && (l.owner ? ` · مع ${l.owner}` : ' · ملوش صاحب')}
                      {l.calls > 0 && ` · ${l.calls} مكالمة`}
                      {l.last_contact_at && ` · آخر تواصل ${sinceLabel(l.last_contact_at)}`}
                    </div>
                    {l.notes && (
                      <div style={{ fontSize: 11.5, color: C.sub, marginTop: 5, lineHeight: 1.6,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                        {l.notes}
                      </div>
                    )}
                    {l.next_action_at && (
                      <div style={{ fontSize: 11.5, color: C.warn, marginTop: 4, fontWeight: 700 }}>
                        معاد المتابعة: {fmtDateTime(l.next_action_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  {/* 📇 دوسة «اتصال» بتفتح كارت التفاصيل ورا الاتصال —
                      فالموظف بيقرا وهو بيرن، ولما يرجع يلاقي «سجّل» قدامه */}
                  <a href={`tel:${l.phone}`}
                     onClick={() => { startedAt.current = Date.now(); onOpen(l) }}
                     style={btn('primary')}>
                    <Phone style={{ width: 16, height: 16 }} /> اتصال
                  </a>
                  {/* 📱 (٢٣ أغسطس ٢٠٢٦ — محمد: «عايز تاب إرسال الواتساب
                      تخيّرهم بين واتساب بيزنس أو واتساب عادي») على أندرويد
                      بنعرض الاتنين بـpackage صريح. على iOS/الديسكتوب مفيش
                      طريقة نحدّد، فزرار واحد بدل ما نوهمه إنه اختار. */}
                  {l.phone_kind !== 'landline' && (pickApp ? (
                    <>
                      <a href={waAppLink('normal', l.phone, l.specialty, l.name, me)}
                         onClick={() => { copyScript(l, me).then(ok => onCopied?.(ok)); onOpen(l) }}
                         style={{ ...btn('wa'), paddingInline: 10 }}
                         title={`اسكريبت ${scriptFor(l.specialty).label} — واتساب العادي`}>
                        <MessageCircle style={{ width: 15, height: 15 }} /> عادي
                      </a>
                      <a href={waAppLink('business', l.phone, l.specialty, l.name, me)}
                         onClick={() => { copyScript(l, me).then(ok => onCopied?.(ok)); onOpen(l) }}
                         style={{ ...btn('wa'), background: '#0B7A5C', borderColor: '#0B7A5C', paddingInline: 10 }}
                         title={`اسكريبت ${scriptFor(l.specialty).label} — واتساب بيزنس`}>
                        <MessageCircle style={{ width: 15, height: 15 }} /> بيزنس
                      </a>
                    </>
                  ) : (
                    <a href={waLink(l, me)} target="_blank" rel="noreferrer"
                       onClick={() => { copyScript(l, me).then(ok => onCopied?.(ok)); onOpen(l) }}
                       style={btn('wa')}
                       title={`اسكريبت ${scriptFor(l.specialty).label} — جاهز في الشات ومتنسخ كمان`}>
                      <MessageCircle style={{ width: 16, height: 16 }} /> واتساب
                    </a>
                  ))}
                  <button onClick={() => onOpen(l)} style={{ ...btn(), flex: '0 0 auto', paddingInline: 12 }}>
                    <FileText style={{ width: 15, height: 15 }} /> الملف
                  </button>
                  {/* 🔔 (24 اغسطس 26) الفريق لازم يشترك في الاشعارات - الاشعارات بتوصل بس لمن عنده اشتراك */}
      <NotificationPrompt />
      </div>
              </div>
  )
}
