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

   ⚠️ **مابنسجّلش المكالمة نفسها.** أندرويد وiOS مابيسمحوش لصفحة ويب تسجّل
      مكالمة تليفون — ده قفل من نظام التشغيل. اللي بنسجّله هو كلام الموظف
      **بعد** المكالمة (زرار المايك بيستخدم تفريغ الصوت المدمج في المتصفح،
      شغّال على كروم أندرويد وسفاري). لو عايزين تسجيل حقيقي للمكالمة
      نفسها، ده محتاج رقم مركزي (كول سنتر/VoIP) — قرار لوحده.

   ⚠️ **الأرضي مالوش واتساب.** الأرقام اللي `phone_kind='landline'`
      (٢٦٤ رقم، أغلبهم مصانع) بيبان عليها زرار الاتصال بس.

   🔐 لازم تسجيل دخول بحساب مضمونة — الـRPC نفسها بترفض أي حد تاني.
   ============================================================================ */

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { supabaseBrowser } from '@/lib/supabase-browser'
import { sinceLabel, fmtDateTime } from '@/lib/arDateTime'
import {
  Phone, MessageCircle, Loader2, RefreshCw, ListChecks, CheckCircle2,
  Mic, Sparkles, X, ChevronLeft, MapPin, CornerDownLeft, LogIn, AlertTriangle,
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
}
type Task = {
  id: string; title: string; detail: string | null; priority: string; status: string
  due_at: string | null; specialty_ar: string | null
  route_reason: string | null; routed_from: string | null
  contact_id: string | null; contact_phone: string | null; contact_name: string | null
}
type Queue = {
  ok: boolean; error?: string
  me: { id: string; name: string; specialties: { key: string; name_ar: string }[] } | null
  counts: { mine: number; todo: number; due: number; never: number }
  open_tasks: number
  queue: Lead[]
  tasks: Task[]
}

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

/* واتساب عايز الرقم بالصيغة الدولية من غير + —
   الرقم عندنا مخزّن 01XXXXXXXXX، فـ'2' + الرقم = 201XXXXXXXXX. */
const waLink = (p: string) => `https://wa.me/2${p}`

export default function CrmMobilePage() {
  const [q, setQ] = useState<Queue | null>(null)
  const [loading, setLoading] = useState(true)
  const [needLogin, setNeedLogin] = useState(false)
  const [err, setErr] = useState<string | null>(null)
  const [tab, setTab] = useState<'calls' | 'tasks'>('calls')

  // شيت تسجيل المكالمة
  const [sheet, setSheet] = useState<Lead | null>(null)
  const [text, setText] = useState('')
  const [rec, setRec] = useState(false)
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
      ) => Promise<{ data: Queue | null; error: { message: string } | null }>)('crm_my_queue', { p_limit: 60 })
      if (error) setErr(error.message)
      else if (data?.ok === false) setErr(data.error || 'مش مسموح')
      else setQ(data)
    } catch (e) { setErr(e instanceof Error ? e.message : 'مقدرناش نحمّل') }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  /* 🎙️ تفريغ الصوت المدمج في المتصفح — كروم أندرويد وسفاري.
     مش موجود في كل المتصفحات، فالزرار بيختفي لو مش مدعوم. */
  const speechOk = typeof window !== 'undefined' &&
    !!((window as unknown as Record<string, unknown>).SpeechRecognition ||
       (window as unknown as Record<string, unknown>).webkitSpeechRecognition)

  function toggleMic() {
    if (rec) { recRef.current?.stop(); setRec(false); return }
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
    r.onend = () => setRec(false)
    r.start(); recRef.current = r; setRec(true)
  }

  function openSheet(l: Lead) {
    setSheet(l); setText(''); setResult(null); startedAt.current = null
  }

  async function submit(outcomeFallback?: string) {
    if (!sheet) return
    setSending(true)
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      const token = session?.access_token
      if (!token) { setNeedLogin(true); return }
      const dur = startedAt.current ? Math.round((Date.now() - startedAt.current) / 1000) : null
      const res = await fetch('/api/crm/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          contactId: sheet.id, transcript: text.trim(),
          durationSec: dur, channel: 'phone', direction: 'outbound',
          skipMarid: !text.trim(), outcome: outcomeFallback,
          summary: !text.trim() ? (OUTCOMES.find(o => o.k === outcomeFallback)?.label || null) : undefined,
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
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 16, fontWeight: 900 }}>{q?.me?.name || 'شغلي'}</div>
            <div style={{ fontSize: 11.5, color: C.sub }}>
              {q?.me?.specialties?.length
                ? q.me.specialties.map(s => s.name_ar).join(' · ')
                : 'لسه مفيش تخصص متحدّدلك'}
            </div>
          </div>
          <button onClick={load} disabled={loading} style={{ ...btn(), flex: '0 0 auto', padding: 10, minHeight: 40 }}>
            <RefreshCw style={{ width: 16, height: 16 }} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
        <div style={{ display: 'flex', borderTop: `1px solid ${C.line}` }}>
          {([['calls', `مكالمات (${q?.counts?.todo ?? 0})`], ['tasks', `تاسكاتي (${q?.open_tasks ?? 0})`]] as const).map(([k, label]) => (
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
              <div style={{ ...card, textAlign: 'center', color: C.sub, padding: 30, fontSize: 13.5 }}>
                مفيش أرقام متوزّعة عليك لسه.<br />
                <span style={{ fontSize: 12 }}>التوزيع بيتعمل من شاشة الأدمن: «وزّع بالدور».</span>
              </div>
            )}
            {q.queue.map(l => (
              <div key={l.id} style={card}>
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
                      {l.calls > 0 && ` · ${l.calls} مكالمة`}
                      {l.last_contact_at && ` · آخر تواصل ${sinceLabel(l.last_contact_at)}`}
                    </div>
                    {l.next_action_at && (
                      <div style={{ fontSize: 11.5, color: C.warn, marginTop: 4, fontWeight: 700 }}>
                        معاد المتابعة: {fmtDateTime(l.next_action_at)}
                      </div>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <a href={`tel:${l.phone}`} onClick={() => { startedAt.current = Date.now() }} style={btn('primary')}>
                    <Phone style={{ width: 16, height: 16 }} /> اتصال
                  </a>
                  {l.phone_kind !== 'landline' && (
                    <a href={waLink(l.phone)} target="_blank" rel="noreferrer" style={btn('wa')}>
                      <MessageCircle style={{ width: 16, height: 16 }} /> واتساب
                    </a>
                  )}
                  <button onClick={() => openSheet(l)} style={{ ...btn(), flex: '0 0 auto', paddingInline: 14 }}>
                    سجّل
                  </button>
                </div>
              </div>
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
                <p style={{ fontSize: 12.5, color: C.sub, margin: '0 0 8px', lineHeight: 1.7 }}>
                  قول أو اكتب اللي حصل في المكالمة بلغتك العادية — المارد هو اللي هيطلّع منها
                  الملخّص والتاسكات، وأي حاجة تخصّ زميل تاني هتنزل عنده لوحدها.
                </p>
                <textarea rows={5} value={text} onChange={e => setText(e.target.value)}
                  placeholder="مثال: العميل عايز شقة ١٢٠ متر في سموحة بحدود ٢.٥ مليون، وقال إن عنده عربية مستعملة عايز يعرضها. قال نكلّمه الأسبوع الجاي."
                  style={{ width: '100%', border: `1px solid ${C.line}`, borderRadius: 14, padding: 12, fontSize: 14, fontFamily: 'inherit', resize: 'vertical', lineHeight: 1.7 }} />

                <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                  {speechOk && (
                    <button onClick={toggleMic}
                      style={{ ...btn(rec ? 'primary' : 'ghost'), flex: '0 0 auto', paddingInline: 16, borderColor: rec ? C.danger : C.line, background: rec ? C.danger : '#fff', color: rec ? '#fff' : C.ink }}>
                      <Mic style={{ width: 16, height: 16 }} /> {rec ? 'بيسمعك…' : 'قول بصوتك'}
                    </button>
                  )}
                  <button onClick={() => submit()} disabled={sending || !text.trim()} style={{ ...btn('primary'), opacity: (!text.trim() || sending) ? .55 : 1 }}>
                    {sending ? <Loader2 style={{ width: 16, height: 16 }} className="animate-spin" /> : <Sparkles style={{ width: 16, height: 16 }} />}
                    المارد يفرّغ ويعمل التاسكات
                  </button>
                </div>

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
    </div>
  )
}
