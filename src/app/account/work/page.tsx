'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2, ArrowRight, Clock, Inbox, Wallet, MessageCircle,
  Building2, Crown, Check, ClipboardList, LogIn, Plus, AlertCircle, Phone, ChevronLeft,
} from 'lucide-react'
import { supabaseBrowser } from '@/lib/supabase-browser'
import BottomNav from '@/components/BottomNav'
import AttendancePulse from '@/components/AttendancePulse'
import { useMadmonaStaff } from '@/lib/useMadmonaStaff'
import { useTasksLive, pingTasksChanged } from '@/lib/useTasksLive'

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

   ☎️ (٢٢ أغسطس ٢٠٢٦) **«مكالماتي» اندمجت هنا، مش شاشة منافسة.**
      محمد: «كان في تاب شغلي بيعرض الحضور والانصراف والطلبات وحاجات تانية،
      هل اندمجت ولا اتنقلت؟»
      اندمجت. أنا يوم ٢١ عملت شاشة CRM للموظف وسمّيتها «شغلي» كمان —
      وده كان تصادم في الاسم على نفس الحاجة. الصح: **«شغلي» فضل هو ده**
      (حضور · طلبات · تاسكات · مصاريف)، والـCRM بقى **قسم جوّاه** اسمه
      «مكالماتي» بيودّي على `/crm`. مفيش حاجة اتشالت ولا اتنقلت.
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
  description?: string | null   // 📋 (٢٥/٨) التفاصيل الحية — من get_my_work_home
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
// 📍 قراءة الموقع اتنقلت لـ<AttendancePulse/> — بقت مشتركة بين كل الصفحات.

export default function MyWorkPage() {
  const [home, setHome] = useState<Home | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoMsg, setAutoMsg] = useState<string | null>(null)
  // 📥 (٢٥/٨) عدّاد إعلانات الويزارد المستنية مراجعة — محمد: «الجدول بتاع
  //    الدرافت مش مسمع في التاب الجديدة اللي في شغلي، اعمل ميرج على مستوى
  //    الأبليكيشن». الـRPC بترجع 0 لأي حد مش من فريق الإعلانات.
  const [wizCount, setWizCount] = useState<number>(0)

  const load = useCallback(async (): Promise<boolean> => {
    try {
      const { data: { session } } = await supabaseBrowser.auth.getSession()
      if (!session?.user) return false
      const { data } = await (supabaseBrowser.rpc as unknown as (
        fn: string,
      ) => Promise<{ data: Home | null }>)('get_my_work_home')
      setHome(data)
      // 📥 (٢٥/٨) عدّاد الويزارد — نداء خفيف لوحده عشان فشله ما يوقّعش الصفحة
      try {
        const { data: wc } = await (supabaseBrowser.rpc as unknown as (
          fn: string,
        ) => Promise<{ data: number | null }>)('wizard_drafts_pending_count')
        setWizCount(typeof wc === 'number' ? wc : 0)
      } catch { /* مش مشكلة — الكارت يظهر من غير عدّاد */ }
      return true
    } catch (e) {
      console.error('[account/work] load failed:', e)
      return false
    }
  }, [])

  /* 🔔 بيسمع لتاب Task في الشات (وأي تاب تاني) — مهمة اتقفلت من هناك
     بتختفي من هنا على طول، من غير ما المستخدم يعمل refresh. */
  useTasksLive(() => { load() }, true)

  // ⏱️ (٢٠ أغسطس ٢٠٢٦) الحضور والانصراف **أوتوماتيك**.
  //    محمد: «تسجيل الحضور المفروض يكون أوتوماتيك والانصراف كمان».
  //    الأبليكيشن بيبعت موقعه، والداتابيز هي اللي بتقرر:
  //      • جوّه الفرع ومش مسجّل → حضور
  //      • جوّه الفرع ومسجّل    → نبضة بس
  //      • بره الفرع ومسجّل     → انصراف
  //    ولو التطبيق اتقفل خالص، وظيفة `auto_clockout_offline_sessions`
  //    في `orchestrator_jobs` بتقفل الجلسة بعد آخر نبضة.
  //
  // 🐞 (٢٣ أغسطس ٢٠٢٦ — محمد: «بيسجل انصراف والابليكيشن مفتوح») النبضة
  //    كانت متكتوبة هنا **جوّه الصفحة دي بس**، وكانت بتقف على
  //    `document.hidden` و على فشل الـGPS. يعني أول ما الموظف يسيب
  //    الصفحة دي ويروح يشتغل، النبض يقف والنظام يقفله بعد ١٠ دقايق.
  //    اتنقلت لـ<AttendancePulse/> اللي في لاي-أوت الشات كمان عشان
  //    تفضل شغالة في كل صفحات الأبليكيشن. تفاصيل الجذر في الكومبوننت.
  const handleAutoEvent = useCallback((ev: AutoEvent) => {
    setAutoMsg(ev.action === 'clock_in'
      ? `اتسجّل حضورك أوتوماتيك في ${ev.branch} ✅`
      : `اتسجّل انصرافك أوتوماتيك من ${ev.branch} 👋`)
    setTimeout(() => setAutoMsg(null), 6000)
    load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await load()
      if (cancelled) return
      setLoading(false)
    })()
    return () => { cancelled = true }
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
      <AttendancePulse onEvent={handleAutoEvent} />
      <header className="sticky top-0 z-30 bg-white/85 backdrop-blur-xl border-b border-black/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <Link href="/account" className="w-9 h-9 bg-[#FAFAF7] rounded-full flex items-center justify-center hover:bg-gray-100">
            <ArrowRight className="w-4 h-4 text-[#6B7280]" />
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-black text-[#1A2E26] leading-none">شغلي أنا</h1>
            {/* 🧭 (٢٠ أغسطس ٢٠٢٦) محمد سأل عن الفرق بين ده وبين لوحة الإدارة.
                السطر ده بيقوله من غير ما يسأل تاني. */}
            <p className="text-[11px] text-[#6B7280] mt-1">
              حضورك وطلباتك ومصاريفك إنت — مش إدارة البيزنس
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
        {/* ☎️ مكالماتي — بيبان لموظفين مضمونة بس */}
        {home?.authenticated && <MyCallsCard />}

        {!home?.authenticated ? (
          <Empty icon={<LogIn className="w-8 h-8" />} title="سجّل دخولك الأول"
                 sub="ادخل بحسابك عشان تشوف شغلك وصلاحياتك." href="/auth/login" cta="تسجيل دخول" />
        ) : list.length === 0 ? (
          <Empty icon={<Building2 className="w-8 h-8" />} title="مالكش شغل مسجّل"
                 sub="لسه ماتضفتش كموظف ولا كصاحب بيزنس على مضمونة." />
        ) : (
          list.map(b => <BizCard key={b.supplier_id} b={b} onRefresh={load} wizCount={wizCount} />)
        )}
      </main>

      <BottomNav />
    </div>
  )
}

/* ☎️ كارت «مكالماتي» — بوابة الـCRM جوّه «شغلي».
   بيختفي تمامًا لأي حد مش من فريق مضمونة (الهوك بيرجّع staff:false،
   ومن غير جلسة أصلًا مفيش أي نداء شبكة). */
function MyCallsCard() {
  const staff = useMadmonaStaff()
  if (!staff.staff) return null
  const due = staff.due ?? 0
  const tasks = staff.tasks ?? 0
  const idle = due === 0 && tasks === 0

  return (
    <Link href="/crm" className="block no-underline">
      <div className="bg-white rounded-3xl border border-black/5 shadow-sm p-4 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-[#34D399]/12 flex items-center justify-center flex-shrink-0">
            <Phone className="w-5 h-5 text-[#059669]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-[#1A2E26] text-[15px] leading-none">مكالماتي</p>
            <p className="text-[11.5px] text-[#6B7280] mt-1.5">
              {idle
                ? 'أرقامك المتوزّعة عليك — كلّم، فرّغ، والتاسكات تتوزّع لوحدها'
                : `${due} رقم مستنّي مكالمة · ${tasks} تاسك مفتوح`}
            </p>
          </div>
          {!idle && (
            <span className="min-w-[26px] h-[26px] px-2 rounded-full bg-[#b3261e] text-white text-[12px] font-black flex items-center justify-center flex-shrink-0">
              {due + tasks}
            </span>
          )}
          <ChevronLeft className="w-4 h-4 text-[#9CA3AF] flex-shrink-0" />
        </div>
      </div>
    </Link>
  )
}

function BizCard({ b, onRefresh, wizCount = 0 }: { b: Biz; onRefresh: () => void; wizCount?: number }) {
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

      {/* 🏷️ الإعلانات — (٢٥ أغسطس ٢٠٢٦) محمد: «صلاحيات الموظفين للإعلانات
          تكون مفتوحة ويكون ليها تاب». الشاشة الواحدة لكل الإعلانات هي
          /admin/listings (منشور · درافت · موقوف · مرفوض) — الصلاحيات
          اتفتحت للفريق الصبح، وده بابها من الموبايل. لموظفي مضمونة بس. */}
      {b.is_platform_owner && b.employee_id && can('can_manage_listings') && (
        <div className="px-5 py-4 border-b border-gray-100">
          <SectionTitle icon={<Building2 className="w-3.5 h-3.5" />} title="الإعلانات" />
          <Link
            href="/admin/listings"
            className="w-full inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-3 rounded-2xl text-[13px] font-black no-underline shadow-soft"
          >
            <Building2 className="w-4 h-4" />
            كل الإعلانات — أضف · عدّل · انشر · امسح
          </Link>
          {/* 📥 (٢٥/٨) واردة الويزارد جوّه شغلي — محمد: «الجدول بتاع الدرافت
              مش مسمع في التاب الجديدة اللي في شغلي، اعمل ميرج على مستوى
              الأبليكيشن». العدّاد من wizard_drafts_pending_count والوصول
              المباشر بيفتح لوحة الويزارد جوّه شاشة الإعلانات الموحّدة. */}
          <Link
            href="/admin/listings?stage=wizard"
            className="mt-2 w-full inline-flex items-center justify-center gap-2 bg-white border-2 border-[#34D399] text-[#04352A] py-2.5 rounded-2xl text-[13px] font-black no-underline"
          >
            <Inbox className="w-4 h-4" />
            واردة الويزارد
            {wizCount > 0 && (
              <span className="min-w-[22px] h-[22px] px-1.5 inline-flex items-center justify-center rounded-full bg-amber-400 text-[#4A2E00] text-[11px] font-black">
                {wizCount}
              </span>
            )}
          </Link>
          <p className="text-[10px] text-[#6B7280] mt-2 text-center">
            شاشة واحدة لكل إعلانات المنصة — الدرافت والمنشور والموقوف وواردة الويزارد. أي إعلان جديد من الويزارد بيرنّ إشعار لكل الفريق.
          </p>
        </div>
      )}

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

      {/* 📋 مهامي — المكان الوحيد للمهام في المشروع كله.
          🎯 (٢٥ أغسطس ٢٠٢٦) محمد: «انا شايف التاسكات متكررة في اكتر من مكان
          وتاسكات مختلفة انا عايز تاسكات تكون في مكان واحد وبتاب التفاصيل
          وعايز اعادة صياغة لتاب شغلي بحيث تكون سهلة علي الموظف وعايز اتاكد
          من ان كل موظف يقدر يضيف او يعدل».
          - تاب Task في الشات بقى ريدايركت هنا — مفيش شاشتين تاني.
          - المهام متجمّعة: متأخر 🔥 الأول · بمعاد · من غير معاد.
          - «➕ ضيف مهمة» بينادي add_my_task — أي موظف يضيف لنفسه. */}
      {b.employee_id && (
        <div className="px-5 py-4">
          <SectionTitle
            icon={<ClipboardList className="w-3.5 h-3.5" />}
            title="مهامي"
            extra={b.tasks_done_today > 0 ? `${b.tasks_done_today} خلصت النهاردة` : undefined}
          />
          <MyTasks tasks={b.my_tasks || []} onRefresh={onRefresh} />
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
  const [err, setErr] = useState<string | null>(null)
  // 📋 عرض التفاصيل الحية (أرقام المكالمات · اسكريبت البوست …)
  const [showDetail, setShowDetail] = useState(false)

  /* 🐞 (٢٢ أغسطس ٢٠٢٦ — محمد: «مهامي لما بدوس عليه مش بتختفي»)
     الكود القديم كان بينادي الـRPC وبيعمل onDone() على طول من غير ما
     يبصّ لا على `error` ولا على `data.ok`. فلما الداتابيز كانت بترفض
     التحديث (كانت بتكتب status='done' وdaily_tasks مابتقبلش الكلمة دي)،
     الشاشة كانت بتعمل refresh والمهمة بتفضل مكانها — والمستخدم شايف إن
     الدوسة مش بتعمل حاجة. دلوقتي: بنقرا الخطأ وبنوريه للمستخدم. */
  const complete = async () => {
    setBusy(true); setErr(null)
    try {
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { ok?: boolean; error?: string } | null; error: { message: string } | null }>)(
        'complete_my_task', { p_task_id: t.id, p_source: t.source },
      )
      if (error) { setErr('مقدرناش نقفل المهمة — جرّب تاني'); return }
      if (data && data.ok === false) { setErr(data.error || 'مقدرناش نقفل المهمة'); return }
      pingTasksChanged()          // 🔔 قول لتاب Task في الشات
      onDone()
    } catch (e) {
      console.error('[work] complete_my_task failed:', e)
      setErr('مقدرناش نقفل المهمة — جرّب تاني')
    } finally { setBusy(false) }
  }

  return (
    <div>
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
      {t.description && (
        <button type="button" onClick={() => setShowDetail(v => !v)}
          className={`text-[10px] font-black px-2 py-1 rounded-lg flex-shrink-0 ${showDetail ? 'bg-[#34D399] text-[#04352A]' : 'bg-white border border-gray-200 text-[#059669]'}`}>
          التفاصيل
        </button>
      )}
    </div>
    {/* 📋 (٢٥ أغسطس ٢٠٢٦) محمد: «التوجيه يكون تفصيلي — لو مكالمات يبان
        الأرقام، ولو بوستات يبان الاسكريبت وفين يتنشر». التفاصيل بتتولد
        حية وقت البصمة (task_dynamic_detail) وبتتعرض هنا زي ما هي —
        whitespace-pre-line عشان القوايم والأرقام تبان سطر بسطر،
        select-text عشان الاسكريبت يتنسخ. */}
    {showDetail && t.description && (
      <div className="mt-1 mx-1 rounded-xl bg-white border border-gray-100 px-3 py-2.5 text-[11.5px] text-[#1A2E26] leading-relaxed whitespace-pre-line select-text" dir="auto">
        {t.description}
      </div>
    )}
    {err && (
      <p className="text-[11px] font-bold text-red-600 px-3 pt-1">{err}</p>
    )}
    </div>
  )
}


/* ---------------------------------------------------------------------------
   MyTasks — إعادة صياغة «مهامي» عشان تكون سهلة على الموظف.
   🎯 (٢٥ أغسطس ٢٠٢٦) محمد: «عايز اعادة صياغة لتاب شغلي بحيث تكون سهلة
   علي الموظف وعايز اتاكد من ان كل موظف يقدر يضيف او يعدل».
   المهام متقسّمة ٣ مجاميع واضحة بدل ليستة واحدة طويلة:
   متأخر 🔥 (الأهم فوق) → النهارده بمعاد (مترتبة بالساعة) → من غير معاد.
   --------------------------------------------------------------------------- */
function MyTasks({ tasks, onRefresh }: { tasks: Task[]; onRefresh: () => void }) {
  const overdue = tasks.filter(t => t.overdue)
  const timed = tasks.filter(t => !t.overdue && t.due_time)
    .sort((a, b) => String(a.due_time).localeCompare(String(b.due_time)))
  const anytime = tasks.filter(t => !t.overdue && !t.due_time)

  const groups: { label: string; cls: string; items: Task[] }[] = [
    { label: '🔥 متأخر — ابدأ بدول', cls: 'text-red-600', items: overdue },
    { label: '⏰ النهارده بمعاد', cls: 'text-[#B78A12]', items: timed },
    { label: '📌 من غير معاد', cls: 'text-[#6B7280]', items: anytime },
  ]

  return (
    <div>
      <AddTaskForm onAdded={onRefresh} />
      {tasks.length === 0 ? (
        <p className="text-[12px] text-[#6B7280]">مفيش مهام مفتوحة — تمام 👌</p>
      ) : (
        <div className="space-y-3">
          {groups.filter(g => g.items.length > 0).map(g => (
            <div key={g.label}>
              <p className={`text-[10.5px] font-black mb-1.5 ${g.cls}`}>
                {g.label} <span className="opacity-60">({g.items.length})</span>
              </p>
              <div className="space-y-1.5">
                {g.items.map(t => <TaskRow key={t.id} t={t} onDone={onRefresh} />)}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ---------------------------------------------------------------------------
   AddTaskForm — «كل موظف يقدر يضيف» — بينادي add_my_task (RPC جديدة
   ٢٥/٨) اللي بتضيف صف في daily_tasks لليوم بتاع الموظف نفسه بس.
   --------------------------------------------------------------------------- */
function AddTaskForm({ onAdded }: { onAdded: () => void }) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const submit = async () => {
    if (!title.trim()) { setErr('اكتب المهمة الأول') ; return }
    setBusy(true); setErr(null)
    try {
      const { data, error } = await (supabaseBrowser.rpc as unknown as (
        fn: string, args: Record<string, unknown>,
      ) => Promise<{ data: { ok?: boolean; error?: string } | null; error: { message: string } | null }>)(
        'add_my_task', { p_title: title.trim(), p_due_time: time || null },
      )
      if (error || (data && data.ok === false)) {
        setErr(data?.error || 'المهمة ماتضافتش — جرّب تاني'); return
      }
      setTitle(''); setTime(''); setOpen(false)
      pingTasksChanged()
      onAdded()
    } catch (e) {
      console.error('[work] add_my_task failed:', e)
      setErr('المهمة ماتضافتش — جرّب تاني')
    } finally { setBusy(false) }
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        className="w-full inline-flex items-center justify-center gap-2 bg-white border-2 border-dashed border-[#34D399]/60 text-[#059669] py-2 rounded-2xl text-[12.5px] font-black mb-3 hover:bg-[#34D399]/5">
        <Plus className="w-4 h-4" />
        ضيف مهمة
      </button>
    )
  }

  return (
    <div className="bg-[#FAFAF7] border border-gray-200 rounded-2xl p-3 mb-3 space-y-2">
      <input value={title} onChange={e => setTitle(e.target.value)} autoFocus
        placeholder="اكتب المهمة… (مثال: اتصل بمورد الزيوت)"
        className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px]" />
      <label className="block">
        <span className="text-[10px] font-bold text-[#6B7280]">معاد التسليم (اختياري)</span>
        <input type="time" value={time} onChange={e => setTime(e.target.value)}
          className="w-full mt-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-[13px]" />
      </label>
      {err && (
        <p className="text-[11.5px] text-red-600 flex items-center gap-1.5">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{err}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={submit} disabled={busy}
          className="inline-flex items-center justify-center gap-2 bg-[#34D399] text-[#04352A] py-2 rounded-xl text-[12.5px] font-bold disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          ضيفها
        </button>
        <button type="button" onClick={() => { setOpen(false); setErr(null) }} disabled={busy}
          className="bg-white border border-gray-200 text-[#6B7280] py-2 rounded-xl text-[12.5px] font-bold disabled:opacity-50">
          إلغاء
        </button>
      </div>
    </div>
  )
}
