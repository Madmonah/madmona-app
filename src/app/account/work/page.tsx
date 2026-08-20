'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowRight, Clock, Inbox, Wallet, MessageCircle,
  Building2, Crown, Check, ClipboardList, LogIn, Plus, AlertCircle,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import BottomNav from '@/components/BottomNav'

/* ============================================================================
   /account/work — «شغلي» — كل الإداريات جوّه الأبليكيشن
   ============================================================================
   🎯 (٢٠ أغسطس ٢٠٢٦) محمد:
      «عايز تاب حسابي يعرض كل حاجة ليها علاقة بالإداريات (حضور وانصراف —
       طلبات — مصاريف...) كل واحد وصلاحياته. عايز العرض ده يتم عن طريق
       الأبليكيشن نفسه، ويكون مربوط كمان بشات المارد».

   المشكلة اللي بيحلها:
     الموظف كان لازم يخرج من الأبليكيشن ويروح على لوحة الأدمن (لينك طويل
     مالوش باب من حسابي) عشان يشوف حضوره أو يقدّم طلب. ومحدش كان بيوصل.

   كل قسم هنا بيظهر **بالصلاحية بتاعته** — نفس المفاتيح اللي في تاب
   «الصلاحيات» (`permission_catalog`)، مفيش أسماء مخترعة.
   الداتا كلها من نداء واحد: `get_my_work_home()`.
   ============================================================================ */

type Perm = Record<string, boolean>
type Attendance = {
  date: string; clock_in_at: string | null; clock_out_at: string | null
  hours_worked: number | null; status: string | null
} | null
// 📝 (٢٠ أغسطس ٢٠٢٦) موديل الطلبات الموحّد — إجازة · إذن · سلفة · عهدة.
//    محمد: «عايز التاب بتاع شغلي يعرض طلبات الموظفين من سلفة أو عهدة أو إذن
//    أو إجازة أو أي حاجة — وده الموديل الوحيد اللي هنشتغل عليه كإدارة».
type Req = {
  id: string; source: 'leave' | 'advance' | 'custody'
  kind: string; label: string; status: string; reason: string | null
  start_date: string | null; end_date: string | null; amount: number | null
  created_at: string | null
}
type Task = {
  id: string; source: string; title: string
  priority: string | null; due_time: string | null
  task_date: string | null; overdue: boolean
}
type Biz = {
  supplier_id: string; business_name: string; is_platform_owner: boolean
  relation: 'owner' | 'employee'
  employee_id: string | null; role_ar: string | null
  branch_id: string | null; branch_name: string | null; branch_code: string | null
  permissions: Perm
  attendance: Attendance
  my_requests: Req[]
  my_tasks: Task[]
  tasks_done_today: number
  pending_for_me: number
  expenses: { month_count: number; month_total: number } | null
  chat_room_id: string | null
}
type Home = { authenticated: boolean; account_kind: string; today: string; businesses: Biz[] }

const KIND_LABEL: Record<string, string> = {
  madmona_admin: 'أدمن', business_owner: 'إدارة', b2b_employee: 'موظف', customer: 'عميل',
}

const REQ_STATUS: Record<string, { label: string; cls: string }> = {
  // إجازة / إذن
  pending: { label: 'مستنية الرد', cls: 'bg-amber-50 text-amber-700' },
  approved: { label: 'اتوافق عليها', cls: 'bg-[#34D399]/10 text-[#059669]' },
  rejected: { label: 'اترفضت', cls: 'bg-red-50 text-red-600' },
  // سلفة
  requested: { label: 'مستنية الرد', cls: 'bg-amber-50 text-amber-700' },
  partial: { label: 'بتتسدّد', cls: 'bg-blue-50 text-blue-700' },
  repaid: { label: 'اتسدّدت', cls: 'bg-[#34D399]/10 text-[#059669]' },
  written_off: { label: 'اتشالت', cls: 'bg-gray-100 text-gray-600' },
  // عهدة
  held: { label: 'معاك دلوقتي', cls: 'bg-[#34D399]/10 text-[#059669]' },
  returned: { label: 'اترجّعت', cls: 'bg-gray-100 text-gray-600' },
  lost: { label: 'ضاعت', cls: 'bg-red-50 text-red-600' },
  damaged: { label: 'اتخربت', cls: 'bg-red-50 text-red-600' },
  settled: { label: 'اتسوّت', cls: 'bg-gray-100 text-gray-600' },
}

const REQ_KINDS: { key: string; label: string; needs: ('date' | 'dates' | 'amount' | 'title')[] }[] = [
  { key: 'leave',      label: 'إجازة', needs: ['dates'] },
  { key: 'permission', label: 'إذن',   needs: ['date'] },
  { key: 'advance',    label: 'سلفة',  needs: ['amount'] },
  { key: 'custody',    label: 'عهدة',  needs: ['title'] },
]

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  try { return new Date(iso).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' }) } catch { return '—' }
}

type AutoEvent = { branch: string; action: string; distance_m?: number; reason?: string }

// 📍 موقع واحد بدقة عالية — نفس إعدادات صفحة البصم بالظبط
function getPos(): Promise<{ lat: number; lng: number; acc: number } | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) { resolve(null); return }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 0 },
    )
  })
}

export default function MyWorkPage() {
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoMsg, setAutoMsg] = useState<string | null>(null)

  async function load(): Promise<boolean> {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) return false
      const { data } = await (supabaseBrowser.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: Home | null }>)('get_my_work_home')
      setHome(data)
      return true
    } catch (e) {
      console.error('[account/work] load failed:', e)
      return false
    }
  }

  // ⏱️ (٢٠ أغسطس ٢٠٢٦) الحضور والانصراف **أوتوماتيك**.
  //    محمد: «تسجيل الحضور المفروض يكون أوتوماتيك والانصراف كمان».
  //    الأبليكيشن بيبعت موقعه، والداتابيز هي اللي بتقرر:
  //      • جوّه الفرع ومش مسجّل → حضور
  //      • جوّه الفرع ومسجّل    → نبضة بس
  //      • بره الفرع ومسجّل     → انصراف
  //    ولو التطبيق اتقفل خالص، وظيفة `auto_clockout_offline_sessions`
  //    في `orchestrator_jobs` بتقفل الجلسة بعد ١٠ دقايق من آخر نبضة.
  async function pulse() {
    try {
      if (typeof document !== 'undefined' && document.hidden) return
      const pos = await getPos()
      if (!pos) return
      const { data } = await (supabaseBrowser.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { ok?: boolean; events?: AutoEvent[] } | null }>)(
        'employee_auto_attendance',
        { p_lat: pos.lat, p_lng: pos.lng, p_accuracy_m: pos.acc },
      )
      const ev = (data?.events || []).find(e => e.action === 'clock_in' || e.action === 'clock_out')
      if (ev) {
        setAutoMsg(ev.action === 'clock_in'
          ? `اتسجّل حضورك أوتوماتيك في ${ev.branch} ✅`
          : `اتسجّل انصرافك أوتوماتيك من ${ev.branch} 👋`)
        setTimeout(() => setAutoMsg(null), 6000)
        await load()
      }
    } catch (e) {
      console.error('[account/work] auto attendance failed:', e)
    }
  }

  useEffect(() => {
    let cancelled = false
    let iv: ReturnType<typeof setInterval> | null = null
    ;(async () => {
      const ok = await load()
      if (cancelled) return
      setLoading(false)
      if (!ok) return
      pulse()
      iv = setInterval(() => { pulse() }, 60000)
    })()
    return () => { cancelled = true; if (iv) clearInterval(iv) }
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FAFAF7] flex items-center justify-center" dir="rtl">
        <Loader2 className="w-7 h-7 animate-spin text-[#059669]" />
      </div>
    )
  }

  const list = home?.businesses ?? []

  return (
    <div className="min-h-screen bg-[#FAFAF7] pb-28" dir="rtl">
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="w-9 h-9 bg-[#FAFAF7] rounded-full flex items-center justify-center hover:bg-gray-100">
            <ArrowRight className="w-4 h-4 text-[#6B7280]" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-[#1A2E26] leading-none">شغلي</h1>
            <p className="text-[11px] text-[#6B7280] mt-1">
              الحضور والطلبات والمصاريف — كل واحد بصلاحياته
            </p>
          </div>
          {home?.account_kind && KIND_LABEL[home.account_kind] && (
            <span className="text-[10px] font-black px-2.5 py-1 rounded-full bg-gradient-to-r from-[#2FA084] to-[#d4a017] text-white flex-shrink-0">
              {KIND_LABEL[home.account_kind]}
            </span>
          )}
        </div>
      </header>

      {autoMsg && (
        <div className="max-w-2xl mx-auto px-4 pt-3">
          <div className="bg-[#34D399]/12 border border-[#059669]/25 text-[#04352A] rounded-2xl px-4 py-2.5 text-[12.5px] font-bold text-center">
            {autoMsg}
          </div>
        </div>
      )}

      <main className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {!home?.authenticated ? (
          <Empty icon={<LogIn className="w-8 h-8" />} title="سجّل دخولك الأول"
                 sub="ادخل بحسابك عشان تشوف شغلك وصلاحياتك." href="/auth/login" cta="تسجيل دخول" />
        ) : list.length === 0 ? (
          <Empty icon={<Building2 className="w-8 h-8" />} title="مالكش شغل مسجّل"
                 sub="لسه ماتضفتش كموظف ولا كصاحب بيزنس على مضمونة." />
        ) : (
          list.map(b => <BizCard key={b.supplier_id} b={b} onRefresh={load} />)
        )}
      </main>

      <BottomNav />
    </div>
  )
}

function BizCard({ b, onRefresh }: { b: Biz; onRefresh: () => void }) {
  const isOwner = b.relation === 'owner'
  const can = (k: string) => isOwner || b.permissions?.[k] === true
  const att = b.attendance
  const inAt = att?.clock_in_at ?? null
  const outAt = att?.clock_out_at ?? null

  return (
    <section className="bg-white rounded-3xl shadow-soft overflow-hidden">
      {/* رأس البيزنس */}
      <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${
          b.is_platform_owner
            ? 'bg-gradient-to-br from-[#D4A017] via-[#2FA084] to-[#34D399] text-white'
            : 'bg-[#34D399]/10 text-[#059669]'
        }`}>
          {b.is_platform_owner ? <Crown className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-black text-[#1A2E26] truncate">{b.business_name}</p>
          <p className="text-[11px] text-[#6B7280] mt-0.5 truncate">
            {isOwner ? 'صاحب البيزنس' : (b.role_ar || 'موظف')}
            {b.branch_name ? ` · ${b.branch_name}` : ''}
          </p>
        </div>
      </div>

      {/* ⏱️ الحضور والانصراف — للموظف بس (المالك مالوش سجل حضور) */}
      {b.employee_id && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<Clock className="w-3.5 h-3.5" />} title="الحضور والانصراف" />
          <div className="grid grid-cols-3 gap-2 mb-3">
            <Stat label="حضور" value={fmtTime(inAt)} tone={inAt ? 'ok' : 'idle'} />
            <Stat label="انصراف" value={fmtTime(outAt)} tone={outAt ? 'ok' : 'idle'} />
            <Stat label="ساعات" value={att?.hours_worked != null ? String(att.hours_worked) : '—'} tone="idle" />
          </div>
          <p className="text-[11px] text-[#059669] bg-[#34D399]/8 rounded-xl px-3 py-2 mb-2 leading-relaxed text-center">
            الحضور والانصراف بيتسجّلوا <b>أوتوماتيك</b> — افتح الأبليكيشن وانت في
            الفرع يتسجّل حضورك، وأول ما تمشي يتسجّل انصرافك.
          </p>
          {b.branch_code ? (
            <Link
              href={`/clock/${b.branch_code}`}
              className="w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
            >
              <Clock className="w-4 h-4" />
              {inAt && !outAt ? 'سجّل انصرافك يدوي' : 'سجّل حضورك يدوي'}
            </Link>
          ) : (
            <p className="text-[11px] text-[#9CA3AF] text-center">
              فرعك لسه مالوش كود بصمة — كلّم الإدارة.
            </p>
          )}
        </div>
      )}

      {/* 📝 الطلبات — الموديل الموحّد: إجازة · إذن · سلفة · عهدة */}
      <div className="px-5 py-4 border-b border-gray-100">
        <SectionTitle
          icon={<Inbox className="w-3.5 h-3.5" />}
          title="الطلبات"
          extra={b.pending_for_me > 0 ? `${b.pending_for_me} مستنية منك` : undefined}
        />

        {b.employee_id && <RequestForm supplierId={b.supplier_id} onDone={onRefresh} />}

        {b.my_requests.length === 0 ? (
          <p className="text-[12px] text-[#6B7280] mb-3">مفيش طلبات ليك لسه.</p>
        ) : (
          <div className="space-y-1.5 mb-3">
            {b.my_requests.map(r => {
              const st = REQ_STATUS[r.status] || { label: r.status, cls: 'bg-gray-100 text-gray-600' }
              return (
                <div key={`${r.source}-${r.id}`} className="flex items-center gap-2 bg-[#FAFAF7] rounded-xl px-3 py-2">
                  <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white border border-gray-200 text-[#6B7280] flex-shrink-0">
                    {r.kind}
                  </span>
                  <span className="text-[12px] font-bold text-[#1A2E26] truncate flex-1">
                    {r.label}
                  </span>
                  <span className={`text-[9px] font-black px-1.5 py-0.5 rounded flex-shrink-0 ${st.cls}`}>{st.label}</span>
                </div>
              )
            })}
          </div>
        )}

        {can('can_manage_team') && (
          <Link
            href={`/admin/business-finance/${b.supplier_id}/requests`}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
          >
            <ClipboardList className="w-4 h-4" />
            إدارة طلبات الفريق
          </Link>
        )}
      </div>

      {/* 💰 المصاريف — بصلاحية «يشوف الفلوس والفاينانس» */}
      {can('can_view_finance') && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<Wallet className="w-3.5 h-3.5" />} title="المصاريف" extra="الشهر ده" />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Stat label="عدد" value={String(b.expenses?.month_count ?? 0)} tone="idle" />
            <Stat label="إجمالي" value={`${Number(b.expenses?.month_total ?? 0).toLocaleString('ar-EG')} ج`} tone="ok" />
          </div>
          <Link
            href={`/admin/business-finance/${b.supplier_id}/expenses`}
            className="w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
          >
            <Wallet className="w-4 h-4" />
            افتح المصاريف
          </Link>
        </div>
      )}

      {/* 💬 جروب الشركة في الشات */}
      {b.chat_room_id && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<MessageCircle className="w-3.5 h-3.5" />} title="جروب الشركة" />
          <Link
            href={`/chat/team?room=${b.chat_room_id}`}
            className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-l from-[#14231E] to-[#059669] text-white py-2.5 rounded-2xl text-[13px] font-bold no-underline"
          >
            <MessageCircle className="w-4 h-4" />
            افتح جروب شركة {b.business_name}
          </Link>
        </div>
      )}

      {/* 📋 مهامي — نفس التاسكات اللي في تاب Task بالشات.
          محمد: «شيل تابة الصلاحيات اللي في شاشة شغلي وحط مكانها التاسكات،
          مع العلم إن التاسكات برضو تظهر في الشات في تاب مهامي».
          الصلاحيات اتشالت من هنا — مكانها الطبيعي لوحة الإدارة، والموظف
          مش محتاج يبصّ على قايمة صلاحياته كل يوم، هو محتاج شغله. */}
      {b.employee_id && (
        <div className="px-5 py-4">
          <SectionTitle
            icon={<ClipboardList className="w-3.5 h-3.5" />}
            title="مهامي"
            extra={b.tasks_done_today > 0 ? `${b.tasks_done_today} خلصت النهاردة` : undefined}
          />
          {(b.my_tasks || []).length === 0 ? (
            <p className="text-[12px] text-[#6B7280]">مفيش مهام مفتوحة — تمام 👌</p>
          ) : (
            <div className="space-y-1.5">
              {b.my_tasks.map(t => (
                <TaskRow key={t.id} t={t} onDone={onRefresh} />
              ))}
            </div>
          )}
          <Link
            href="/chat/tasks"
            className="mt-3 w-full inline-flex items-center justify-center gap-2 bg-[#FAFAF7] border border-gray-200 text-[#1A2E26] py-2.5 rounded-2xl text-[13px] font-bold no-underline hover:bg-white"
          >
            <ClipboardList className="w-4 h-4" />
            كل المهام في الشات
          </Link>
        </div>
      )}

    </section>
  )
}

function SectionTitle({ icon, title, extra }: { icon: React.ReactNode; title: string; extra?: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <span className="text-[#059669]">{icon}</span>
      <p className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex-1">{title}</p>
      {extra && <span className="text-[10px] font-black text-[#D4A017]">{extra}</span>}
    </div>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'ok' | 'idle' }) {
  return (
    <div className={`rounded-2xl px-3 py-2.5 text-center ${tone === 'ok' ? 'bg-[#34D399]/10' : 'bg-[#FAFAF7]'}`}>
      <p className={`text-[13px] font-black ${tone === 'ok' ? 'text-[#059669]' : 'text-[#1A2E26]'}`}>{value}</p>
      <p className="text-[10px] text-[#6B7280] mt-0.5">{label}</p>
    </div>
  )
}

function Empty({ icon, title, sub, href, cta }: {
  icon: React.ReactNode; title: string; sub: string; href?: string; cta?: string
}) {
  return (
    <div className="bg-white rounded-3xl shadow-soft p-8 text-center">
      <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-[#FAFAF7] text-[#9CA3AF] flex items-center justify-center">
        {icon}
      </div>
      <p className="font-black text-[#1A2E26] mb-1">{title}</p>
      <p className="text-[12px] text-[#6B7280] leading-relaxed">{sub}</p>
      {href && cta && (
        <Link href={href} className="mt-4 inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] px-5 py-2.5 rounded-2xl text-sm font-bold no-underline">
          {cta}
        </Link>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   RequestForm — تقديم أي طلب من الأبليكيشن: إجازة · إذن · سلفة · عهدة
   بينادي `submit_my_request` — نفس الباب لكل الأنواع.
   --------------------------------------------------------------------------- */
function RequestForm({ supplierId, onDone }: { supplierId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState('leave')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [amount, setAmount] = useState('')
  const [title, setTitle] = useState('')
  const [reason, setReason] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const spec = REQ_KINDS.find(k => k.key === kind)!
  const needs = (n: string) => spec.needs.includes(n as never)

  const reset = () => {
    setFrom(''); setTo(''); setAmount(''); setTitle(''); setReason(''); setErr(null)
  }

  const submit = async () => {
    setBusy(true); setErr(null)
    try {
      const { data } = await (supabaseBrowser.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { ok?: boolean; error?: string } | null }>)('submit_my_request', {
        p_supplier_id: supplierId,
        p_kind: kind,
        p_reason: reason || null,
        p_start_date: from || null,
        p_end_date: to || null,
        p_amount: amount ? Number(amount) : null,
        p_title: title || null,
      })
      if (!data?.ok) { setErr(data?.error || 'الطلب ماتبعتش'); return }
      reset(); setOpen(false); onDone()
    } catch (e) {
      console.error('[work] submit_my_request failed:', e)
      setErr('حصلت مشكلة — جرّب تاني')
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-2.5 rounded-2xl text-[13px] font-bold mb-3 hover:bg-[#34D399]/90"
      >
        <Plus className="w-4 h-4" />
        اطلب حاجة
      </button>
    )
  }

  return (
    <div className="bg-[#FAFAF7] border border-gray-200 rounded-2xl p-3 mb-3 space-y-2.5">
      <div className="flex flex-wrap gap-1.5">
        {REQ_KINDS.map(k => (
          <button
            key={k.key}
            type="button"
            onClick={() => { setKind(k.key); setErr(null) }}
            className={`text-[12px] font-black px-3 py-1.5 rounded-full border transition-colors ${
              kind === k.key
                ? 'bg-[#059669] text-white border-[#059669]'
                : 'bg-white text-[#6B7280] border-gray-200 hover:border-[#059669]/40'
            }`}
          >
            {k.label}
          </button>
        ))}
      </div>

      {(needs('date') || needs('dates')) && (
        <div className={needs('dates') ? 'grid grid-cols-2 gap-2' : ''}>
          <label className="block">
            <span className="text-[10px] font-bold text-[#6B7280]">
              {needs('dates') ? 'من' : 'التاريخ'}
            </span>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)}
              className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px]" />
          </label>
          {needs('dates') && (
            <label className="block">
              <span className="text-[10px] font-bold text-[#6B7280]">لـ</span>
              <input type="date" value={to} onChange={e => setTo(e.target.value)}
                className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px]" />
            </label>
          )}
        </div>
      )}

      {needs('title') && (
        <label className="block">
          <span className="text-[10px] font-bold text-[#6B7280]">العهدة المطلوبة</span>
          <input value={title} onChange={e => setTitle(e.target.value)}
            placeholder="لابتوب · موبايل · مفاتيح · عربية…"
            className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px]" />
        </label>
      )}

      {(needs('amount') || needs('title')) && (
        <label className="block">
          <span className="text-[10px] font-bold text-[#6B7280]">
            {needs('amount') ? 'المبلغ بالجنيه' : 'القيمة التقديرية (اختياري)'}
          </span>
          <input type="number" inputMode="numeric" value={amount} onChange={e => setAmount(e.target.value)}
            className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px]" />
        </label>
      )}

      <label className="block">
        <span className="text-[10px] font-bold text-[#6B7280]">السبب</span>
        <textarea value={reason} onChange={e => setReason(e.target.value)} rows={2}
          placeholder="اكتب السبب باختصار"
          className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px] resize-none" />
      </label>

      {err && (
        <p className="text-[11.5px] text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
        </p>
      )}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={submit} disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          ابعت الطلب
        </button>
        <button type="button" onClick={() => { reset(); setOpen(false) }} disabled={busy}
          className="bg-white border border-gray-200 text-[#6B7280] py-2.5 rounded-xl text-[13px] font-bold disabled:opacity-50">
          إلغاء
        </button>
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------------------
   TaskRow — مهمة واحدة، تتقفل من هنا على طول
   --------------------------------------------------------------------------- */
function TaskRow({ t, onDone }: { t: Task; onDone: () => void }) {
  const [busy, setBusy] = useState(false)

  const complete = async () => {
    setBusy(true)
    try {
      await (supabaseBrowser.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<unknown>)('complete_my_task', { p_task_id: t.id, p_source: t.source })
      onDone()
    } catch (e) {
      console.error('[work] complete_my_task failed:', e)
    } finally { setBusy(false) }
  }

  return (
    <div className={`flex items-center gap-2 rounded-xl px-3 py-2 ${
      t.overdue ? 'bg-red-50/60 border border-red-100' : 'bg-[#FAFAF7]'
    }`}>
      <button
        type="button"
        onClick={complete}
        disabled={busy}
        className="w-6 h-6 rounded-lg border-2 border-gray-300 hover:border-[#059669] hover:bg-[#34D399]/10 flex items-center justify-center flex-shrink-0 disabled:opacity-50 transition-colors"
        aria-label="خلّصت المهمة"
      >
        {busy ? <Loader2 className="w-3 h-3 animate-spin text-[#059669]" /> : null}
      </button>
      <span className="text-[12.5px] font-bold text-[#1A2E26] flex-1 leading-snug">
        {t.title}
      </span>
      {t.overdue && (
        <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-red-100 text-red-700 flex-shrink-0">
          متأخرة
        </span>
      )}
      {t.due_time && (
        <span className="text-[10px] text-[#6B7280] flex-shrink-0" dir="ltr">
          {String(t.due_time).slice(0, 5)}
        </span>
      )}
    </div>
  )
}
